import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene';
import { AssetLoaderService } from './asset-loader';

const LARGO = 3.0;
const ANCHO = 0.4;
const HENDIDURA = 0.17;
const DIST_COL = 1.7;   // centro bloque → centro columna

@Injectable({ providedIn: 'root' })
export class BlockBuilderService {

  private moldeBloque: THREE.Object3D | null = null;
  private alturaBloque = 1;
  private opacity = 1.0;

  // Contadores públicos
  private numBlocks = 0;
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
  ) { }

  // ─── Carga del modelo ──────────────────────────────────────────────────────

  loadBlockModel(onSuccess: () => void): void {
    this.assetLoader.loadBlockModel(
      (gltf) => {
        const modelo = gltf;
        const box = new THREE.Box3().setFromObject(modelo);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        const escalaGral = LARGO / Math.max(size.x, size.z);
        const escalaY = 0.6 / size.y;

        const contenedor = new THREE.Group();
        contenedor.name = 'muro';
        modelo.scale.set(escalaGral, escalaY, escalaGral);
        modelo.position.set(-center.x * escalaGral, -box.min.y * escalaY, -center.z * escalaGral);
        contenedor.add(modelo);

        this.moldeBloque = contenedor;
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
  buildCube(x: number, z: number, blockSize: 'full' | 'half' = 'full'): void {
    if (!this.moldeBloque) return;
    const cube = this.cloneWall(blockSize);
    cube.position.set(x, 0, z);
    // Información para guardado y crargado de modelo
    cube.userData['isModelElement'] = true;
    cube.userData['typeMaterial'] = blockSize === 'half' ? 'block-half' : 'block-full';
    cube.userData['assetPath'] = 'buildBlock';
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
    label: string,
    newBlockSize: 'full' | 'half' = 'full'
  ): THREE.Object3D | null {
    if (!this.moldeBloque) return null;

    const esGiro = label.startsWith('esquina') || label.startsWith('frontal') || label.startsWith('trasera');

    if (esGiro) {
      return this.colocarBloqueEsquina(selectedCube, offsetX, offsetZ, rotateY, label, newBlockSize);
    } else {
      return this.colocarBloqueRecto(selectedCube, offsetX, offsetZ, rotateY, label, newBlockSize);
    }
  }

  // ─── Bloque recto ──────────────────────────────────────────────────────────

  private colocarBloqueRecto(
    ref: THREE.Object3D,
    offsetX: number,
    offsetZ: number,
    rotateY: boolean,
    label: string,
    newBlockSize: 'full' | 'half'
  ): THREE.Object3D | null {
    // Dirección normalizada de este movimiento
    const dirX = Math.sign(offsetX);
    const dirZ = Math.sign(offsetZ);

    // ¿Continúa el mismo segmento o empieza uno nuevo?
    const mismaDireccion = this.segmento
      && this.segmento.dirX === dirX
      && this.segmento.dirZ === dirZ;

    const addedLength = newBlockSize === 'half' ? 0.5 : 1.0;
    const currentContador = mismaDireccion ? this.segmento!.contador : 0;
    const refForLength = mismaDireccion ? this.segmento!.origen : ref;

    const lengthOrigen = refForLength.userData['blockSize'] === 'half' ? 0.5 : 1.0;

    if (lengthOrigen + currentContador + addedLength > 6.0) {
      window.alert('No se puede crear este bloque porque el tramo recto superaría el límite de 6 bloques. Por favor, realiza un giro o inserta un medio bloque.');
      return null;
    }

    if (!mismaDireccion) {
      // Nueva dirección → nuevo segmento, el origen es el bloque actual
      this.segmento = { origen: ref, dirX, dirZ, contador: 0 };
    }

    const refSize = ref.userData['blockSize'] === 'half' ? 'half' : 'full';
    const L1 = refSize === 'half' ? 1.5 : 3.0;
    const L2 = newBlockSize === 'half' ? 1.5 : 3.0;
    const distCentroACentro = (L1 / 2) + (L2 / 2) - HENDIDURA;

    const pasoX = dirX * distCentroACentro;
    const pasoZ = dirZ * distCentroACentro;

    const newCube = this.cloneWall(newBlockSize);

    // Rotación: si el bloque viene de un bloque girado (eje X), mantiene PI/2
    newCube.rotation.y = rotateY ? Math.PI / 2 : 0;

    newCube.position.set(
      ref.position.x + pasoX,
      ref.position.y,
      ref.position.z + pasoZ
    );
    newCube.userData['isModelElement'] = true;
    newCube.userData['typeMaterial'] = newBlockSize === 'half' ? 'block-half' : 'block-full';
    newCube.userData['assetPath'] = 'buildBlock';
    this.sceneService.add(newCube);
    this.numBlocks++;
    this.segmento!.contador += addedLength;

    console.log(`Bloque recto "${label}" longitud total:${lengthOrigen + this.segmento!.contador} → X:${newCube.position.x} Z:${newCube.position.z}`);

    // Cada 6 bloques consecutivos → columna en ambos extremos
    if (lengthOrigen + this.segmento!.contador === 6.0) {
      // Extremo delantero: junto al bloque recién colocado
      this.colocarColumna(newCube, dirX, dirZ, +1);
      // Extremo trasero: junto al bloque origen del segmento
      this.colocarColumna(this.segmento!.origen, dirX, dirZ, -1);

      // El siguiente segmento parte desde el bloque recién colocado
      this.segmento = { origen: newCube, dirX, dirZ, contador: 0 };
    }

    return newCube;
  }

  // ─── Bloque de esquina / giro ──────────────────────────────────────────────

  private colocarBloqueEsquina(
    ref: THREE.Object3D,
    offsetX: number,
    offsetZ: number,
    rotateY: boolean,
    label: string,
    newBlockSize: 'full' | 'half'
  ): THREE.Object3D | null {
    const isRefRotated = Math.abs(ref.rotation.y) > 0.1;

    const refSize = ref.userData['blockSize'] === 'half' ? 'half' : 'full';
    const L1 = refSize === 'half' ? 1.5 : 3.0;
    const L2 = newBlockSize === 'half' ? 1.5 : 3.0;
    const distCol1 = L1 / 2 + 0.2;
    const distCol2 = L2 / 2 + 0.2;

    // Si el bloque REF está girado (largo en X) → columna va en extremo X
    // Si el bloque REF está recto (largo en Z) → columna va en extremo Z
    let colX: number;
    let colZ: number;

    if (isRefRotated) {
      // Bloque girado: largo en X → columna en extremo X
      colX = ref.position.x + Math.sign(offsetX) * distCol1;
      colZ = ref.position.z;
    } else {
      // Bloque recto: largo en Z → columna en extremo Z
      colX = ref.position.x;
      colZ = ref.position.z + Math.sign(offsetZ) * distCol1;
    }

    // Insertar columna (2.5 metros de altura real = 10 unidades del modelo)
    const geo = new THREE.BoxGeometry(ANCHO, 10, ANCHO);
    const mat = this.sceneService.getColumnMaterial();
    const col = new THREE.Mesh(geo, mat);
    col.name = 'columna';
    // Se ajusta la posición Y a 4.7 para que la base quede alineada con el primer bloque (-0.3)
    col.position.set(colX, 4.7, colZ);
    this.sceneService.add(col);
    this.numColumns++;
    console.log(`Columna giro en X:${colX} Z:${colZ}`);

    // Bloque nuevo se posiciona desde la columna
    let newX: number;
    let newZ: number;

    if (isRefRotated) {
      // Venía en X → bloque nuevo se aleja en Z desde la columna
      newX = colX;
      newZ = colZ + Math.sign(offsetZ) * distCol2;
    } else {
      // Venía en Z → bloque nuevo se aleja en X desde la columna
      newX = colX + Math.sign(offsetX) * distCol2;
      newZ = colZ;
    }

    this.segmento = null;

    const newCube = this.cloneWall(newBlockSize);
    newCube.rotation.y = rotateY ? Math.PI / 2 : 0;
    newCube.position.set(newX, ref.position.y, newZ);

    newCube.userData['isModelElement'] = true;
    newCube.userData['typeMaterial'] = newBlockSize === 'half' ? 'block-half' : 'block-full';
    newCube.userData['assetPath'] = 'buildBlock';
    this.sceneService.add(newCube);
    this.numBlocks++;

    console.log(`Bloque esquina "${label}" → X:${newX} Z:${newZ} rotY:${newCube.rotation.y.toFixed(2)}`);
    return newCube;
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
    const geo = new THREE.BoxGeometry(ANCHO, 10, ANCHO);
    const mat = this.sceneService.getColumnMaterial();
    const col = new THREE.Mesh(geo, mat);
    col.name = 'columna';

    const refSize = refBloque.userData['blockSize'] === 'half' ? 'half' : 'full';
    const L = refSize === 'half' ? 1.5 : 3.0;
    const distCol = L / 2 + 0.2;

    // La columna se pone al extremo del largo del bloque (distCol desde su centro)
    // en la misma dirección de avance del segmento
    col.position.set(
      refBloque.position.x + dirX * distCol * lado,
      4.7,
      refBloque.position.z + dirZ * distCol * lado
    );

    col.userData['isModelElement'] = true;
    col.userData['typeMaterial'] = 'column';
    col.userData['assetPath'] = 'column';
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

    actuales.forEach(bloque => {
      const yaExiste = actuales.some(b =>
        Math.abs(b.position.x - bloque.position.x) < 0.1 &&
        Math.abs(b.position.z - bloque.position.z) < 0.1 &&
        Math.abs(b.position.y - (bloque.position.y + this.alturaBloque + 0.2)) < 0.1
      );
      if (!yaExiste) {
        const blockSize = bloque.userData['blockSize'] === 'half' ? 'half' : 'full';
        const muro = this.cloneWall(blockSize);
        muro.position.copy(bloque.position);
        muro.rotation.copy(bloque.rotation);
        muro.position.y += this.alturaBloque + 0.2;
        nuevos.push(muro);
      }
    });

    nuevos.forEach(m => this.sceneService.add(m));
    this.numBlocks += nuevos.length;
  }

  buildGroundFloor(): number {
    const walls = this.sceneService.getWalls();
    if (walls.length < 3) {
      console.warn('Se necesitan al menos 3 muros para crear un piso cerrado.');
      return 0;
    }

    const nodes: THREE.Vector2[] = [];
    const edges = new Map<number, number[]>();

    const addNode = (x: number, z: number): number => {
      // Buscar nodo cercano (umbral de 0.5 unidades de distancia cuadrática para absorber esquinas y uniones)
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const distSq = (n.x - x) * (n.x - x) + (n.y - z) * (n.y - z);
        if (distSq < 0.3) {
          // Promediar las coordenadas para que el punto central quede perfectamente simétrico
          n.x = (n.x + x) / 2;
          n.y = (n.y + z) / 2;
          return i;
        }
      }
      nodes.push(new THREE.Vector2(x, z));
      edges.set(nodes.length - 1, []);
      return nodes.length - 1;
    };

    const addEdge = (idx1: number, idx2: number) => {
      if (idx1 !== idx2) {
        if (!edges.get(idx1)!.includes(idx2)) edges.get(idx1)!.push(idx2);
        if (!edges.get(idx2)!.includes(idx1)) edges.get(idx2)!.push(idx1);
      }
    };

    // Construcción de grafo matemático con las paredes.
    // En lugar de conectar los muros por orden de creación (lo cual genera cruces con divisiones internas),
    // se trata cada muro como una arista que conecta dos nodos.
    walls.forEach(w => {
      const isRotated = Math.abs(w.rotation.y) > 0.1;
      const refSize = w.userData['blockSize'] === 'half' ? 'half' : 'full';
      const L = refSize === 'half' ? 1.5 : 3.0;
      const dist = L / 2;

      const dx = isRotated ? dist : 0;
      const dz = isRotated ? 0 : dist;

      const p1 = addNode(w.position.x - dx, w.position.z - dz);
      const p2 = addNode(w.position.x + dx, w.position.z + dz);
      addEdge(p1, p2);
    });

    if (nodes.length < 3) return 0;

    // Para asegurar que el trazado del polígono se inicie en el exterior de la estructura,
    // se busca el nodo con la menor coordenada X.
    let startIdx = -1;
    let minX = Infinity;
    let minZ = Infinity;

    for (let i = 0; i < nodes.length; i++) {
      const v = nodes[i];
      if (v.x < minX || (Math.abs(v.x - minX) < 0.01 && v.y < minZ)) {
        minX = v.x;
        minZ = v.y; // usando 'y' de Vector2 para Z
        startIdx = i;
      }
    }

    // Algoritmo de "Wall-follower" (Regla de la mano derecha).
    // A partir del nodo más externo, se recorre el grafo obligando en cada intersección
    // a tomar el giro más a la derecha posible. Esto garantiza que el polígono resultante
    // rodee exclusivamente el contorno exterior, ignorando muros internos.
    const perimeterPoints: THREE.Vector2[] = [];
    let currIdx = startIdx;

    // Se inicia con dirección hacia +Z para que el primer giro a la derecha apunte hacia la estructura.
    let inDir = new THREE.Vector2(0, 1);
    let maxSteps = edges.size * 2; // Prevención de bucles infinitos

    do {
      perimeterPoints.push(nodes[currIdx]);
      const neighbors = edges.get(currIdx)!;
      let bestNeighbor = -1;
      let minAngle = Infinity;

      for (const n of neighbors) {
        const outDir = new THREE.Vector2().subVectors(nodes[n], nodes[currIdx]).normalize();

        // El ángulo de giro se calcula mediante producto punto y producto cruz en 2D.
        const cross = inDir.x * outDir.y - inDir.y * outDir.x;
        const dot = inDir.x * outDir.x + inDir.y * outDir.y;
        let angle = Math.atan2(cross, dot);

        // Los callejones sin salida obligan a un retorno por el mismo camino (giro de 180 grados).
        if (Math.abs(angle - Math.PI) < 0.01 || Math.abs(angle + Math.PI) < 0.01) {
          angle = Math.PI;
        }

        // Se selecciona el giro más cerrado a la derecha (ángulo menor).
        if (angle < minAngle) {
          minAngle = angle;
          bestNeighbor = n;
        }
      }

      if (bestNeighbor === -1) break;

      // El ciclo concluye al regresar al nodo de origen.
      if (bestNeighbor === startIdx && perimeterPoints.length > 1) {
        break;
      }

      inDir.subVectors(nodes[bestNeighbor], nodes[currIdx]).normalize();
      currIdx = bestNeighbor;
      maxSteps--;

    } while (maxSteps > 0);

    if (perimeterPoints.length < 3) return 0;

    // Cálculo base del área del polígono.
    let areaModel = Math.abs(THREE.ShapeUtils.area(perimeterPoints));

    // Calcular el perímetro para hacer el "inset" (descuento del grosor de la pared)
    let perimeterLen = 0;
    for (let i = 0; i < perimeterPoints.length; i++) {
      const p1 = perimeterPoints[i];
      const p2 = perimeterPoints[(i + 1) % perimeterPoints.length];
      perimeterLen += p1.distanceTo(p2);
    }

    // Ajuste matemático de área libre ("inset").
    // El trazado del polígono se adentra 0.1 unidades en el muro por razones visuales (para evitar huecos en el renderizado).
    // Para obtener el área libre neta interior, se descuenta este margen del área total utilizando una fórmula
    // geométrica para polígonos ortogonales.
    const d = 0.1;
    areaModel = areaModel - (perimeterLen * d) + (4 * d * d);

    // Conversión de unidades del motor 3D a metros cuadrados reales.
    // Los bloques representan 75 cm reales, pero miden 3.0 unidades en el modelo.
    // Factor de conversión lineal = 0.25; Factor de conversión de área = 0.0625.
    const area = areaModel * 0.0625;

    const shape = new THREE.Shape(perimeterPoints);
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0x4a90e2,
      side: THREE.DoubleSide
    });

    const floorMesh = new THREE.Mesh(geometry, material);
    floorMesh.position.y = 0.2; // Usando el valor modificado por el usuario
    floorMesh.name = 'suelo_interior';
    floorMesh.receiveShadow = true;

    const existingFloor = this.sceneService.getScene().getObjectByName('suelo_interior');
    if (existingFloor) {
      this.sceneService.remove(existingFloor);
      if (existingFloor instanceof THREE.Mesh) {
        existingFloor.geometry.dispose();
        if (existingFloor.material instanceof THREE.Material) {
          existingFloor.material.dispose();
        }
      }
    }

    floorMesh.userData['isModelElement'] = true;
    floorMesh.userData['typeMaterial'] = 'floor';
    floorMesh.userData['assetPath'] = 'floor';
    this.sceneService.add(floorMesh);

    return area;
  }

  // ─── Utilidades ────────────────────────────────────────────────────────────

  private cloneWall(blockSize: 'full' | 'half' = 'full'): THREE.Object3D {
    const clone = this.moldeBloque!.clone();
    clone.name = 'muro';
    clone.userData['blockSize'] = blockSize;

    if (blockSize === 'half') {
      clone.scale.z = 0.5;
    }

    clone.traverse(h => {
      if (h instanceof THREE.Mesh) {
        const mat = (h.material as THREE.MeshStandardMaterial).clone();
        mat.transparent = true;
        mat.opacity = this.opacity;
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

  getBlockCount(): number { return this.numBlocks; }
  getColumnCount(): number { return this.numColumns; }
  getBlockHeight(): number { return this.alturaBloque; }
  getBlockMold(): THREE.Object3D | null { return this.moldeBloque; }
  decrementBlockCount(): void { this.numBlocks--; }
}
