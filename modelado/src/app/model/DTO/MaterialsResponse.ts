export interface MaterialsResponse {
  typeMaterial: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  opacity: number;
  assetPath: string;
  blockSize?: 'full' | 'half';
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  floorLevel?: number;
  isStarterBlock?: boolean;
}