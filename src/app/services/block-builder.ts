import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene';
import { AssetLoaderService } from './asset-loader';

const LARGO     = 3.0;
const ANCHO     = 0.4;
const HENDIDURA = 0.17;
const DIST_COL  = 1.7;   // centro bloque → centro columna

@Injectable({ providedIn: 'root' })
export class BlockBuilderService {

  private moldeBloque: THREE.Object3D | null = null;
  private alturaBloque = 1;
  private opacity = 1.0;

  // Contadores públicos
  private numBlocks  = 0;
  private numColumns = 0;

  // Seguimiento del segmento recto activo
  // Un segmento es una serie de bloques en la misma dirección sin giros
  private segmento: {
    origen: THREE.Object3D;   // primer bloque desde donde se partió
    dirX: number;             // dirección normalizada (-1, 0, +1)
    dirZ: number;
    contador: number;         // cuántos bloques se han puesto en este segmento
  } | null = null;

  constructor(
    private sceneService: SceneService,
    private assetLoader: AssetLoaderService
  ) {}

  // ─── Carga del modelo ──────────────────────────────────────────────────────

  loadBlockModel(onSuccess: () => void): void {
    this.assetLoader.loadBlockModel(
      (gltf) => {
        const modelo = gltf;
        const box    = new THREE.Box3().setFromObject(modelo);
        const size   = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const escalaGral = LARGO / Math.max(size.x, size.z);
        const escalaY    = 0.6 / size.y;

        const contenedor = new THREE.Group();
        contenedor.name  = 'muro';
        modelo.scale.set(escalaGral, escalaY, escalaGral);
        modelo.position.set(-center.x * escalaGral, -box.min.y * escalaY, -center.z * escalaGral);
        contenedor.add(modelo);

        this.moldeBloque  = contenedor;
        this.alturaBloque = (box.max.y - box.min.y) * escalaGral;

        const mat = this.sceneService.getConcreteMaterial(this.opacity);
        this.moldeBloque.traverse(h => {
          if (h instanceof THREE.Mesh) {
            h.material = mat;
            h.castShadow = h.receiveShadow = true;
            h.userData['isMuro'] = true;
          }
        });

        onSuccess();
      },
      (err: any) => console.error('Error al cargar modelo:', err)
    );
  }

  // ─── API pública ───────────────────────────────────────────────────────────

  /** Primer bloque — colocado en coordenadas absolutas */
  buildCube(x: number, z: number): void {
    if (!this.moldeBloque) return;
    const cube = this.cloneWall();
    cube.position.set(x, 0, z);
    this.sceneService.add(cube);
    this.numBlocks++;
  }

  getSecuenceBlocks(): number {
    return this.segmento?.contador ?? 0;
  }

  /**
   * Construye el siguiente bloque a partir del seleccionado.
   *
   * Los offsets llegan desde OverlayService ya calculados:
   *
   *  label                | offsetX | offsetZ | rotateY
   *  ---------------------|---------|---------|--------
   *  adelante / atras     |    0    |   ±3    |  false
   *  derecha / izquierda  |   ±3    |    0    |  true
   *  esquina-*            |  ±1.7   |  ±1.3   |  true
   *  frontal-* / trasera-*|  ±1.3   |  ±1.7   |  false
   */
  createBlockFromSelection(
    selectedCube: THREE.Object3D,
    offsetX: number,
    offsetZ: number,
    rotateY: boolean,
    label: string
  ): void {
    if (!this.moldeBloque) return;

    const esGiro = label.startsWith('esquina') || label.startsWith('frontal') || label.startsWith('trasera');

    if (esGiro) {
      this.colocarBloqueEsquina(selectedCube, offsetX, offsetZ, rotateY, label);
    } else {
      this.colocarBloqueRecto(selectedCube, offsetX, offsetZ, rotateY, label);
    }
  }

  // ─── Bloque recto ──────────────────────────────────────────────────────────

