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

    const pos       = selectedCube.position;
    const isRotated = Math.abs(selectedCube.rotation.y) > 0.1;

    const L = 3.0;   // Largo total
    const W = 0.4;   // Ancho total
    const halfL = L / 2; // 1.5
    const halfW = W / 2; // 0.2

    // Offsets calculados para que las caras se toquen perfectamente
    const offEsquinaX = halfL + halfW; // 1.7
    const offEsquinaZ = halfL - halfW; // 1.3

    // separacion botones
    const separacionX = 0.5;
    const separacionZ = 0.5;

    let buttonConfigs: any[] = [];

    if (!isRotated) {
      // ── Bloque orientado en Z (Recto) ──
      buttonConfigs = [
        // Continuar recto (Z)
        { offsetX: 0, offsetZ: L, rotateY: false, btnPos: new THREE.Vector3(pos.x, pos.y, pos.z + halfL + separacionZ) },
        { offsetX: 0, offsetZ: -L, rotateY: false, btnPos: new THREE.Vector3(pos.x, pos.y, pos.z - halfL - separacionZ) },

        // Esquinas Derechas (X+)
        { offsetX: offEsquinaX, offsetZ: offEsquinaZ, rotateY: true, btnPos: new THREE.Vector3(pos.x + halfW + separacionX, pos.y, pos.z + halfL) },
        { offsetX: offEsquinaX, offsetZ: -offEsquinaZ, rotateY: true, btnPos: new THREE.Vector3(pos.x + halfW + separacionX, pos.y, pos.z - halfL) },

        // Esquinas Izquierdas (X-)
        { offsetX: -offEsquinaX, offsetZ: offEsquinaZ, rotateY: true, btnPos: new THREE.Vector3(pos.x - halfW - separacionX, pos.y, pos.z + halfL) },
        { offsetX: -offEsquinaX, offsetZ: -offEsquinaZ, rotateY: true, btnPos: new THREE.Vector3(pos.x - halfW - separacionX, pos.y, pos.z - halfL) },
      ];
    } else {
      // ── Bloque orientado en X (Rotado) ──
      buttonConfigs = [
        // Continuar recto (X)
        { offsetX: L, offsetZ: 0, rotateY: true, btnPos: new THREE.Vector3(pos.x + halfL + separacionX, pos.y, pos.z) },
        { offsetX: -L, offsetZ: 0, rotateY: true, btnPos: new THREE.Vector3(pos.x - halfL - separacionZ, pos.y, pos.z) },

        // Esquinas Frontales (Z+)
        { offsetX: offEsquinaZ, offsetZ: offEsquinaX, rotateY: false, btnPos: new THREE.Vector3(pos.x + halfL, pos.y, pos.z + halfW + separacionZ) },
        { offsetX: -offEsquinaZ, offsetZ: offEsquinaX, rotateY: false, btnPos: new THREE.Vector3(pos.x - halfL, pos.y, pos.z + halfW + separacionZ) },

        // Esquinas Traseras (Z-)
        { offsetX: offEsquinaZ, offsetZ: -offEsquinaX, rotateY: false, btnPos: new THREE.Vector3(pos.x + halfL, pos.y, pos.z - halfW - separacionZ) },
        { offsetX: -offEsquinaZ, offsetZ: -offEsquinaX, rotateY: false, btnPos: new THREE.Vector3(pos.x - halfL, pos.y, pos.z - halfW - separacionZ) },
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
