// En un archivo de utilidades o dentro del nuevo servicio
import * as THREE from 'three';
import { MaterialsResponse } from '../model/DTO/dto';

export class ModelMapper {
  static toMaterialsResponse(object: THREE.Object3D): MaterialsResponse {
    return {
      typeMaterial: object.userData['typeMaterial'] || 'default',
      positionX: object.position.x,
      positionY: object.position.y,
      positionZ: object.position.z,
      rotationX: object.rotation.x,
      rotationY: object.rotation.y,
      rotationZ: object.rotation.z,
      opacity: (object as any).material?.opacity || 1,
      assetPath: object.userData['assetPath'] || ''
    };
  }
}