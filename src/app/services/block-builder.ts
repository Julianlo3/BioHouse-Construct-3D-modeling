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

        const contenedor = new THREE.Group();
        contenedor.name = 'muro';

        modeloOriginal.scale.set(escalaGral, escalaGral, escalaGral);

        // Centramos el bloque dentro del contenedor
        modeloOriginal.position.x = -center.x * escalaGral;
        modeloOriginal.position.z = -center.z * escalaGral;
        modeloOriginal.position.y = -box.min.y * escalaGral;

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

    if (rotateY) newCube.rotation.y = Math.PI / 2;

    newCube.position.set(
      selectedCube.position.x + offsetX,
      selectedCube.position.y,
      selectedCube.position.z + offsetZ
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
