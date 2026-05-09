import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CubeSelectionService } from '../../services/cube-selection.service';
import { Subscription } from 'rxjs';
import { SceneService } from '../../services/scene';
import { BlockBuilderService } from '../../services/block-builder';
import { FloorManagerService, FloorData } from '../../services/floor-manager';
import { Model3dService } from '../../services/api-services';
import { Model3DResponseUnique, UserRequest } from '../../model/DTO/dto';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModelStateService } from '../../services/ModelStateService';
import { NavigationStateService } from '../../services/navigation-state.service';

@Component({
  selector: 'app-actions-model',
  imports: [CommonModule, FormsModule],
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
  isLoadModalOpen = false;
  isSaveModalOpen = false;
  saveTitle: string = '';
  saveDescription: string = '';
  availableModels: Model3DResponseUnique[] = [];
  isLoadingModels = false;

  // ─── Estado de pisos ─────────────────────────────────────────────────────
  floors: FloorData[] = [];
  activeFloorLevel: number = 1;
  floorOpacity: number = 1.0;

  private subscription: Subscription = new Subscription();


  constructor(private cubeSelectionService: CubeSelectionService, private sceneService: SceneService,
              private blockBuilderService: BlockBuilderService,
              private floorManagerService: FloorManagerService,
              private model3dService: Model3dService,
              private modelStateService: ModelStateService,
              private navigationState: NavigationStateService,
              private cdr: ChangeDetectorRef) {}


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

    // Verificar si el usuario eligió cargar un proyecto antiguo
    if (this.navigationState.loadOldProject()) {
      this.isLoadModalOpen = true;
      this.loadAvailableModels();
      this.navigationState.loadOldProject.set(false);
    }
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
    this.buildFloor(); // Calcula el área y crea la losa del suelo al levantar el muro
    this.isWallModalOpen = false;
  }

  buildFloor() {
    this.floorArea = this.blockBuilderService.buildGroundFloor();
    this.floorManagerService.setFloorArea(this.activeFloorLevel, this.floorArea);
  }

  calculateArea() {
    this.floorArea = this.blockBuilderService.buildGroundFloor();
    this.floorManagerService.setFloorArea(this.activeFloorLevel, this.floorArea);
  }

  getActiveFloorArea(): number {
    const floor = this.floors.find(f => f.level === this.activeFloorLevel);
    return floor ? floor.area : 0;
  }

  getTotalArea(): number {
    return this.floors.reduce((sum, floor) => sum + (floor.area || 0), 0);
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
  console.log('[DEBUG canAddFloor] floors.length:', this.floors.length);
  console.log('[DEBUG canAddFloor] activeFloorLevel:', this.activeFloorLevel);
  console.log('[DEBUG canAddFloor] resultado:', this.floors.length < 5 && this.activeFloorLevel === this.floors.length);
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
    this.saveTitle = '';
    this.saveDescription = '';
    this.isSaveModalOpen = true;
  }

  confirmSaveModel() {
    if (!this.saveTitle.trim()) {
      window.alert('Por favor ingresa un título para el modelo');
      return;
    }

    console.log(`💾 Guardando modelo: "${this.saveTitle}"`);
    this.modelStateService.updateBasicInfo(this.saveTitle, this.saveDescription,
      { id: 1, username: 'admin', email: 'admin@biohouse.co' });

    this.cubeSelectionService.requestSaveModel();
    this.isSaveModalOpen = false;
    window.alert('✅ Modelo guardado correctamente');
  }

  cancelSaveModel() {
    this.isSaveModalOpen = false;
    this.saveTitle = '';
    this.saveDescription = '';
  }

  openLoadModelModal(): void {
    console.log('🔓 Abriendo modal de carga...');
    this.isLoadModalOpen = true;
    this.loadAvailableModels();
  }

  closeLoadModelModal(): void {
    console.log('🔒 Cerrando modal de carga');
    this.isLoadModalOpen = false;
    this.availableModels = [];
  }

  private loadAvailableModels(): void {
    console.log('📡 Cargando modelos del backend...');
    this.isLoadingModels = true;
    // Usar admin por defecto - en producción esto debería venir del usuario logueado
    const userRequest: UserRequest = { id: 1, username: 'admin', email: 'admin@biohouse.co' };

    console.log('Enviando request:', userRequest);
    this.model3dService.listModelsByUser(userRequest).subscribe({
      next: (models) => {
        console.log('✅ Modelos recibidos:', models);
        this.availableModels = models;
        this.isLoadingModels = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error al cargar modelos:', err);
        window.alert('Error al cargar la lista de modelos: ' + err.message);
        this.isLoadingModels = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadSelectedModel(modelId: number): void {
    // Solicitar el modelo completo con sus datos
    const request = { id: modelId, title: '', description: '' };

    this.model3dService.findModel(request).subscribe({
      next: (fullModel) => {
        // Limpiar la escena actual
        this.sceneService.clearModelElements();

        // Cargar el modelo en el servicio de estado
        this.cubeSelectionService.requestLoadModel(fullModel);

        // Cerrar modal
        this.isLoadModalOpen = false;
        this.availableModels = [];
      },
      error: (err) => {
        console.error('Error al cargar el modelo:', err);
        window.alert('Error al cargar el modelo');
      }
    });
  }

}
