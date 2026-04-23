import { Component, OnInit, OnDestroy } from '@angular/core';
import { CubeSelectionService } from '../../services/cube-selection.service';
import { Subscription } from 'rxjs';
import { SceneService } from '../../services/scene';
import { BlockBuilderService } from '../../services/block-builder';
import { FloorManagerService, FloorData } from '../../services/floor-manager';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-actions-model',
  imports: [CommonModule],
  templateUrl: './actions-model.html',
  styleUrl: './actions-model.css',
})
export class ActionsModel implements OnInit, OnDestroy {
  isMenuOpen = false;
  isAddBrickActive = false;
  isBlockSubMenuOpen = false;
  currentBlockSize: 'full' | 'half' = 'full';
  isWallActive = false;
  isDecorationsActive = false;
  isDecorationSubMenuOpen = false;
  opacity = 1.0;
  guiasActivas: boolean = false;
  floorArea: number = 0;
  isFloorModalOpen = false;
  isWallModalOpen = false;

  // ─── Estado de pisos ─────────────────────────────────────────────────────
  floors: FloorData[] = [];
  activeFloorLevel: number = 1;
  floorOpacity: number = 1.0;

  private subscription: Subscription = new Subscription();


  constructor(private cubeSelectionService: CubeSelectionService, private sceneService: SceneService,
              private blockBuilderService: BlockBuilderService,
              private floorManagerService: FloorManagerService) {}


  ngOnInit(): void {
    this.subscription.add(
      this.cubeSelectionService.raycasterActive$.subscribe(active => {
        this.isAddBrickActive = active;
      })
    );
    this.subscription.add(
      this.cubeSelectionService.decorationActive$.subscribe(active => {
        this.isDecorationsActive = active;
      })
    );
    this.subscription.add(
      this.cubeSelectionService.opacity$.subscribe(value => {
        this.opacity = value;
      })
    );
    this.subscription.add(
      this.cubeSelectionService.blockSize$.subscribe(size => {
        this.currentBlockSize = size;
      })
    );
    this.subscription.add(
      this.floorManagerService.floors$.subscribe(floors => {
        this.floors = floors;
      })
    );
    this.subscription.add(
      this.floorManagerService.activeFloor$.subscribe(level => {
        this.activeFloorLevel = level;
        this.floorOpacity = this.floorManagerService.getFloorOpacity(level);
      })
    );
  }


  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleBlockSubMenu() {
    this.isBlockSubMenuOpen = !this.isBlockSubMenuOpen;
  }

  onAddBrick(size: 'full' | 'half') {
    const isCurrentlyActive = this.cubeSelectionService.isRaycasterActive();
    this.cubeSelectionService.setBlockSize(size);

    if (isCurrentlyActive && this.currentBlockSize === size) {
      // Desactivar raycaster solo si se vuelve a clickear la misma opción
      this.cubeSelectionService.setRaycasterActive(false);
      document.body.classList.remove('mouse-red-cursor');
      this.isBlockSubMenuOpen = false;
    } else {
      // Activar raycaster
      if (!isCurrentlyActive) {
        this.cubeSelectionService.requestSelectCube();
      }
      document.body.classList.add('mouse-red-cursor');
      this.isBlockSubMenuOpen = false;
    }
  }

  toggleGuias(): void {
    this.guiasActivas = !this.guiasActivas;
    this.sceneService.setGuidelinesVisibility(this.guiasActivas);
  }

  getNumBlocks(): number {
    return this.blockBuilderService.getBlockCount();
  }

  getSecuenceBlocks(): number {
    return this.blockBuilderService.getSecuenceBlocks();
  }

  getColumnCount(): number {
    return this.blockBuilderService.getColumnCount();
  }

  // Construir muro
  buildWall() {
    this.isWallModalOpen = true;
  }

  // Confirmación para construir muro
  confirmBuildWall() {
    this.cubeSelectionService.requestConstruirMuro();
    this.isWallModalOpen = false;
  }

  buildFloor() {
    this.floorArea = this.blockBuilderService.buildGroundFloor();
  }

  openAddFloorModal() {
    if (this.canAddFloor()) {
      this.isFloorModalOpen = true;
    } else {
      window.alert("No se pueden agregar más pisos o debe estar en el último piso.");
    }
  }

  // Nueva función para confirmar la acción
  confirmAddFloor() {
    this.addFloor(); // Ejecuta la lógica existente de agregar piso
    this.isFloorModalOpen = false;
    // Opcional: También podrías llamar a buildFloor() aquí si deseas 
    // que se calcule el área inmediatamente.
  }

  // ─── Gestión de pisos ────────────────────────────────────────────────────

  canAddFloor(): boolean {
    return this.floors.length < 5 && this.activeFloorLevel === this.floors.length;
  }

  addFloor(): void {
    this.cubeSelectionService.requestAddFloor();
  }

  selectFloor(level: number): void {
    this.floorManagerService.setActiveFloor(level);
    this.cubeSelectionService.setFloorLevel(level);
    this.floorOpacity = this.floorManagerService.getFloorOpacity(level);
  }

  onFloorOpacityChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    this.floorOpacity = value;
    this.floorManagerService.setFloorOpacity(this.activeFloorLevel, value);
  }

  toggleDecorationSubMenu() {
    this.isDecorationSubMenuOpen = !this.isDecorationSubMenuOpen;
  }

  onAddDecoration(decorationType: string) {
    const isCurrentlyActive = this.cubeSelectionService.isDecorationActive();

    if (isCurrentlyActive) {
      // Desactivar decoraciones
      this.cubeSelectionService.setDecorationActive(false);
      document.body.classList.remove('mouse-red-cursor');
      this.isDecorationSubMenuOpen = false;
    } else {
      // Activar raycaster si estaba desactivado
      if (!this.cubeSelectionService.isRaycasterActive()) {
        this.cubeSelectionService.setRaycasterActive(true);
      }
      // Activar decoraciones con el tipo especificado
      this.cubeSelectionService.requestAddDecoration(decorationType);
      document.body.classList.add('mouse-red-cursor');
      this.isDecorationSubMenuOpen = false;
    }
  }

  onOpacityChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    this.opacity = value;
    this.cubeSelectionService.setOpacity(value);
  }

  getMessage(): string {
    if (this.isDecorationsActive) {
      return 'Haz doble clic para seleccionar la posición del elemento. Utiliza la tecla Q para rotar y W (adelante), A (izquierda), S (atrás), D (derecha) para posicionar el elemento. ESC para cancelar.';
    }
    if (this.isAddBrickActive) {
      return 'Haz doble clic para seleccionar un ladrillo y utilizar los botones de acción. Haz clic derecho para eliminar un ladrillo.';
    }
    return '';
  }

  toggleCamera() {
    this.deactivateRaycaster();
  }

  private deactivateRaycaster() {
    this.cubeSelectionService.setRaycasterActive(false);
    document.body.classList.remove('mouse-red-cursor');
  }

  saveModel() {
    this.cubeSelectionService.requestSaveModel();
    window.alert('Modelo guardado');
  }

}
