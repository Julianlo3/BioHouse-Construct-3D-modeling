import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TEXTURE_MAP } from '../constants/textures/textures.constant';
import { MODEL_MAP } from '../constants/models/models.constant';

// Constantes de rutas de modelos
const MODEL_PATHS = {
  door: '/assets/models/PuertaMadera.glb',
  window: '/assets/models/Ventana.glb',
} as const;

@Injectable({
  providedIn: 'root',
})
export class AssetLoaderService {
  private textureLoader: THREE.TextureLoader;
  private gltfLoader: GLTFLoader;

  public textures = TEXTURE_MAP;
  public models = MODEL_MAP;

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.gltfLoader = new GLTFLoader();
  }

  /**
   * Carga una textura desde una ruta
   */
  loadTexture(path: string): THREE.Texture {
    const texture = this.textureLoader.load(path);
    return texture;
  }

  /**
   * Carga y configura la textura de pasto
   */
  loadGrassTexture(renderer: THREE.WebGLRenderer): THREE.Texture {
    const grassTexture = this.loadTexture(this.textures.grass.default);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(20, 20);
    grassTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    grassTexture.colorSpace = THREE.SRGBColorSpace;

    return grassTexture;
  }

  /**
   * Carga y configura la textura de concreto
   */
  loadConcreteTexture(opacity: number): THREE.MeshStandardMaterial {
    const concreteTexture = this.loadTexture(this.textures.concrete.default);
    concreteTexture.wrapS = THREE.RepeatWrapping;
    concreteTexture.wrapT = THREE.RepeatWrapping;
    concreteTexture.repeat.set(1, 1);

    return new THREE.MeshStandardMaterial({
      map: concreteTexture,
      transparent: true,
      opacity: opacity,
    });
  }

  /**
   * Carga el modelo GLB del bloque base
   */
  loadBlockModel(
    onSuccess: (gltf: THREE.Group) => void,
    onError: (error: unknown) => void
  ): void {
    this.gltfLoader.load(
      this.models.block,
      (gltf) => {
        onSuccess(gltf.scene);
      },
      undefined,
      (error) => onError(error)
    );
  }

  /**
   * Carga un modelo de decoración (puerta o ventana)
   */
  loadDecorationModel(
    decorationType: 'door' | 'window',
    onSuccess: (gltf: THREE.Group) => void,
    onError: (error: unknown) => void
  ): void {
    const modelPath = MODEL_PATHS[decorationType];

    this.gltfLoader.load(modelPath, (gltf) => {
      onSuccess(gltf.scene);
    }, undefined, (error) => onError(error));
  }

  /**
   * Obtiene la ruta de un modelo de decoración
   */
  getDecorationPath(decorationType: string): string {
    return MODEL_PATHS[decorationType as keyof typeof MODEL_PATHS];
  }
}
