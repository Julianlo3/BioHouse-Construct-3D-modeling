import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene';
import { AssetLoaderService } from './asset-loader';

@Injectable({
  providedIn: 'root',
})
export class BlockBuilderService {
  private moldeBloque: THREE.Object3D | null = null;
  private alturaBloque: number = 1;
  private numBlocks: number = 0;
  private opacity: number = 1.0;
  private numColumns: number = 0;

  constructor(
    private sceneService: SceneService,
    private assetLoader: AssetLoaderService
  ) {}

  /**
   * Carga el modelo GLB del bloque base
   */
  loadBlockModel(onSuccess: () => void): void {
    this.assetLoader.loadBlockModel(
      (gltf) => {
        // 1. EL CAMBIO AQUÍ: No uses this.sceneService.getScene()
        // Usamos gltf.scene (que es solo el bloque del archivo .glb)
        const modeloOriginal = gltf

        // 2. Medición inicial (esto ahora solo medirá el bloque, no el suelo)
        const box = new THREE.Box3().setFromObject(modeloOriginal);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        // ... resto del código igual ...
        const largoObjetivo = 3;
        const maxDim = Math.max(size.x, size.z);
        const escalaGral = largoObjetivo / maxDim;
        const escalaY = 0.6 / size.y;

        const contenedor = new THREE.Group();
        contenedor.name = 'muro';

        modeloOriginal.scale.set(escalaGral, escalaY, escalaGral);

        // Centramos el bloque dentro del contenedor
        modeloOriginal.position.x = -center.x * escalaGral;
        modeloOriginal.position.z = -center.z * escalaGral;
        modeloOriginal.position.y = -box.min.y * escalaY;

        contenedor.add(modeloOriginal);

        this.moldeBloque = contenedor;
        this.alturaBloque = (box.max.y - box.min.y) * escalaGral;

        const materialConcreto = this.sceneService.getConcreteMaterial(this.opacity);

        // 3. Ahora el traverse solo afectará a las piezas del bloque
        this.moldeBloque.traverse((hijo) => {
          if (hijo instanceof THREE.Mesh) {
            hijo.material = materialConcreto;
            hijo.castShadow = true;
            hijo.receiveShadow = true;
            hijo.userData['isMuro'] = true;
          }
        });

        console.log('Modelo GLB normalizado y separado de la escena global.');
        onSuccess();
      },
      (error: any) => console.error('Error crítico al cargar el modelo:', error)
    );
  }

  /**
   * Clona el molde del bloque (muro) con la configuración estándar
   */
  private cloneWall(): THREE.Object3D {
    const clone = this.moldeBloque!.clone();
    clone.name = 'muro';

    clone.traverse((hijo) => {
      if (hijo instanceof THREE.Mesh) {
        const mat = (hijo.material as THREE.MeshStandardMaterial).clone();
        mat.transparent = true;
        mat.opacity = this.opacity;
        mat.needsUpdate = true;
        hijo.material = mat;
        hijo.castShadow = true;
        hijo.receiveShadow = true;
        hijo.userData['isMuro'] = true;
      }
    });

    return clone;
  }

  /**
   * Construye un bloque en coordenadas específicas
   */
  buildCube(x: number, z: number): void {
    if (!this.moldeBloque) return;

    const cube = this.cloneWall();
    cube.position.set(x, 0, z);
    this.sceneService.add(cube);
    this.numBlocks++;
  }

  /**
   * Crea un bloque basado en la selección actual con offsets
   */
  createBlockFromSelection(
    selectedCube: THREE.Object3D,
    offsetX: number,
    offsetZ: number,
    rotateY: boolean
  ): void {
    if (!this.moldeBloque) return;

    const newCube = this.cloneWall();

    // 1. Calculamos el desplazamiento corregido para el encaje
    let finalOffsetZ = offsetZ;
    let finalOffsetX = offsetX;

    // Ajuste para el eje Z (hendidura de 0.17m)
    if (Math.abs(offsetZ) > 0) {
      const signoZ = offsetZ > 0 ? 1 : -1;
      finalOffsetZ = (Math.abs(offsetZ) - 0.17) * signoZ;
    }

    // Nota: Si el bloque también tiene hendidura en el eje X,
    // deberías aplicar una lógica similar a finalOffsetX.

    if (rotateY) {
      newCube.rotation.y = Math.PI / 2;

      if (Math.abs(offsetX) > 0) {
        const signoX = offsetX > 0 ? 1 : -1;
        finalOffsetX = (Math.abs(offsetX) - 0.17) * signoX;
      }
    }

    // 2. EL CAMBIO CLAVE: Usar finalOffsetZ en lugar de offsetZ
    newCube.position.set(
      selectedCube.position.x + finalOffsetX, // Usamos la variable local
      selectedCube.position.y,
      selectedCube.position.z + finalOffsetZ  // <--- Aquí aplicamos el encaje
    );

    this.sceneService.add(newCube);
    this.numBlocks++;

  }

  /**
   * Construye un número de pisos hacia arriba
   */
  buildFloors(niveles: number): void {
    for (let i = 0; i < niveles; i++) {
      this.buildFloor();
    }
  }

  /**
   * Construye un piso completo encima de los bloques existentes
   */
  private buildFloor(): void {
    if (!this.moldeBloque) return;

    const bloquesActuales = this.sceneService.getWalls();
    const nuevosMuros: THREE.Object3D[] = [];

    bloquesActuales.forEach((bloque) => {
      const existeArriba = bloquesActuales.some(
        (b) =>
          Math.abs(b.position.x - bloque.position.x) < 0.1 &&
          Math.abs(b.position.z - bloque.position.z) < 0.1 &&
          Math.abs(b.position.y - (bloque.position.y + this.alturaBloque)) < 0.1
      );

      if (!existeArriba) {
        const nuevoMuro = this.cloneWall();
        nuevoMuro.position.copy(bloque.position);
        nuevoMuro.rotation.copy(bloque.rotation);
        nuevoMuro.position.y += this.alturaBloque;
        nuevosMuros.push(nuevoMuro);
      }
    });

    nuevosMuros.forEach((muro) => this.sceneService.add(muro));
    this.numBlocks += nuevosMuros.length;
  }

  /**
   * Actualiza la opacidad de los bloques nuevos
   */
  setOpacity(opacity: number): void {
    this.opacity = opacity;
    this.sceneService.updateWallsOpacity(opacity);
  }

  /**
   * Obtiene el número total de bloques
   */
  getBlockCount(): number {
    return this.numBlocks;
  }

  getColumnCount(): number {
    return this.numColumns;
  }

  /**
   * Decrementa el contador de bloques
   */
  decrementBlockCount(): void {
    this.numBlocks--;
  }

  /**
   * Obtiene la altura real del bloque
   */
  getBlockHeight(): number {
    return this.alturaBloque;
  }

  /**
   * Obtiene el molde del bloque
   */
  getBlockMold(): THREE.Object3D | null {
    return this.moldeBloque;
  }
}
