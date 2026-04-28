import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationStateService } from '../../services/navigation-state.service';

@Component({
  selector: 'app-info-tools',
  imports: [],
  templateUrl: './info-tools.html',
  styleUrl: './info-tools.css',
})
export class InfoTools {
  isChoiceModalOpen = false;

  constructor(
    private router: Router,
    private navigationState: NavigationStateService
  ) {}

  openChoiceModal(): void {
    this.isChoiceModalOpen = true;
  }

  chooseLoadOld(): void {
    this.navigationState.loadOldProject.set(true);
    this.isChoiceModalOpen = false;
    this.router.navigate(['/model']);
  }

  chooseNewModel(): void {
    this.isChoiceModalOpen = false;
    this.router.navigate(['/model']);
  }
}
