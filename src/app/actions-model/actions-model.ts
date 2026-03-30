import { Component } from '@angular/core';

@Component({
  selector: 'app-actions-model',
  imports: [],
  templateUrl: './actions-model.html',
  styleUrl: './actions-model.css',
})
export class ActionsModel {
  isMenuOpen = false;

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
  toggleTutorials(){

  }
  toggleCamera(){
    
  }
}
