import { Injectable, ChangeDetectorRef } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene';
import { CubeSelectionService } from './cube-selection.service';

export interface ButtonConfig {
  screenX: number;
  screenY: number;
  offsetX: number;
  offsetZ: number;
  rotateY: boolean;
  visible: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class OverlayService {
  activeButtons: ButtonConfig[] = [];
  private cdr!: ChangeDetectorRef;

  constructor(
    private sceneService: SceneService,
    private cubeSelectionService: CubeSelectionService
  ) {}

  /**
   * Inicializa el servicio de overlay
   */
  initialize(cdr: ChangeDetectorRef): void {
    this.cdr = cdr;
  }

  /**
   * Actualiza la posición de los botones flotantes
   */
  updateButtonPosition(selectedCube: THREE.Object3D | null): void {
    // Si decoration está activo, no mostrar botones
    if (this.cubeSelectionService.isDecorationActive()) {
      this.activeButtons = [];
      this.cdr.detectChanges();
      return;
    }

    if (!selectedCube) {
      this.activeButtons = [];
      this.cdr.detectChanges();
      return;
    }

    const pos = selectedCube.position;
    const isRotated = Math.abs(selectedCube.rotation.y) > 0.1;

    const halfX = 0.2;
    const halfZ = 1.5;

    const esquinaLateral = 2.32;
    const esquinaFrontal = 1.96;
    const posButtonTop = 0.65;

    let buttonConfigs: Array<{
      offsetX: number;
      offsetZ: number;
      rotateY: boolean;
      btnPos: THREE.Vector3;
    }>;

    if (!isRotated) {
      buttonConfigs = [
        {
          offsetX: 0,
          offsetZ: 3.0,
          rotateY: false,
          btnPos: new THREE.Vector3(pos.x + posButtonTop, pos.y, pos.z + halfZ),
        },
        {
          offsetX: 0,
          offsetZ: -3.0,
          rotateY: false,
          btnPos: new THREE.Vector3(
            pos.x + posButtonTop,
            pos.y,
            pos.z - halfZ - 1
          ),
        },
        {
          offsetX: esquinaLateral,
          offsetZ: 1.96,
          rotateY: true,
          btnPos: new THREE.Vector3(pos.x + 1.5, pos.y, pos.z + 1),
        },
        {
          offsetX: esquinaLateral,
          offsetZ: -1.44,
          rotateY: true,
          btnPos: new THREE.Vector3(pos.x + 1.5, pos.y, pos.z - 1.8),
        },
        {
          offsetX: -0.28,
          offsetZ: esquinaFrontal,
          rotateY: true,
          btnPos: new THREE.Vector3(pos.x, pos.y, pos.z + 1),
        },
        {
          offsetX: -0.28,
          offsetZ: -1.44,
          rotateY: true,
          btnPos: new THREE.Vector3(pos.x, pos.y, pos.z - 1.8),
        },
      ];
    } else {
      buttonConfigs = [
        {
          offsetX: 3.0,
          offsetZ: 0,
          rotateY: true,
          btnPos: new THREE.Vector3(pos.x + halfZ, pos.y, pos.z - 1),
        },
        {
          offsetX: -3.0,
          offsetZ: 0,
          rotateY: true,
          btnPos: new THREE.Vector3(pos.x - halfZ - 1, pos.y, pos.z - 1),
        },
        {
          offsetX: 0.28,
          offsetZ: 1.44,
          rotateY: false,
          btnPos: new THREE.Vector3(pos.x + 1, pos.y, pos.z),
        },
        {
          offsetX: -2.32,
          offsetZ: 1.44,
          rotateY: false,
          btnPos: new THREE.Vector3(pos.x - 1.8, pos.y, pos.z),
        },
        {
          offsetX: 0.28,
          offsetZ: -1.96,
          rotateY: false,
          btnPos: new THREE.Vector3(pos.x + 1, pos.y, pos.z - 1.8),
        },
        {
          offsetX: -2.32,
          offsetZ: -1.96,
          rotateY: false,
          btnPos: new THREE.Vector3(pos.x - 2, pos.y, pos.z - 2),
        },
      ];
    }

    const renderer = this.sceneService.getRenderer();
    const camera = this.sceneService.getCamera();
    const width = renderer.domElement.clientWidth;
    const height = renderer.domElement.clientHeight;

    this.activeButtons = buttonConfigs.map((config) => {
      const vector = config.btnPos.clone();
      vector.project(camera);
      return {
        screenX: (vector.x * 0.5 + 0.5) * width,
        screenY: (vector.y * -0.5 + 0.5) * height,
        offsetX: config.offsetX,
        offsetZ: config.offsetZ,
        rotateY: config.rotateY,
        visible: vector.z < 1,
      };
    });

    this.cdr.detectChanges();
  }

  /**
   * Obtiene los botones activos
   */
  getActiveButtons(): ButtonConfig[] {
    return this.activeButtons;
  }

  /**
   * Limpia los botones
   */
  clearButtons(): void {
    this.activeButtons = [];
    this.cdr.detectChanges();
  }
}
