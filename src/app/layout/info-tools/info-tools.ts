import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-info-tools',
  imports: [],
  templateUrl: './info-tools.html',
  styleUrl: './info-tools.css',
})
export class InfoTools {
  constructor(private router: Router) {}

  goToModel(): void {
    this.router.navigate(['/model']);
  }
}
