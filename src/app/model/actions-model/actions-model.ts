import { Component, OnInit, OnDestroy } from '@angular/core';
import { CubeSelectionService } from '../../services/cube-selection.service';
import { Subscription } from 'rxjs';
import { SceneService } from '../../services/scene';
import { BlockBuilderService } from '../../services/block-builder';

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
  private subscription: Subscription = new Subscription();


  constructor(private cubeSelectionService: CubeSelectionService,private sceneService: SceneService,
              private blockBuilderService: BlockBuilderService,) {}


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

  buildWall(){
    this.cubeSelectionService.requestConstruirMuro();
  }

  buildFloor() {
    this.floorArea = this.blockBuilderService.buildGroundFloor();
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
      return 'Doble click para selecionar la pocicion del elemento, utiliza la tecla q para rptar y w (adelante) a (izquierda) s (atras) d (derecha) para pocicionar el elemento';
    }
    if (this.isAddBrickActive) {
      return 'Doble click para selecionar ladrillo y utiliza los botones para crear mas ladrillos';
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
}
