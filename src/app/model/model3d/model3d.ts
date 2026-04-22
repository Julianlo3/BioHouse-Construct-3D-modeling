import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  OnInit,
  OnDestroy
} from '@angular/core';
import * as THREE from 'three';
import { CommonModule } from '@angular/common';
import { ActionsModel } from '../actions-model/actions-model';
import { CubeSelectionService } from '../../services/cube-selection.service';
import { Subscription } from 'rxjs';

// Servicios temáticos
import { SceneService } from '../../services/scene';
import { BlockBuilderService } from '../../services/block-builder';
import { SelectionService } from '../../services/selection';
import { DecorationService } from '../../services/decoration';
import { OverlayService } from '../../services/overlay';
import { ModelStateService } from '../../services/ModelStateService';
import { FloorManagerService } from '../../services/floor-manager';

@Component({
  selector: 'app-model3d',
  imports: [CommonModule, ActionsModel],
  templateUrl: './model3d.html',
  styleUrl: './model3d.css',
})
export class Model3d implements AfterViewInit, OnInit, OnDestroy {
  // ─── Referencia al contenedor DOM ────────────────────────────────────────
  @ViewChild('modelado', { static: false })
  private container!: ElementRef;


  // ─── Inyección de servicios ──────────────────────────────────────────────
  constructor(
    private cdr: ChangeDetectorRef,
    private cubeSelectionService: CubeSelectionService,
    private sceneService: SceneService,
    private blockBuilder: BlockBuilderService,
    private selectionService: SelectionService,
    private decorationService: DecorationService,
    private overlayService: OverlayService,
    private modelStateService: ModelStateService,
    private floorManager: FloorManagerService
  ) { }

  // ─── Estado general ───────────────────────────────────────────────────────
  private subscription: Subscription = new Subscription();

  // ─── Propiedades públicas para el template ───────────────────────────────
  activeButtons: Array<{
    label: string;
    obj: string;
    screenX: number;
    screenY: number;
    offsetX: number;
    offsetZ: number;
    rotateY: boolean;
    visible: boolean;
  }> = [];

  // ─── Menú contextual (clic derecho) ───────────────────────────
  showContextMenu = false;
  contextMenuX = 0;
  contextMenuY = 0;
  private contextMenuBlock: THREE.Object3D | null = null;

  // =========================================================================
  // CICLO DE VIDA
  // =========================================================================

  ngOnInit(): void {
    this.setupSubscriptions();
  }

  ngAfterViewInit(): void {
    this.initializeEngine();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.sceneService.dispose();
  }

  // =========================================================================
  // INICIALIZACIÓN DEL MOTOR
  // =========================================================================

