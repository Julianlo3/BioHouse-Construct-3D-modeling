import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneService } from './scene';
import { BlockBuilderService } from './block-builder';
import { AssetLoaderService } from './asset-loader';

const DOOR_DIMENSIONS = {
  width: 3,
  height: 6,
} as const;

const WINDOW_DIMENSIONS = {
  width: 3,
  height: 3,
} as const;

@Injectable({
  providedIn: 'root',
})
export class DecorationService {
  private isAddingDecoration: boolean = false;
  private selectionMesh: THREE.Mesh | null = null;
  private decorationTargetPosition: THREE.Vector3 | null = null;
  private numRotation: number = 0;
  private decorationKeyListener: ((event: KeyboardEvent) => void) | null = null;

  constructor(
    private sceneService: SceneService,
    private blockBuilder: BlockBuilderService,
    private assetLoader: AssetLoaderService
  ) {}

  /**
   * Inicia el modo de adición de decoración
   */
  startAddingDecoration(
    selectedCube: THREE.Object3D | null,
    controls: OrbitControls
  ): void {
    this.isAddingDecoration = true;
    this.numRotation = 0;

    // Solo se permie iniciar decoraciona bloque completo

    if (selectedCube?.userData['blockSize'] === 'half') {
      alert('Solo se puede agregar decoración a bloques completos. Por favor, selecciona un bloque completo.');
      this.isAddingDecoration = false;
      return;
    }

    if (selectedCube) {
      this.decorationTargetPosition = selectedCube.position.clone();
    } else {
      this.decorationTargetPosition = null;
    }

    const { width, depth } = this.getSelectedBlockDimensions(selectedCube);

    // Crear mesh de selección
    const geometry = new THREE.PlaneGeometry(width, depth);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
    });
    this.selectionMesh = new THREE.Mesh(geometry, material);
    this.selectionMesh.rotation.x = -Math.PI / 2;

    if (this.decorationTargetPosition) {
      this.selectionMesh.position.copy(this.decorationTargetPosition);
      // Ajustar altura para que no quede enterrado en el piso
      if(this.decorationTargetPosition.y <= 0.5) {
        this.selectionMesh.position.y += 0.05;
      }
    } else {
      this.selectionMesh.position.set(0.5, 0.05, 0.5);
    }

    this.sceneService.add(this.selectionMesh);

    // Agregar listener para teclas
    this.decorationKeyListener = (event: KeyboardEvent) => {
      if (!this.isAddingDecoration) return;

      if (event.key === 'Escape' || event.key === 'Esc') {
        this.cancelAddingDecoration();
      } else if (event.key === 'l' || event.key === 'L') {
        // Será manejado por el komponente
      } else if (['w', 'W', 's', 'S', 'a', 'A', 'd', 'D'].includes(event.key)) {
        const { dx, dz } = this.getMovementDeltaForKey(event.key, controls);
        this.moveSelection(dx, dz);
      } else if (event.key === 'q' || event.key === 'Q') {
        if (this.selectionMesh) {
          this.numRotation++;
          this.selectionMesh.rotateZ(Math.PI / 2);
        }
      }
    };

    window.addEventListener('keydown', this.decorationKeyListener);
  }

  /**
   * Mueve la selección de decoración
   */
  moveSelection(dx: number, dz: number): void {
    if (!this.selectionMesh) return;

    this.selectionMesh.position.x += dx;
    this.selectionMesh.position.z += dz;
  }

  /**
   * Rota la selección de decoración
   */
  rotateSelection(): void {
    if (!this.selectionMesh) return;
    this.numRotation++;
    this.selectionMesh.rotateZ(Math.PI / 2);
  }

  /**
   * Actualiza la posición de target cuando se selecciona un cubo durante la decoración
   */
  updateDecorationTarget(selectedCube: THREE.Object3D | null): void {
    if (selectedCube && this.selectionMesh) {
      this.decorationTargetPosition = selectedCube.position.clone();
      this.selectionMesh.position.copy(this.decorationTargetPosition);
    }
  }

  /**
   * Agrega la decoración a la escena
   */
  addDecorationToScene(
    modelType: string,
    selectedCube: THREE.Object3D | null
  ): void {
    if (!this.selectionMesh) return;

    const targetPosition = this.selectionMesh.position.clone();
    const targetRotation = this.selectionMesh.rotation.clone();

    this.cancelAddingDecoration();

    const modelPath = this.assetLoader.getDecorationPath(modelType);

    this.assetLoader.loadDecorationModel(
      modelType as 'door' | 'window',
      (newDecoration) => {
        const dimensions =
          modelType === 'door' ? DOOR_DIMENSIONS : WINDOW_DIMENSIONS;

        this.scaleModelToDimensions(
          newDecoration,
          dimensions.width,
          dimensions.height
        );

        newDecoration.position.set(
          targetPosition.x,
          selectedCube ? selectedCube.position.y : targetPosition.y,
          targetPosition.z
        );

        // Eliminar cubos que se solapan
        if (selectedCube) {
          const decorationHeight = dimensions.height;
          const baseY = selectedCube.position.y;
          const cubosTieneQueBorrados = this.sceneService
            .getWalls()
            .filter((obj) => {
              const sameX =
                Math.abs(
                  obj.position.x - selectedCube.position.x
                ) < 0.75;
              const sameZ =
                Math.abs(
                  obj.position.z - selectedCube.position.z
                ) < 0.75;
              const isAbove = obj.position.y >= baseY;
              const isWithinDecorationHeight =
                obj.position.y < baseY + decorationHeight;

              return sameX && sameZ && isAbove && isWithinDecorationHeight;
            });

          cubosTieneQueBorrados.forEach((cubo) => {
            this.sceneService.remove(cubo);
            this.blockBuilder.decrementBlockCount();
          });
        }

          // Ajustes de posición según tipo
        if (modelType === 'window') {
          newDecoration.position.y -= 2;
          newDecoration.position.z -= 1;
          if (!(this.numRotation % 2 === 0)) {
            newDecoration.position.z += 1;
          } else {
            newDecoration.position.x += 0.2;
            newDecoration.position.z += 0.8;
          }
        }

        if (!(this.numRotation % 2 === 0)) {
          this.numRotation = 0;
          newDecoration.rotation.z = Math.PI / 2;
          newDecoration.rotation.y = Math.PI / 2;
          newDecoration.rotation.x = -Math.PI / 2;
        }

        newDecoration.userData['isModelElement'] = true;
        newDecoration.userData['typeMaterial'] = modelType === 'door' ? 'door' : 'window';
        newDecoration.userData['assetPath'] = modelPath;
        this.sceneService.add(newDecoration);
      },
      (error) => console.error('Error cargando decoración:', error)
    );
  }

  /**
   * Cancela la adición de decoración
   */
  cancelAddingDecoration(): void {
    if (this.selectionMesh) {
      this.sceneService.remove(this.selectionMesh);
      this.selectionMesh = null;
    }

    this.isAddingDecoration = false;
    document.body.classList.remove('mouse-red-cursor');

    if (this.decorationKeyListener) {
      window.removeEventListener('keydown', this.decorationKeyListener);
    }
  }

  /**
   * Obtiene si se está agregando una decoración
   */
  isAddingDecorationMode(): boolean {
    return this.isAddingDecoration;
  }

  /**
   * Escala un modelo a las dimensiones deseadas
   */
  private scaleModelToDimensions(
    model: THREE.Group,
    width: number,
    height: number
  ): void {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    const scaleX = width / size.x;
    const scaleY = height / size.y;
    const scaleZ = 1;

    model.scale.set(scaleX, scaleY, scaleZ);
    model.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    model.position.sub(scaledCenter);
  }

  /**
   * Obtiene las dimensiones del bloque seleccionado
   */
  private getSelectedBlockDimensions(
    selectedCube: THREE.Object3D | null
  ): { width: number; depth: number } {
    if (!selectedCube) {
      return { width: 3, depth: 1 };
    }

    const box = new THREE.Box3().setFromObject(selectedCube);
    const size = box.getSize(new THREE.Vector3());

    const width = size.x || 3;
    const depth = size.z || 1;

    return {
      width: Math.max(width, 0.1),
      depth: Math.max(depth, 0.1),
    };
  }

  /**
   * Obtiene el delta de movimiento para una tecla
   */
  private getMovementDeltaForKey(
    key: string,
    controls: OrbitControls
  ): { dx: number; dz: number } {
    const angle = this.normalizeCameraAngle(controls.getAzimuthalAngle());

    let forward = { dx: 0, dz: 1 };
    let right = { dx: 1, dz: 0 };

    if (angle >= Math.PI / 4 && angle < (3 * Math.PI) / 4) {
      forward = { dx: 1, dz: 0 };
      right = { dx: 0, dz: -1 };
    } else if (angle >= (3 * Math.PI) / 4 && angle < (5 * Math.PI) / 4) {
      forward = { dx: 0, dz: -1 };
      right = { dx: -1, dz: 0 };
    } else if (angle >= (5 * Math.PI) / 4 && angle < (7 * Math.PI) / 4) {
      forward = { dx: -1, dz: 0 };
      right = { dx: 0, dz: 1 };
    }

    switch (key.toLowerCase()) {
      case 'w':
        return { dx: -forward.dx, dz: -forward.dz };
      case 's':
        return forward;
      case 'a':
        return { dx: -right.dx, dz: -right.dz };
      case 'd':
        return right;
      default:
        return { dx: 0, dz: 0 };
    }
  }

  /**
   * Normaliza un ángulo
   */
  private normalizeCameraAngle(angle: number): number {
    const normalized = angle % (2 * Math.PI);
    return normalized < 0 ? normalized + 2 * Math.PI : normalized;
  }
}
