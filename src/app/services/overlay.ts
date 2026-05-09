import { Injectable, ChangeDetectorRef } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene';
import { CubeSelectionService } from './cube-selection.service';

export interface ButtonConfig {
  label: string;
  obj: string;
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

    // 1. Validaciones iniciales: Si no hay cubo o está en modo decoración, limpiamos botones
    if (this.cubeSelectionService.isDecorationActive() || !selectedCube) {
      this.activeButtons = [];
      this.cdr.detectChanges();
      return;
    }

    // 2. Parámetros geométricos del sistema BioHouse
    const pos       = selectedCube.position;
    const isRotated = Math.abs(selectedCube.rotation.y) > 0.1;

    const blockSize = selectedCube.userData['blockSize'] === 'half' ? 'half' : 'full';
    const L = blockSize === 'half' ? 1.5 : 3.0;        // Largo del bloque seleccionado
    const W = 0.4;        // Ancho del bloque
    const halfL = L / 2;  // 1.5m o 0.75m
    const halfW = W / 2;  // 0.2m

    // Offsets para encaje perfecto de caras
    const offEsquinaX = halfL + halfW;
    const offEsquinaZ = halfL - halfW;

    // Separación visual de los botones respecto al modelo
    const sepX = 0.5;
    const sepZ = 0.5;

    let buttonConfigs: any[] = [];

    // 3. Definición de configuraciones según orientación
    if (!isRotated) {
      // --- Bloque en eje Z (Recto) ---
      buttonConfigs = [
        { label: 'adelante', obj: "none", offsetX: 0, offsetZ: L, rotateY: false, btnPos: new THREE.Vector3(pos.x, pos.y, pos.z + halfL + sepZ) },
        { label: 'atras',    obj: "none", offsetX: 0, offsetZ: -L, rotateY: false, btnPos: new THREE.Vector3(pos.x, pos.y, pos.z - halfL - sepZ) },

        { label: 'esquina-der-frontal', obj: "none", offsetX: offEsquinaX,  offsetZ: offEsquinaZ,  rotateY: true, btnPos: new THREE.Vector3(pos.x + halfW + sepX, pos.y, pos.z + halfL) },
        { label: 'esquina-der-trasera', obj: "none", offsetX: offEsquinaX,  offsetZ: -offEsquinaZ, rotateY: true, btnPos: new THREE.Vector3(pos.x + halfW + sepX, pos.y, pos.z - halfL) },

        { label: 'esquina-izq-frontal', obj: "none", offsetX: -offEsquinaX, offsetZ: offEsquinaZ,  rotateY: true, btnPos: new THREE.Vector3(pos.x - halfW - sepX, pos.y, pos.z + halfL) },
        { label: 'esquina-izq-trasera', obj: "none", offsetX: -offEsquinaX, offsetZ: -offEsquinaZ, rotateY: true, btnPos: new THREE.Vector3(pos.x - halfW - sepX, pos.y, pos.z - halfL) },
      ];
    } else {
      // --- Bloque en eje X (Rotado) ---
      buttonConfigs = [
        { label: 'derecha',   obj: "none", offsetX: L,  offsetZ: 0, rotateY: true, btnPos: new THREE.Vector3(pos.x + halfL + sepX, pos.y, pos.z) },
        { label: 'izquierda', obj: "none", offsetX: -L, offsetZ: 0, rotateY: true, btnPos: new THREE.Vector3(pos.x - halfL - sepX, pos.y, pos.z) },

        { label: 'frontal-der', obj: "none", offsetX: offEsquinaZ,  offsetZ: offEsquinaX,  rotateY: false, btnPos: new THREE.Vector3(pos.x + halfL, pos.y, pos.z + halfW + sepZ) },
        { label: 'frontal-izq', obj: "none", offsetX: -offEsquinaZ, offsetZ: offEsquinaX,  rotateY: false, btnPos: new THREE.Vector3(pos.x - halfL, pos.y, pos.z + halfW + sepZ) },

        { label: 'trasera-der', obj: "none", offsetX: offEsquinaZ,  offsetZ: -offEsquinaX, rotateY: false, btnPos: new THREE.Vector3(pos.x + halfL, pos.y, pos.z - halfW - sepZ) },
        { label: 'trasera-izq', obj: "none", offsetX: -offEsquinaZ, offsetZ: -offEsquinaX, rotateY: false, btnPos: new THREE.Vector3(pos.x - halfL, pos.y, pos.z - halfW - sepZ) },
      ];
    }

    // 4. PERSISTENCIA: Marcamos como ocupados los slots guardados en el userData del cubo
    const occupiedSlots: string[] = selectedCube.userData['ocupados'] || [];

    buttonConfigs.forEach(config => {
      if (occupiedSlots.includes(config.label)) {
        config.obj = "ocupado";
      }
    });

    // 5. Proyección de coordenadas 3D a pantalla 2D
    const renderer = this.sceneService.getRenderer();
    const camera   = this.sceneService.getCamera();
    const width    = renderer.domElement.clientWidth;
    const height   = renderer.domElement.clientHeight;

    // 6. Filtrado y mapeo final
    this.activeButtons = buttonConfigs
      .filter(config => config.obj === "none") // Solo mostramos los que no están ocupados
      .map((config) => {
        const vector = config.btnPos.clone();
        vector.project(camera);

        return {
          label: config.label,
          obj: config.obj,
          screenX: (vector.x * 0.5 + 0.5) * width,
          screenY: (vector.y * -0.5 + 0.5) * height,
          offsetX: config.offsetX,
          offsetZ: config.offsetZ,
          rotateY: config.rotateY,
          visible: vector.z < 1, // Solo visible si está frente a la cámara
        };
      });

    // Notificar a Angular del cambio para renderizar los botones
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