  private colocarBloqueRecto(
    ref: THREE.Object3D,
    offsetX: number,
    offsetZ: number,
    rotateY: boolean,
    label: string
  ): void {
    // Dirección normalizada de este movimiento
    const dirX = Math.sign(offsetX);
    const dirZ = Math.sign(offsetZ);

    // ¿Continúa el mismo segmento o empieza uno nuevo?
    const mismaDireccion = this.segmento
      && this.segmento.dirX === dirX
      && this.segmento.dirZ === dirZ;

    if (!mismaDireccion) {
      // Nueva dirección → nuevo segmento, el origen es el bloque actual
      this.segmento = { origen: ref, dirX, dirZ, contador: 0 };
    }

    // Paso efectivo entre centros: largo − hendidura
    // Los offsets del overlay llegan como ±3 (largo completo),
    // reducimos la hendidura para el efecto de encaje visual
    const pasoX = dirX * (Math.abs(offsetX) - HENDIDURA);
    const pasoZ = dirZ * (Math.abs(offsetZ) - HENDIDURA);

    const newCube = this.cloneWall();

    // Rotación: si el bloque viene de un bloque girado (eje X), mantiene PI/2
    newCube.rotation.y = rotateY ? Math.PI / 2 : 0;

    newCube.position.set(
      ref.position.x + pasoX,
      ref.position.y,
      ref.position.z + pasoZ
    );

    this.sceneService.add(newCube);
    this.numBlocks++;
    this.segmento!.contador++;

    console.log(`Bloque recto "${label}" #${this.segmento!.contador} → X:${newCube.position.x} Z:${newCube.position.z}`);

    // Cada 6 bloques consecutivos → columna en ambos extremos
    if (this.segmento!.contador === 5) {
      // Extremo delantero: junto al bloque recién colocado
      this.colocarColumna(newCube, dirX, dirZ, +1);
      // Extremo trasero: junto al bloque origen del segmento
      this.colocarColumna(this.segmento!.origen, dirX, dirZ, -1);

      // El siguiente segmento parte desde el bloque recién colocado
      this.segmento = { origen: newCube, dirX, dirZ, contador: 0 };
    }
  }

  // ─── Bloque de esquina / giro ──────────────────────────────────────────────

  private colocarBloqueEsquina(
    ref: THREE.Object3D,
    offsetX: number,
    offsetZ: number,
    rotateY: boolean,
    label: string
  ): void {
    const isRefRotated = Math.abs(ref.rotation.y) > 0.1;

    // Si el bloque REF está girado (largo en X) → columna va en extremo X
    // Si el bloque REF está recto (largo en Z) → columna va en extremo Z
    let colX: number;
    let colZ: number;

    if (isRefRotated) {
      // Bloque girado: largo en X → columna en extremo X
      colX = ref.position.x + Math.sign(offsetX) * DIST_COL;
      colZ = ref.position.z;
    } else {
      // Bloque recto: largo en Z → columna en extremo Z
      colX = ref.position.x;
      colZ = ref.position.z + Math.sign(offsetZ) * DIST_COL;
    }

    // Insertar columna
    const geo = new THREE.BoxGeometry(ANCHO, 3, ANCHO);
    const mat = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const col = new THREE.Mesh(geo, mat);
    col.position.set(colX, 0, colZ);
    this.sceneService.add(col);
    this.numColumns++;
    console.log(`Columna giro en X:${colX} Z:${colZ}`);

    // Bloque nuevo se posiciona desde la columna
    let newX: number;
    let newZ: number;

    if (isRefRotated) {
      // Venía en X → bloque nuevo se aleja en Z desde la columna
      newX = colX;
      newZ = colZ + Math.sign(offsetZ) * DIST_COL;
    } else {
      // Venía en Z → bloque nuevo se aleja en X desde la columna
      newX = colX + Math.sign(offsetX) * DIST_COL;
      newZ = colZ;
    }

    this.segmento = null;

    const newCube = this.cloneWall();
    newCube.rotation.y = rotateY ? Math.PI / 2 : 0;
    newCube.position.set(newX, ref.position.y, newZ);

    this.sceneService.add(newCube);
    this.numBlocks++;

    console.log(`Bloque esquina "${label}" → X:${newX} Z:${newZ} rotY:${newCube.rotation.y.toFixed(2)}`);
  }

