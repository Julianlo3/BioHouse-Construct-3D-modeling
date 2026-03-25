import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // 1. Importar el Router

@Component({
  selector: 'app-model-service',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './model-service.html',
  styleUrls: ['./model-service.css']
})
export class ModelService {
  vistaActiva: 'cargar' | 'crear' = 'cargar';

  constructor(private router: Router) {} // 2. Inyectar el servicio

  cambiarVista(vista: 'cargar' | 'crear') {
    this.vistaActiva = vista;

    if (vista === 'crear') {
      // 3. Navegar a la ruta configurada en app.routes.ts
      this.router.navigate(['/model']);
    }
  }
}