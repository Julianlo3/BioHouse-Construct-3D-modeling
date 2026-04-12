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
        this.moldeBloque = gltf;
        this.moldeBloque.scale.set(40, 40, 40);
        this.moldeBloque.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(this.moldeBloque);
        const size = new THREE.Vector3();
        box.getSize(size);

        console.log('Tamaño X:', size.x, '| Y:', size.y, '| Z:', size.z);
        console.log('Centro X:', box.getCenter(new THREE.Vector3()).x, '| Y:', box.getCenter(new THREE.Vector3()).y, '| Z:', box.getCenter(new THREE.Vector3()).z);

        this.alturaBloque = box.max.y - box.min.y;
        console.log(`Altura real del bloque: ${this.alturaBloque}`);

        const materialConcreto = this.sceneService.getConcreteMaterial(this.opacity);

        this.moldeBloque.traverse((hijo) => {
          if (hijo instanceof THREE.Mesh) {
            hijo.material = materialConcreto;
            hijo.castShadow = true;
            hijo.receiveShadow = true;
            hijo.userData['isMuro'] = true;
          }
        });

        this.moldeBloque.name = 'muro';

        console.log('Modelo GLB cargado y listo.');
        onSuccess();
      },
      (error) => console.error('Error al cargar el modelo:', error)
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
