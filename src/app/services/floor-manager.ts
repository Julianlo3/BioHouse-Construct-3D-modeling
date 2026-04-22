import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { BehaviorSubject } from 'rxjs';
import { SceneService } from './scene';

export interface FloorData {
  level: number;      // 1-based
  baseY: number;      // Y base where blocks of this floor sit
  opacity: number;    // 0.2 – 1.0
  slab: THREE.Mesh | null; // losa mesh
}

/** Altura entre piso y piso (unidades del motor).
 *  Se actualiza con setFloorHeight() desde BlockBuilderService
 *  una vez que el modelo GLTF esté cargado. */
const DEFAULT_ALTURA_ENTREPISO = 10.4;

@Injectable({ providedIn: 'root' })
export class FloorManagerService {

  private alturaEntrepiso = DEFAULT_ALTURA_ENTREPISO;

  private floors: FloorData[] = [];
  private currentFloor = 1;

  /** Emite el número del piso activo al panel UI */
  private currentFloor$ = new BehaviorSubject<number>(1);
  activeFloor$ = this.currentFloor$.asObservable();

  /** Emite el array completo de pisos (para refrescar tabs) */
  private floorsUpdated$ = new BehaviorSubject<FloorData[]>([]);
  floors$ = this.floorsUpdated$.asObservable();

  constructor(private sceneService: SceneService) {
    // Piso 1 existe desde el inicio (el bloque inicial lo crea model3d.ts)
    this.floors.push({
      level: 1,
      baseY: 0,
      opacity: 1.0,
      slab: null,
    });
    this.floorsUpdated$.next([...this.floors]);
  }

  /** Llamar desde BlockBuilderService cuando el modelo GLTF esté cargado */
  setFloorHeight(h: number): void {
    this.alturaEntrepiso = h;
  }

  getFloorHeight(): number {
    return this.alturaEntrepiso;
  }

  // ─── Piso activo ──────────────────────────────────────────────────────────

  getActiveFloorLevel(): number {
    return this.currentFloor;
  }

  getActiveFloorBaseY(): number {
    const f = this.floors.find(f => f.level === this.currentFloor);
    return f ? f.baseY : 0;
  }

  setActiveFloor(level: number): void {
    if (this.floors.some(f => f.level === level)) {
      this.currentFloor = level;
      this.currentFloor$.next(level);
    }
  }

  // ─── Alta de pisos ────────────────────────────────────────────────────────

  /** Devuelve cuántos pisos hay actualmente */
  getFloorCount(): number {
    return this.floors.length;
  }

  getFloors(): FloorData[] {
    return [...this.floors];
  }

  /**
   * Agrega un piso nuevo (máx. 5).
   * Crea la losa del nuevo piso y coloca el bloque inicial en un extremo.
   * Devuelve la posición donde debe colocarse el bloque inicial, o null si no se pudo.
   */
  addFloor(wallsOfCurrentFloor: THREE.Object3D[]): { x: number; z: number; baseY: number } | null {
    if (this.floors.length >= 5) {
      console.warn('Se alcanzó el máximo de 5 pisos.');
      return null;
    }
    if (wallsOfCurrentFloor.length === 0) {
      console.warn('No hay muros en el piso actual para agregar un piso.');
      return null;
    }

    const newLevel = this.floors.length + 1;
    const newBaseY = (newLevel - 1) * this.alturaEntrepiso;

    // --- Crear losa del nuevo piso ---
    const slab = this.buildSlab(wallsOfCurrentFloor, newBaseY);

    // --- Registrar piso ---
    const newFloor: FloorData = {
      level: newLevel,
      baseY: newBaseY,
      opacity: 1.0,
      slab,
    };
    this.floors.push(newFloor);
    this.floorsUpdated$.next([...this.floors]);

    // --- Activar el nuevo piso ---
    this.currentFloor = newLevel;
    this.currentFloor$.next(newLevel);

    // --- Calcular posición del bloque inicial (borde min-X de los muros del piso anterior) ---
    let minX = Infinity;
    let refZ = 0;
    wallsOfCurrentFloor.forEach(w => {
      if (w.position.x < minX) {
        minX = w.position.x;
        refZ = w.position.z;
      }
    });

    return { x: minX, z: refZ, baseY: newBaseY };
  }

  // ─── Losa ─────────────────────────────────────────────────────────────────

  private buildSlab(walls: THREE.Object3D[], baseY: number): THREE.Mesh | null {
    if (walls.length < 2) return null;

    // Recopilar bounding box de todos los muros
    const pts: THREE.Vector2[] = [];

    walls.forEach(w => {
      const isRotated = Math.abs(w.rotation.y) > 0.1;
      const refSize = w.userData['blockSize'] === 'half' ? 'half' : 'full';
      const L = refSize === 'half' ? 1.5 : 3.0;
      const dist = L / 2;
      const dx = isRotated ? dist : 0;
      const dz = isRotated ? 0 : dist;
      pts.push(new THREE.Vector2(w.position.x - dx, w.position.z - dz));
      pts.push(new THREE.Vector2(w.position.x + dx, w.position.z + dz));
    });

    // Bounding box simple para generar la losa
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    pts.forEach(p => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.y);
      maxZ = Math.max(maxZ, p.y);
    });

    const w = maxX - minX;
    const h = maxZ - minZ;
    if (w < 0.1 || h < 0.1) return null;

    const geo = new THREE.BoxGeometry(w + 0.4, 0.3, h + 0.4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      roughness: 0.7,
      transparent: true,
      opacity: 1.0,
    });

    const slab = new THREE.Mesh(geo, mat);
    // La losa tiene 0.3 de altura → centro en baseY - 0.15 → cara superior exactamente en baseY,
    // donde el bloque del nuevo piso se apoya sin hueco ni solapamiento.
    slab.position.set((minX + maxX) / 2, baseY - 0.15, (minZ + maxZ) / 2);
    slab.receiveShadow = true;
    slab.name = `suelo_piso_${Math.round(baseY / this.alturaEntrepiso) + 1}`;
    slab.userData['isModelElement'] = true;
    slab.userData['typeMaterial'] = 'floor-slab';
    slab.userData['floorLevel'] = Math.round(baseY / this.alturaEntrepiso) + 1;

    this.sceneService.add(slab);
    return slab;
  }

  // ─── Opacidad por piso ────────────────────────────────────────────────────

  setFloorOpacity(level: number, opacity: number): void {
    const floorData = this.floors.find(f => f.level === level);
    if (!floorData) return;
    floorData.opacity = opacity;

    // Actualizar losa
    if (floorData.slab) {
      const mat = floorData.slab.material as THREE.MeshStandardMaterial;
      mat.transparent = true;
      mat.opacity = opacity;
      mat.needsUpdate = true;
    }

    // Actualizar muros de ese piso
    this.sceneService.updateFloorOpacity(level, opacity);
  }

  getFloorOpacity(level: number): number {
    return this.floors.find(f => f.level === level)?.opacity ?? 1.0;
  }

  // ─── Marcado retroactivo del piso 1 ──────────────────────────────────────

  /** Marca todos los muros sin floorLevel como pertenecientes al piso 1 */
  markExistingWallsAsFloor1(walls: THREE.Object3D[]): void {
    walls.forEach(w => {
      if (!w.userData['floorLevel']) {
        w.userData['floorLevel'] = 1;
      }
    });
  }
}
