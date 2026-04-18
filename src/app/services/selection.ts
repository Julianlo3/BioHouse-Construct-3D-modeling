import { Injectable, ChangeDetectorRef } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene';

@Injectable({
  providedIn: 'root',
})
export class SelectionService {
  private raycaster!: THREE.Raycaster;
  private mouse!: THREE.Vector2;
  private selectedCube: THREE.Object3D | null = null;
  private cdr!: ChangeDetectorRef;

  constructor(private sceneService: SceneService) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  /**
   * Inicializa el servicio de selección
   */
  initialize(
    cdr: ChangeDetectorRef,
    onMouseMove: (event: MouseEvent) => void,
    onClickHandler: (intersects: THREE.Intersection<THREE.Object3D>[]) => void
  ): void {
    this.cdr = cdr;
    const renderer = this.sceneService.getRenderer();
    const camera = this.sceneService.getCamera();

    // Actualizar posición del mouse
    renderer.domElement.addEventListener('mousemove', (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      onMouseMove(event);
    });

    // Manejar clicks
    renderer.domElement.addEventListener('click', (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = ((event.clientY - rect.top) / rect.height) * -2 + 1;

      this.raycaster.setFromCamera(this.mouse, camera);
      const intersects = this.raycaster.intersectObjects(
        this.sceneService.getScene().children,
        true
      );

      onClickHandler(intersects);
    });
  }

  /**
   * Selecciona un cubo (grupo raíz del muro)
   */
  selectCube(grupo: THREE.Object3D): void {
    // Remover highlight del anterior
    if (this.selectedCube) {
      this.selectedCube.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          (obj.material as THREE.MeshStandardMaterial).color.set(0xffffff);
        }
      });
    }

    this.selectedCube = grupo;

    // Aplicar highlight al nuevo seleccionado
    grupo.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // @ts-ignore
        console.log("coorndedas de cubo seleccionado X:" + (this.selectedCube.position.x as number) + " Z:" + (this.selectedCube.position.z as number) );
        const mat = (obj.material as THREE.MeshStandardMaterial).clone();
        mat.color.set(0xff0000);
        obj.material = mat;
      }
    });

    this.cdr.detectChanges();
  }

  /**
   * Deselecciona el cubo actual
   */
  deselectCube(): void {
    if (this.selectedCube) {
      this.selectedCube.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          (obj.material as THREE.MeshStandardMaterial).color.set(0xffffff);
        }
      });
      this.selectedCube = null;
      this.cdr.detectChanges();
    }
  }

  /**
   * Obtiene el cubo seleccionado
   */
  getSelectedCube(): THREE.Object3D | null {
    return this.selectedCube;
  }

  /**
   * Obtiene el grupo raíz (ancestor con name 'muro') de un objeto
   */
  getRootGroup(objeto: THREE.Object3D): THREE.Object3D {
    let current = objeto;
    while (current.parent && current.name !== 'muro') {
      current = current.parent;
    }
    return current;
  }

  /**
   * Encuentra una intersección específica por userData
   */
  findIntersectionByUserData(
    intersects: THREE.Intersection<THREE.Object3D>[],
    key: string,
    value: unknown
  ): THREE.Intersection<THREE.Object3D> | undefined {
    return intersects.find((obj) => obj.object.userData[key] === value);
  }

  /**
   * Obtiene la posición del mouse normalizada
   */
  getMousePosition(): THREE.Vector2 {
    return this.mouse.clone();
  }

  /**
   * Realiza un raycasting desde la cámara
   */
  raycast(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene
  ): THREE.Intersection<THREE.Object3D>[] {
    this.raycaster.setFromCamera(this.mouse, camera);
    return this.raycaster.intersectObjects(scene.children, true);
  }
}
