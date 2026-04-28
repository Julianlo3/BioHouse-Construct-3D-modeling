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
    title: '',
    description: '',
    materials: [],
    owner: { id: 1, username: 'admin', email: 'admin@biohouse.co' } // Se debe setear al iniciar
  };

  constructor(private apiService: Model3dService) {}

  // Actualiza los metadatos básicos
  updateBasicInfo(title: string, desc: string, user: UserRequest) {
    this.currentModel.title = title;
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
      opacity: obj.userData['opacity'] || 1,
      assetPath: obj.userData['assetPath'] || '',
      blockSize: obj.userData['blockSize'] || 'full',
      scaleX: obj.scale.x,
      scaleY: obj.scale.y,
      scaleZ: obj.scale.z,
      floorLevel: obj.userData['floorLevel'] || 0,
      isStarterBlock: obj.userData['isStarterBlock'] || false
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

  // Cargar un modelo guardado
  loadModel(modelData: Model3DResponse) {
    this.currentModel = modelData;
  }

  // Obtener el modelo actual
  getCurrentModel(): Model3DResponse {
    return this.currentModel;
  }

  // Obtener los materiales para reconstruir la escena
  getMaterials(): MaterialsResponse[] {
    return this.currentModel.materials;
  }
}
