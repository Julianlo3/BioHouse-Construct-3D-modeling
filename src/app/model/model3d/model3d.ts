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
    private overlayService: OverlayService
  ) {}

  // ─── Estado general ───────────────────────────────────────────────────────
  private subscription: Subscription = new Subscription();

  // ─── Propiedades públicas para el template ───────────────────────────────
  activeButtons: Array<{
    screenX: number;
    screenY: number;
    offsetX: number;
    offsetZ: number;
    rotateY: boolean;
    visible: boolean;
  }> = [];




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

    // Cargar el modelo del bloque
    this.blockBuilder.loadBlockModel(() => {
      this.blockBuilder.buildCube(0, 0);
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
      const selectedGroup = this.selectionService.getRootGroup(
        cubeHit.object
      );
      this.selectionService.selectCube(selectedGroup);
      this.updateButtonPosition(); // Actualizar botones flotantes

      if (
        this.decorationService.isAddingDecorationMode() &&
        this.cubeSelectionService.isRaycasterActive()
      ) {
        this.decorationService.updateDecorationTarget(selectedGroup);
      }
    }
  }

  // =========================================================================
  // CONSTRUCCIÓN DE BLOQUES
  // =========================================================================

  buildWalls(): void {
    const input = window.prompt(
      '¿Cuántos bloques (metros) hacia arriba quieres construir?',
      '1'
    );
    if (input === null) return;

    const niveles = parseInt(input, 10);
    if (isNaN(niveles) || niveles <= 0) {
      window.alert('Por favor, ingresa un número válido mayor a 0.');
      return;
    }

    this.blockBuilder.buildFloors(niveles);
    this.updateButtonPosition();
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
    offsetX: number;
    offsetZ: number;
    rotateY: boolean;
  }): void {
    const selectedCube = this.selectionService.getSelectedCube();
    if (selectedCube) {
      this.blockBuilder.createBlockFromSelection(
        selectedCube,
        config.offsetX,
        config.offsetZ,
        config.rotateY
      );
      this.updateButtonPosition();
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
}