  // ─── Columnas ──────────────────────────────────────────────────────────────

  /**
   * Coloca una columna en el borde del bloque de referencia.
   *
   * La columna va perpendicular a la dirección de avance, al extremo del largo.
   *
   *  Avance en Z → columna desplazada ±DIST_COL en Z (al final del largo)
   *  Avance en X → columna desplazada ±DIST_COL en X (al final del largo)
   *
   * @param lado  +1 = extremo de avance (delantero), -1 = extremo de origen (trasero)
   */
  private colocarColumna(
    refBloque: THREE.Object3D,
    dirX: number,
    dirZ: number,
    lado: number
  ): void {
    const geo = new THREE.BoxGeometry(ANCHO, 3, ANCHO);
    const mat = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const col = new THREE.Mesh(geo, mat);

    // La columna se pone al extremo del largo del bloque (DIST_COL desde su centro)
    // en la misma dirección de avance del segmento
    col.position.set(
      refBloque.position.x + dirX * DIST_COL * lado,
      0,
      refBloque.position.z + dirZ * DIST_COL * lado
    );

    this.sceneService.add(col);
    this.numColumns++;

    console.log(`Columna en X:${col.position.x} Z:${col.position.z}`);
  }

  // ─── Pisos ─────────────────────────────────────────────────────────────────

  buildFloors(niveles: number): void {
    for (let i = 0; i < niveles; i++) this.buildFloor();
  }

  private buildFloor(): void {
    if (!this.moldeBloque) return;
    const actuales = this.sceneService.getWalls();
    const nuevos: THREE.Object3D[] = [];

    const separacionBloques:number = 0.08

    actuales.forEach(bloque => {
      const yaExiste = actuales.some(b =>
        Math.abs(b.position.x - bloque.position.x) < 0.1 &&
        Math.abs(b.position.z - bloque.position.z) < 0.1 &&
        Math.abs(b.position.y - (bloque.position.y + this.alturaBloque + separacionBloques)) < 0.1
      );
      if (!yaExiste) {
        const muro = this.cloneWall();
        muro.position.copy(bloque.position);
        muro.rotation.copy(bloque.rotation);
        muro.position.y += this.alturaBloque + separacionBloques;
        nuevos.push(muro);
      }
    });

    nuevos.forEach(m => this.sceneService.add(m));
    this.numBlocks += nuevos.length;
  }

  // ─── Utilidades ────────────────────────────────────────────────────────────

  private cloneWall(): THREE.Object3D {
    const clone = this.moldeBloque!.clone();
    clone.name  = 'muro';
    clone.traverse(h => {
      if (h instanceof THREE.Mesh) {
        const mat = (h.material as THREE.MeshStandardMaterial).clone();
        mat.transparent = true;
        mat.opacity     = this.opacity;
        mat.needsUpdate = true;
        h.material = mat;
        h.castShadow = h.receiveShadow = true;
        h.userData['isMuro'] = true;
      }
    });
    return clone;
  }

  setOpacity(v: number): void {
    this.opacity = v;
    this.sceneService.updateWallsOpacity(v);
  }

  getBlockCount():       number { return this.numBlocks; }
  getColumnCount():      number { return this.numColumns; }
  getBlockHeight():      number { return this.alturaBloque; }
  getBlockMold():        THREE.Object3D | null { return this.moldeBloque; }
  decrementBlockCount(): void   { this.numBlocks--; }
}