  private initializeEngine(): void {
    // Inicializar servicios temáticos
    this.sceneService.initialize(this.container, () =>
      this.updateButtonPosition()
    );

    this.overlayService.initialize(this.cdr);

    this.selectionService.initialize(
      this.cdr,
      (event: MouseEvent) => this.handleMouseMove(event),
      (intersects: THREE.Intersection<THREE.Object3D>[]) =>
        this.handleClick(intersects)
    );

    // Registrar clic derecho en el canvas del renderer
    const canvas = this.sceneService.getRenderer().domElement;
    canvas.addEventListener('contextmenu', (event: MouseEvent) => {
      event.preventDefault();
      this.handleRightClick(event);
    });

    // Cerrar menú al hacer clic izquierdo en cualquier sitio (con delay para permitir el click del botón)
    window.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0 && this.showContextMenu) {
        setTimeout(() => {
          this.showContextMenu = false;
          this.contextMenuBlock = null;
          this.cdr.detectChanges();
        }, 150);
      }
    });

    // Cargar el modelo del bloque
    this.blockBuilder.loadBlockModel(() => {
      this.blockBuilder.buildCube(0, 0, 'full', 1, true);
      // Marcar retroactivamente muros del piso 1
      this.floorManager.markExistingWallsAsFloor1(this.sceneService.getWalls());
      this.animate();
    });
  }

  /**
   * Configura los observables del servicio de acciones
   */
  private setupSubscriptions(): void {
    this.subscription.add(
      this.cubeSelectionService.selectCube$.subscribe(() => {
        this.cubeSelectionService.setRaycasterActive(true);
      })
    );

    this.subscription.add(
      this.cubeSelectionService.construirMuro$.subscribe(() => {
        this.buildWalls();
      })
    );

    this.subscription.add(
      this.cubeSelectionService.addDecoration$.subscribe(
        (decorationType: string) => {
          this.startAddingDecoration(decorationType);
        }
      )
    );

    this.subscription.add(
      this.cubeSelectionService.opacity$.subscribe((value: number) => {
        this.blockBuilder.setOpacity(value);
      })
    );

    this.subscription.add(
      this.cubeSelectionService.saveModel$.subscribe(() => {
        this.saveModel();
      })
    );

    this.subscription.add(
      this.cubeSelectionService.addFloor$.subscribe(() => {
        this.handleAddFloor();
      })
    );
  }

  // =========================================================================
  // MANEJO DE EVENTOS
  // =========================================================================

  private handleMouseMove(event: MouseEvent): void {
    // Este evento ya es manejado por SelectionService
  }

  private handleClick(intersects: THREE.Intersection<THREE.Object3D>[]): void {
    if (!this.cubeSelectionService.isRaycasterActive()) {
      const selectedCube = this.selectionService.getSelectedCube();
      if (selectedCube) {
        this.selectionService.deselectCube();
        this.updateButtonPosition(); // Ocultar botones flotantes
      }
      return;
    }

    const cubeHit = this.selectionService.findIntersectionByUserData(
      intersects,
      'isMuro',
      true
    );

    if (cubeHit) {
      // Se utiliza una función recursiva (getRootGroup) porque el raycaster
      // puede devolver una malla interna del bloque en lugar del grupo principal que lo contiene.
      // Esto asegura la selección del bloque completo.
      const selectedGroup = this.selectionService.getRootGroup(
        cubeHit.object
      );
      this.selectionService.selectCube(selectedGroup);
      
      // Actualización de la posición de los botones del overlay.
      this.updateButtonPosition();

      if (
        this.decorationService.isAddingDecorationMode() &&
        this.cubeSelectionService.isRaycasterActive()
      ) {
        this.decorationService.updateDecorationTarget(selectedGroup);
      }
    }
  }

  /**
   * Maneja el clic derecho en el canvas.
   * Hace raycasting para encontrar el bloque bajo el cursor y muestra el menú contextual.
   */
  private handleRightClick(event: MouseEvent): void {
    const renderer = this.sceneService.getRenderer();
    const camera = this.sceneService.getCamera();
    const rect = renderer.domElement.getBoundingClientRect();

    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(
      this.sceneService.getScene().children,
      true
    );

    const hit = this.selectionService.findIntersectionByUserData(
      intersects,
      'isMuro',
      true
    );

    if (hit) {
      this.contextMenuBlock = this.selectionService.getRootGroup(hit.object);
      this.contextMenuX = event.clientX;
      this.contextMenuY = event.clientY;
      this.showContextMenu = true;
    } else {
      this.showContextMenu = false;
      this.contextMenuBlock = null;
    }
    this.cdr.detectChanges();
  }

  /**
   * Elimina el bloque sobre el que se hizo clic derecho.
   */
  deleteContextBlock(): void {
    if (!this.contextMenuBlock) return;

    const blockToDelete = this.contextMenuBlock;

    // Protección: no borrar bloques iniciales/guía
    if (blockToDelete.userData['isStarterBlock']) {
      window.alert('No se puede eliminar el bloque inicial de un piso.');
      this.showContextMenu = false;
      this.contextMenuBlock = null;
      this.cdr.detectChanges();
      return;
    }

    // Si estaba seleccionado, limpiar selección y botones flotantes
    if (this.selectionService.getSelectedCube() === blockToDelete) {
      this.selectionService.deselectCube();
      this.overlayService.clearButtons();
      this.activeButtons = [];
    }

    this.blockBuilder.deleteBlock(blockToDelete);

    this.showContextMenu = false;
    this.contextMenuBlock = null;
    this.cdr.detectChanges();
  }

  // =========================================================================
  // CONSTRUCCIÓN DE BLOQUES
  // =========================================================================

  buildWalls(): void {
    const confirm = window.confirm(
      '¿Deseas construir los muros de 2.5 metros (17 bloques) hacia arriba?'
    );
    
    if (!confirm) return;

    // Como ya existe 1 bloque base, construimos 16 niveles adicionales para llegar a 17 en total.
    this.blockBuilder.buildFloors(16);
    this.updateButtonPosition();
  }

  /**
   * Agrega un nuevo piso:
   * 1. Llama a FloorManager para crear la losa del nuevo nivel.
   * 2. Coloca un bloque inicial en el borde de la estructura como guía.
   * 3. Selecciona ese bloque para que el usuario pueda empezar a construir desde él.
   */
  handleAddFloor(): void {
    // Recolectar muros del piso activo ANTES de cambiar de nivel
    const currentLevel = this.floorManager.getActiveFloorLevel();
    const currentWalls = this.sceneService.getWalls(currentLevel);

    if (currentWalls.length === 0) {
      window.alert('El piso actual no tiene muros. Construye al menos un muro antes de agregar otro piso.');
      return;
    }

    const result = this.floorManager.addFloor(currentWalls);
    if (!result) {
      window.alert('Se alcanzó el máximo de 5 pisos.');
      return;
    }

    // Sincronizar el nivel en CubeSelectionService
    this.cubeSelectionService.setFloorLevel(result.baseY === 0 ? 1 : this.floorManager.getActiveFloorLevel());

    // Colocar bloque inicial del nuevo piso en el borde detectado
    this.blockBuilder.buildCube(
      result.x,
      result.z,
      'full',
      this.floorManager.getActiveFloorLevel(),
      true // Es un bloque inicial/guía
    );

    // Seleccionar el bloque recién creado
    const walls = this.sceneService.getWalls(this.floorManager.getActiveFloorLevel());
    const starterBlock = walls[walls.length - 1];
    if (starterBlock) {
      this.selectionService.selectCube(starterBlock);
      this.updateButtonPosition();
    }
  }

  // =========================================================================
  // BOTONES FLOTANTES
  // =========================================================================

  private updateButtonPosition(): void {
    const selectedCube = this.selectionService.getSelectedCube();
    this.overlayService.updateButtonPosition(selectedCube);
    this.activeButtons = this.overlayService.getActiveButtons();
  }

  /**
   * Maneja el click en un botón flotante
   */
  onFloatingButtonClick(config: {
    label: string;
    obj: string;
    offsetX: number;
    offsetZ: number;
    rotateY: boolean;
  }): void {
    const selectedCube = this.selectionService.getSelectedCube();
    if (selectedCube) {

      console.log(`Construyendo hacia: ${config.label}`);

      const newBlockSize = this.cubeSelectionService.getBlockSize();

      const newCube = this.blockBuilder.createBlockFromSelection(
        selectedCube,
        config.offsetX,
        config.offsetZ,
        config.rotateY,
        config.label,
        newBlockSize
      );

      if (newCube) {
        if (!selectedCube.userData['ocupados']) {
          selectedCube.userData['ocupados'] = [];
        }
        selectedCube.userData['ocupados'].push(config.label);
        
        // Se selecciona automáticamente el bloque recién creado para optimizar el flujo de trabajo
        // y permitir la construcción continua de muros sin requerir clics adicionales para la re-selección.
        this.selectionService.selectCube(newCube);
        this.updateButtonPosition();
      }
    }
  }

  // =========================================================================
  // DECORACIONES
  // =========================================================================

  private startAddingDecoration(modelType: string): void {
    const selectedCube = this.selectionService.getSelectedCube();
    this.overlayService.clearButtons();

    this.cubeSelectionService.setDecorationActive(true);

    this.decorationService.startAddingDecoration(
      selectedCube,
      this.sceneService.getControls()
    );

    // Listener para la tecla L (agregar decoración)
    const keyListener = (event: KeyboardEvent) => {
      if ((event.key === 'l' || event.key === 'L') && this.decorationService.isAddingDecorationMode()) {
        this.addDecorationToScene(modelType);
      }
    };


    window.addEventListener('keydown', keyListener);
    (this as any).decorationKeyListener = keyListener;
  }

  private addDecorationToScene(modelType: string): void {
    const selectedCube = this.selectionService.getSelectedCube();
    this.overlayService.clearButtons();
    this.decorationService.addDecorationToScene(modelType, selectedCube);

    if ((this as any).decorationKeyListener) {
      window.removeEventListener('keydown', (this as any).decorationKeyListener);
    }

    this.cubeSelectionService.setDecorationActive(false);
    this.cubeSelectionService.setRaycasterActive(false);
    document.body.classList.remove('mouse-red-cursor');
  }

  // =========================================================================
  // LOOP DE ANIMACIÓN
  // =========================================================================

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.sceneService.getControls()?.update();
    this.sceneService.render();
  };

  // =========================================================================
  // Guardado del modelo
  // =========================================================================

  saveModel() {
    // Obtenemos los objetos que representan la casa (bloques, ventanas, etc.)
    const houseElements = this.sceneService.getScene().children.filter(
      obj => obj.userData['isModelElement'] === true
    );

    this.modelStateService.save(houseElements).subscribe({
      next: (response) => {
        console.log('Modelo guardado con éxito', response);
        // Actualizar ID local si es un modelo nuevo
      },
      error: (err) => console.error('Error al guardar', err)
    });
  }

}
