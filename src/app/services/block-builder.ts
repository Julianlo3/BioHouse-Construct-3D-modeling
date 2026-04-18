import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene';
import { AssetLoaderService } from './asset-loader';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BlockBuilderService {
  private moldeBloque: THREE.Object3D | null = null;
  private bloqueInicial: THREE.Object3D | null = null;
  private columnInicial: boolean = false;
  private alturaBloque: number = 1;
  private numBlocks: number = 0;
  private secuenceBlocks: number = 1;
  private ultimogiro: number = 0;
  private opacity: number = 1.0;
  private numColumns: number = 0;
  private columnaEspacio: number = 0;

  constructor(
    private sceneService: SceneService,
    private assetLoader: AssetLoaderService
  ) {}

  /**
   * Carga el modelo GLB del bloque base
   */
  loadBlockModel(onSuccess: () => void): void {
    this.assetLoader.loadBlockModel(
      (gltf) => {
        // 1. EL CAMBIO AQUÍ: No uses this.sceneService.getScene()
        // Usamos gltf.scene (que es solo el bloque del archivo .glb)
        const modeloOriginal = gltf

        // 2. Medición inicial (esto ahora solo medirá el bloque, no el suelo)
        const box = new THREE.Box3().setFromObject(modeloOriginal);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        // ... resto del código igual ...
        const largoObjetivo = 3;
        const maxDim = Math.max(size.x, size.z);
        const escalaGral = largoObjetivo / maxDim;
        const escalaY = 0.6 / size.y;

        const contenedor = new THREE.Group();
        contenedor.name = 'muro';

        modeloOriginal.scale.set(escalaGral, escalaY, escalaGral);

        // Centramos el bloque dentro del contenedor
        modeloOriginal.position.x = -center.x * escalaGral;
        modeloOriginal.position.z = -center.z * escalaGral;
        modeloOriginal.position.y = -box.min.y * escalaY;

        contenedor.add(modeloOriginal);

        this.moldeBloque = contenedor;
        this.alturaBloque = (box.max.y - box.min.y) * escalaGral;

        const materialConcreto = this.sceneService.getConcreteMaterial(this.opacity);

        // 3. Ahora el traverse solo afectará a las piezas del bloque
        this.moldeBloque.traverse((hijo) => {
          if (hijo instanceof THREE.Mesh) {
            hijo.material = materialConcreto;
            hijo.castShadow = true;
            hijo.receiveShadow = true;
            hijo.userData['isMuro'] = true;
          }
        });

        console.log('Modelo GLB normalizado y separado de la escena global.');
        onSuccess();
      },
      (error: any) => console.error('Error crítico al cargar el modelo:', error)
    );
  }

  /**
   * Clona el molde del bloque (muro) con la configuración estándar
   */
  private cloneWall(): THREE.Object3D {
    const clone = this.moldeBloque!.clone();
    clone.name = 'muro';

    clone.traverse((hijo) => {
      if (hijo instanceof THREE.Mesh) {
        const mat = (hijo.material as THREE.MeshStandardMaterial).clone();
        mat.transparent = true;
        mat.opacity = this.opacity;
        mat.needsUpdate = true;
        hijo.material = mat;
        hijo.castShadow = true;
        hijo.receiveShadow = true;
        hijo.userData['isMuro'] = true;
      }
    });

    return clone;
  }

  /**
   * Construye un bloque en coordenadas específicas
   */
  buildCube(x: number, z: number): void {
    if (!this.moldeBloque) return;

    const cube = this.cloneWall();
    cube.position.set(x, 0, z);
    this.sceneService.add(cube);
    this.numBlocks++;
  }

  /**
   * Crea un bloque basado en la selección actual con offsets
   */
  createBlockFromSelection(
    selectedCube: THREE.Object3D,
    offsetX: number,
    offsetZ: number,
    rotateY: boolean,
    label: string,
  ): void {
    if (!this.moldeBloque) return;

    this.columnaEspacio = 0;

    if(!this.columnInicial){
      this.bloqueInicial = selectedCube;
      this.columnInicial = true;
    }

    console.log(`Direccion a construir bloque ${label}`);

    if (label.includes("adelante") || label.includes("atras")){
        this.buildForwardBlock(selectedCube,offsetX,offsetZ,rotateY,label);
      if ( this.secuenceBlocks === 7 && !rotateY ) {
        this.insertarColumna(selectedCube, offsetX, offsetZ, rotateY,label);

        if (this.bloqueInicial) {
          const reverseX = offsetX !== 0 ? -offsetX : 0;
          const reverseZ = offsetZ !== 0 ? -offsetZ : 0;

          this.insertarColumna(this.bloqueInicial, reverseX, reverseZ, rotateY,label);
        }

        this.secuenceBlocks = 1;
        this.columnaEspacio = 1.3;
        this.columnInicial = false;
        this.bloqueInicial = null;
      }
    }
    else {
        this.buildRotateBlock(selectedCube,offsetX,offsetZ,rotateY,label);
    }


  }

  private buildForwardBlock(selectedCube: THREE.Object3D, offsetX: number, offsetZ: number, rotateY: boolean,label: string){
    const newCube = this.cloneWall();
    this.numBlocks++;
    this.secuenceBlocks++;

    if(this.secuenceBlocks<=6){
      // 1. Calculamos el desplazamiento corregido para el encaje
      let finalOffsetZ = offsetZ;
      let finalOffsetX = offsetX;

      // Ajuste para el eje Z (hendidura de 0.17m)
      if (Math.abs(offsetZ) > 0) {
        const signoZ = offsetZ > 0 ? 1 : -1;
        finalOffsetZ = (Math.abs(offsetZ) - 0.17) * signoZ;
      }

      if (!selectedCube.userData['occupiedSlots']) {
        selectedCube.userData['occupiedSlots'] = [];
      }
      selectedCube.userData['occupiedSlots'].push(label);

      // 2. EL CAMBIO CLAVE: Usar finalOffsetZ en lugar de offsetZ
      newCube.position.set(
        selectedCube.position.x + finalOffsetX, // Usamos la variable local
        selectedCube.position.y,
        selectedCube.position.z + finalOffsetZ  // <--- Aquí aplicamos el encaje
      );

      this.sceneService.add(newCube);

      console.log("Coordenadas de cubo construido X:" + (selectedCube.position.x + finalOffsetX as number) + " " + "Z:"+ (selectedCube.position.z + finalOffsetZ as number) );
    }



  }

  private buildRotateBlock(selectedCube: THREE.Object3D, offsetX: number, offsetZ: number, rotateY: boolean,label: string) {

    const newCube = this.cloneWall();

    this.columnaEspacio = 3;

    // 1. Calculamos el desplazamiento corregido para el encaje
    let finalOffsetZ = offsetZ ;
    let finalOffsetX = offsetX;


    // Ajuste para el eje Z (hendidura de 0.17m)
    if (Math.abs(offsetZ) > 0) {
      const signoZ = offsetZ > 0 ? 1 : -1;
      finalOffsetZ = (Math.abs(offsetZ) + 0.4) * signoZ;
    }

      // Si hubo giro, hay que ser cuidadosos con qué eje enviamos
      this.insertarColumna(selectedCube, selectedCube.position.x, selectedCube.position.z, rotateY,label);
      console.log("construido girado");
      newCube.rotation.y = Math.PI / 2;

      if (Math.abs(offsetX) > 0) {
        const signoX = offsetX > 0 ? 1 : -1;
        finalOffsetX = (Math.abs(offsetX)) * signoX;
      }


    if (!selectedCube.userData['occupiedSlots']) {
      selectedCube.userData['occupiedSlots'] = [];
    }
    selectedCube.userData['occupiedSlots'].push(label);

    // 2. EL CAMBIO CLAVE: Usar finalOffsetZ en lugar de offsetZ
    newCube.position.set(
      selectedCube.position.x + finalOffsetX, // Usamos la variable local
      selectedCube.position.y,
      selectedCube.position.z + finalOffsetZ // <--- Aquí aplicamos el encaje
    );

    this.sceneService.add(newCube);

    console.log("Coordenadas de cubo construido X:" + (selectedCube.position.x + finalOffsetX as number) + " " + "Z:"+ (selectedCube.position.z + finalOffsetZ as number) );


  }

  private insertarColumna(selectedCube: THREE.Object3D, ox: number, oz: number, ry: boolean,direccion: string): void {
    let disz:number = 1.3;
      if (!ry){

        const geometry = new THREE.BoxGeometry(0.4, 3, 0.4);
        const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const columna = new THREE.Mesh(geometry, material);
        if (oz<0){
          disz = disz * -1;
        }
        columna.position.set(selectedCube.position.x + ox,0 ,selectedCube.position.z + oz - disz)
        this.sceneService.add(columna);
      }
      else{
        if(this.secuenceBlocks < 2){
          console.log(`A que lado se rota ${direccion}` );
          let encuadreColumna: number = 1.7;
          if (!direccion.includes("frontal")){
            encuadreColumna = encuadreColumna *-1;
          }
          const geometry = new THREE.BoxGeometry(0.4, 3, 0.4);
          const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
          const columna = new THREE.Mesh(geometry, material);
          columna.position.set(selectedCube.position.x + ox,0 ,selectedCube.position.z + encuadreColumna)
          this.sceneService.add(columna);
        }
        else {
          console.log(`tope` );
        }

      }
    this.numColumns++;
     let columX: number = selectedCube.position.x + ox;
    let columZ: number = selectedCube.position.z + 0.4;


    console.log("Coordenadas de la columna X:" + columX  +" Z" + columZ);
  }

  /**
   * Construye un número de pisos hacia arriba
   */
  buildFloors(niveles: number): void {
    for (let i = 0; i < niveles; i++) {
      this.buildFloor();
    }
  }

  /**
   * Construye un piso completo encima de los bloques existentes
   */
  private buildFloor(): void {
    if (!this.moldeBloque) return;

    const bloquesActuales = this.sceneService.getWalls();
    const nuevosMuros: THREE.Object3D[] = [];

    bloquesActuales.forEach((bloque) => {
      const existeArriba = bloquesActuales.some(
        (b) =>
          Math.abs(b.position.x - bloque.position.x) < 0.1 &&
          Math.abs(b.position.z - bloque.position.z) < 0.1 &&
          Math.abs(b.position.y - (bloque.position.y + this.alturaBloque)) < 0.1
      );

      if (!existeArriba) {
        const nuevoMuro = this.cloneWall();
        nuevoMuro.position.copy(bloque.position);
        nuevoMuro.rotation.copy(bloque.rotation);
        nuevoMuro.position.y += this.alturaBloque;
        nuevosMuros.push(nuevoMuro);
      }
    });

    nuevosMuros.forEach((muro) => this.sceneService.add(muro));
    this.numBlocks += nuevosMuros.length;
  }

  /**
   * Actualiza la opacidad de los bloques nuevos
   */
  setOpacity(opacity: number): void {
    this.opacity = opacity;
    this.sceneService.updateWallsOpacity(opacity);
  }

  /**
   * Obtiene el número total de bloques
   */
  getBlockCount(): number {
    return this.numBlocks;
  }

  getColumnCount(): number {
    return this.numColumns;
  }

  getSecuenceBlocks(): number {
    return this.secuenceBlocks;
  }

  /**
   * Decrementa el contador de bloques
   */
  decrementBlockCount(): void {
    this.numBlocks--;
  }

  /**
   * Obtiene la altura real del bloque
   */
  getBlockHeight(): number {
    return this.alturaBloque;
  }

  /**
   * Obtiene el molde del bloque
   */
  getBlockMold(): THREE.Object3D | null {
    return this.moldeBloque;
  }
}
