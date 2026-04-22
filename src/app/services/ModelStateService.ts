import { Injectable } from '@angular/core';
import { Model3DResponse, MaterialsResponse, UserRequest } from '../model/DTO/dto';
import { Model3dService } from './api-services'; // Tu servicio de API
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class ModelStateService {
  private currentModel: Model3DResponse = {
    id: 0,
    Title: '',
    description: '',
    materials: [],
    owner: { id: 1, username: 'admin', email: 'admin@biohouse.co' } // Se debe setear al iniciar
  };

  constructor(private apiService: Model3dService) {}

  // Actualiza los metadatos básicos
  updateBasicInfo(title: string, desc: string, user: UserRequest) {
    this.currentModel.Title = title;
    this.currentModel.description = desc;
    this.currentModel.owner = user;
  }

  // Sincroniza los objetos de la escena con el DTO
  syncFromScene(objects: THREE.Object3D[]) {
    this.currentModel.materials = objects.map(obj => ({
      typeMaterial: obj.userData['typeMaterial'] || 'block',
      positionX: obj.position.x,
      positionY: obj.position.y,
      positionZ: obj.position.z,
      rotationX: obj.rotation.x,
      rotationY: obj.rotation.y,
      rotationZ: obj.rotation.z,
      opacity: 0, // O extraer del material
      assetPath: obj.userData['assetPath'] || ''
    }));
  }

  save(sceneObjects: THREE.Object3D[]) {
    this.syncFromScene(sceneObjects);
    if (this.currentModel.id > 0) {
      return this.apiService.updateModel(this.currentModel);
    } else {
      return this.apiService.saveModel(this.currentModel);
    }
  }
}