import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Importación de las interfaces proporcionadas
import { 
  Model3DResponse, 
  Model3DResponseUnique, 
  Model3DRequest, 
  UserRequest,
  MaterialsResponse
} from '../model/DTO/dto'; 

@Injectable({
  providedIn: 'root'
})
export class Model3dService {

  // URL base apuntando a tu controlador de Spring Boot
  private readonly API_URL = 'http://localhost:8080/api/models';

  constructor(private http: HttpClient) { }

  /**
   * Guarda un nuevo modelo 3D.
   * Mapea al @PostMapping("/save") del controlador.
   */
  saveModel(model: Model3DResponse): Observable<Model3DResponse> {
    return this.http.post<Model3DResponse>(`${this.API_URL}/save`, model);
    console.log('Modelo para guardar');
  }

  /**
   * Actualiza un modelo existente.
   * Mapea al @PutMapping("update") del controlador.
   */
  updateModel(model: Model3DResponse): Observable<Model3DResponse> {
    return this.http.put<Model3DResponse>(`${this.API_URL}/update`, model);
  }

  /**
   * Lista los modelos simplificados de un usuario específico.
   * Mapea al @PostMapping("/user/list") del controlador.
   */
  listModelsByUser(user: UserRequest): Observable<Model3DResponseUnique[]> {
    return this.http.post<Model3DResponseUnique[]>(`${this.API_URL}/user/list`, user);
  }

  /**
   * Busca un modelo específico por su ID.
   * Mapea al @PostMapping("/search") del controlador.
   */
  findModel(request: Model3DRequest): Observable<Model3DResponse> {
    return this.http.post<Model3DResponse>(`${this.API_URL}/search`, request);
  }

  /**
   * Elimina un modelo.
   * Mapea al @DeleteMapping("/delete") del controlador.
   */
  deleteModel(request: Model3DRequest): Observable<void> {
    // Nota: El controlador en Spring recibe un @RequestBody en el Delete
    return this.http.delete<void>(`${this.API_URL}/delete`, { body: request });
  }
}