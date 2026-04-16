import { Injectable, ElementRef, ChangeDetectorRef } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AssetLoaderService } from './asset-loader';

@Injectable({
  providedIn: 'root',
})
export class SceneService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private container!: ElementRef;

  constructor(private assetLoader: AssetLoaderService) {}

  /**
   * Inicializa la escena, cámara, renderer, luces y controles
   */
  initialize(container: ElementRef, onControlsChange: () => void): void {
    this.container = container;

    // ── Renderer ──────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.container.nativeElement.appendChild(this.renderer.domElement);
    this.adjustRenderer();
    window.addEventListener('resize', () => this.adjustRenderer());

    // ── Cámara ────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.getAspectRatio(),
      0.1,
      1000
    );
    this.camera.position.z = 5;

    // ── Escena ────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    this.scene.add(ambientLight);

    // ── Controles de órbita ───────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.addEventListener('change', () => onControlsChange());

    // ── Guías ─────────────────────────────────────────────────────────────


    // ── Texturas ──────────────────────────────────────────────────────────
    this.initGrass();
  }

  /**
   * Inicializa la textura de pasto y el terreno
   */
  private initGrass(): void {
    const grassTexture = this.assetLoader.loadGrassTexture(this.renderer);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ map: grassTexture })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
  }

  /**
   * Obtiene el material de concreto con opacidad específica
   */
  getConcreteMaterial(opacity: number): THREE.MeshStandardMaterial {
    return this.assetLoader.loadConcreteTexture(opacity);
  }

  /**
   * Ajusta el tamaño del renderer según el contenedor
   */
  private adjustRenderer(): void {
    if (!this.container) return;
    const el: HTMLElement = this.container.nativeElement;
    const w = el.clientWidth || 1200;
    const h = el.clientHeight || 700;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Obtiene el aspect ratio del contenedor
   */
  private getAspectRatio(): number {
    if (!this.container) return 16 / 9;
    const el: HTMLElement = this.container.nativeElement;
    return (el.clientWidth || 1200) / (el.clientHeight || 700);
  }

  /**
   * Actualiza la opacidad de todos los muros
   */
  updateWallsOpacity(opacity: number): void {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData['isMuro'] === true) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = opacity;
        mat.needsUpdate = true;
      }
    });
  }

  /**
   * Agrega un objeto a la escena
   */
  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * Remueve un objeto de la escena
   */
  remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * Obtiene todos los muros de la escena
   */
  getWalls(): THREE.Object3D[] {
    return this.scene.children.filter((obj) => obj.name === 'muro');
  }

  /**
   * Obtiene la escena THREE.js
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Obtiene la cámara
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Obtiene el renderer
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Obtiene los controles de órbita
   */
  getControls(): OrbitControls {
    return this.controls;
  }

  /**
   * Renderiza la escena
   */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Limpia recursos
   */
  dispose(): void {
    this.controls?.dispose();
    this.renderer?.dispose();

    this.scene?.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });

    window.removeEventListener('resize', () => this.adjustRenderer());
  }
}
