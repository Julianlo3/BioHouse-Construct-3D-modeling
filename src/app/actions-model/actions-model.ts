import { Component, OnInit, OnDestroy } from '@angular/core';
import { CubeSelectionService } from '../services/cube-selection.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-actions-model',
  imports: [],
  templateUrl: './actions-model.html',
  styleUrl: './actions-model.css',
})
export class ActionsModel implements OnInit, OnDestroy {
  isMenuOpen = false;
  isAddBrickActive = false;
  private subscription: Subscription = new Subscription();

  constructor(private cubeSelectionService: CubeSelectionService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.cubeSelectionService.raycasterActive$.subscribe(active => {
        this.isAddBrickActive = active;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  onAddBrick() {
    const isCurrentlyActive = this.cubeSelectionService.isRaycasterActive();

    if (isCurrentlyActive) {
      // Desactivar raycaster
      this.cubeSelectionService.setRaycasterActive(false);
      document.body.classList.remove('mouse-red-cursor');
    } else {
      // Activar raycaster
      this.cubeSelectionService.requestSelectCube();
      document.body.classList.add('mouse-red-cursor');
    }
  }

  toggleTutorials() {
    this.deactivateRaycaster();
  }

  toggleCamera() {
    this.deactivateRaycaster();
  }

  private deactivateRaycaster() {
    this.cubeSelectionService.setRaycasterActive(false);
    document.body.classList.remove('mouse-red-cursor');
  }
}
