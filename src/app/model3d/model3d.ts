import { AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import * as THREE from "three";
import { OrbitControls }  from "three/examples/jsm/controls/OrbitControls.js";
import { TEXTURE_MAP } from '../constants/textures/textures.constant';

import { ActionsModel } from '../actions-model/actions-model';
import { CubeSelectionService } from '../services/cube-selection.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-model3d',
  imports: [ActionsModel],
  templateUrl: './model3d.html',
  styleUrl: './model3d.css',
})
export class Model3d implements AfterViewInit, OnInit, OnDestroy {

  //numero de bloques
  protected numBlocks: number = 0;

  constructor(private cdr: ChangeDetectorRef, private cubeSelectionService: CubeSelectionService) {}

  private subscription: Subscription = new Subscription();

  //diccionario de texturas
  public textures = TEXTURE_MAP;

  // Div donde se creará el render de la vision 3D
  @ViewChild('modelado', { static: false })
  private container!: ElementRef;

  // Variables necesarias para THREE
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private textureLoader!: THREE.TextureLoader;
  private controls!: OrbitControls; // Movimiento del mouse
  private raycaster!: THREE.Raycaster; // Necesario para saber que objeto se selecciona
  private mouse!: THREE.Vector2;

  //logica para botones en bloque
  activeButtons: { screenX: number, screenY: number, offsetX: number, offsetZ: number, rotateY: boolean, visible: boolean }[] = [];

  // Logica de cubo seleccionado
  selectedCube: THREE.Mesh | null = null;

  ngOnInit(): void {
    this.subscription.add(
      this.cubeSelectionService.selectCube$.subscribe(() => {
        this.cubeSelectionService.setRaycasterActive(true);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.initThree();
    this.animate();
  }

  selectCube(cube: THREE.Mesh): void {
    if (this.selectedCube) {
      (this.selectedCube.material as THREE.MeshStandardMaterial).color.set(0xffffff);
    }
    this.selectedCube = cube;
    (cube.material as THREE.MeshStandardMaterial).color.set(0xff0000);
    this.cdr.detectChanges();
  }

  initThree(): void {
    //Parte de la camara
    const fov: number = 75;
    const aspectRatio: number = window.innerWidth / window.innerHeight;
    const near: number = 0.1;
    const far: number = 1000;
    this.camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
    this.camera.position.z = 5;

    //----------------------------

    //Parte de la renderizacion
      //tamanio del render
    const widthRenderer: number = 1200;
    const heightRenderer: number = 700;
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setSize(widthRenderer, heightRenderer);
    this.container.nativeElement.appendChild(this.renderer.domElement);

    //----------------------------

    // Parte de la escena
    this.scene = new THREE.Scene();
      // iluminacion
    const intensityLigth: number = 3;
    const ambientLight = new THREE.AmbientLight(0xffffff, intensityLigth);
    this.scene.add(ambientLight);

    //-----------------------------

    // Parte de controles y movimiento
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    //-----------------------------

    // Guias
      // Desde centro X, Y, Z
    const axesHelper = new THREE.AxesHelper(20);
    this.scene.add(axesHelper);
      // malla
    const gridHelper = new THREE.GridHelper(100, 100, 0xffffff, 0xffffff);
    this.scene.add(gridHelper);

    // cargue de texturas iniciales
    this.textureLoader = new THREE.TextureLoader();

    // cesped
    this.initGrass();

    //--------------------------------

    // construir cubo inicial
    this.buildCube(0.5,2.5);

    // necesario para seleccion cubo mouse
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.renderer.domElement.addEventListener('click', (event: MouseEvent) => {
      if (!this.cubeSelectionService.isRaycasterActive()) {
        return;
      }

      const rect = this.renderer.domElement.getBoundingClientRect();

      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children);

      const cubeHit = intersects.find((obj) => {
        return obj.object instanceof THREE.Mesh && obj.object.geometry.type === 'BoxGeometry';
      });

      if (cubeHit) {
        this.selectCube(cubeHit.object as THREE.Mesh);
      }
    });
  }

  initGrass(): void {
    const grassTexture = this.textureLoader.load(this.textures.grass.default);
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(20, 20);
    grassTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: grassTexture
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    grassTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.add(ground);
  }

  initConcrete(): THREE.MeshStandardMaterial {
    const concreteTexture = this.textureLoader.load(this.textures.concrete.default);
    concreteTexture.wrapS = THREE.RepeatWrapping;
    concreteTexture.wrapT = THREE.RepeatWrapping;
    concreteTexture.repeat.set(1, 1);
    const material = new THREE.MeshStandardMaterial({
      map: concreteTexture
    });
    return material;
  }

  buildCube(x: number, z: number): void {
    const geometry = new THREE.BoxGeometry(1, 1, 5);
    const cube = new THREE.Mesh(geometry, this.initConcrete());
    cube.position.set(x, 0.5, z);
    this.scene.add(cube);
    this.numBlocks ++;
  }

  crearBloqueDesdeSeleccion(offsetX: number, offsetZ: number, rotateY: boolean) {
    if (!this.selectedCube) return;

    const geometry = new THREE.BoxGeometry(1, 1, 5);
    const material = this.initConcrete();
    const newCube = new THREE.Mesh(geometry, material);

    // Si el botón indica que debe rotar, lo giramos 90 grados en el eje Y
    if (rotateY) {
      newCube.rotation.y = Math.PI / 2;
    }

    newCube.position.set(
      this.selectedCube.position.x + offsetX,
      this.selectedCube.position.y,
      this.selectedCube.position.z + offsetZ
    );

    this.scene.add(newCube);
    this.numBlocks ++
  }

  updateButtonPosition() {
    if (!this.selectedCube) {
      this.activeButtons = [];
      return;
    }

    const pos = this.selectedCube.position;
    const isRotated = Math.abs(this.selectedCube.rotation.y) > 0.1;

    let buttonConfigs = [];

    if (!isRotated) {
      // --- BLOQUE NORMAL (Largo en el eje Z - Adelante/Atrás) ---
      buttonConfigs = [
        // 1. Continuar en línea recta (Adelante / Atrás)
        // Offset de 5 unidades para encajar punta con punta
        { offsetX: 0, offsetZ: 5, rotateY: false, btnPos: new THREE.Vector3(pos.x, pos.y, pos.z + 2.8) },
        { offsetX: 0, offsetZ: -5, rotateY: false, btnPos: new THREE.Vector3(pos.x, pos.y, pos.z - 2.8) },

        // 2. Esquinas Derechas (Punta delantera y Punta trasera)
        // Offset X: 3 (0.5 mitad del actual + 2.5 mitad del nuevo)
        // Offset Z: 2 y -2 para alinear los bordes en las puntas
        { offsetX: 3, offsetZ: 2, rotateY: true, btnPos: new THREE.Vector3(pos.x + 1.2, pos.y, pos.z + 2.0) },
        { offsetX: 3, offsetZ: -2, rotateY: true, btnPos: new THREE.Vector3(pos.x + 1.2, pos.y, pos.z - 2.0) },

        // 3. Esquinas Izquierdas (Punta delantera y Punta trasera)
        { offsetX: -3, offsetZ: 2, rotateY: true, btnPos: new THREE.Vector3(pos.x - 1.2, pos.y, pos.z + 2.0) },
        { offsetX: -3, offsetZ: -2, rotateY: true, btnPos: new THREE.Vector3(pos.x - 1.2, pos.y, pos.z - 2.0) },
      ];
    } else {
      // --- BLOQUE ROTADO (Largo en el eje X - Izquierda/Derecha) ---
      buttonConfigs = [
        // 1. Continuar en línea recta (Derecha / Izquierda)
        { offsetX: 5, offsetZ: 0, rotateY: true, btnPos: new THREE.Vector3(pos.x + 2.8, pos.y, pos.z) },
        { offsetX: -5, offsetZ: 0, rotateY: true, btnPos: new THREE.Vector3(pos.x - 2.8, pos.y, pos.z) },

        // 2. Esquinas Frontales (Punta derecha y Punta izquierda)
        // Offset X: 2 y -2 para alinear los bordes
        // Offset Z: 3 (0.5 mitad del actual + 2.5 mitad del nuevo hacia adelante)
        { offsetX: 2, offsetZ: 3, rotateY: false, btnPos: new THREE.Vector3(pos.x + 2.0, pos.y, pos.z + 1.2) },
        { offsetX: -2, offsetZ: 3, rotateY: false, btnPos: new THREE.Vector3(pos.x - 2.0, pos.y, pos.z + 1.2) },

        // 3. Esquinas Traseras (Punta derecha y Punta izquierda)
        { offsetX: 2, offsetZ: -3, rotateY: false, btnPos: new THREE.Vector3(pos.x + 2.0, pos.y, pos.z - 1.2) },
        { offsetX: -2, offsetZ: -3, rotateY: false, btnPos: new THREE.Vector3(pos.x - 2.0, pos.y, pos.z - 1.2) },
      ];
    }

    const width = this.renderer.domElement.clientWidth; // Debería ser 1200
    const height = this.renderer.domElement.clientHeight; // Debería ser 700

    // Proyectamos los 6 botones a la pantalla 2D
    this.activeButtons = buttonConfigs.map(config => {
      const vector = config.btnPos.clone();
      vector.project(this.camera);

      // 3. CORRECCIÓN CLAVE: Si vector.z > 1, el punto está a espaldas de la cámara.
      const isVisible = vector.z < 1;

      return {
        screenX: (vector.x * 0.5 + 0.5) * width,
        screenY: (-vector.y * 0.5 + 0.5) * height,
        offsetX: config.offsetX,
        offsetZ: config.offsetZ,
        rotateY: config.rotateY,
        visible: isVisible // Guardamos si se debe mostrar o no
      };
    });

    this.cdr.detectChanges();
  }

  animate = (): void => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateButtonPosition();
  }

  construirMuros() {
    // 1. Buscamos TODOS los bloques que existen actualmente en la escena
    const bloquesActuales = this.scene.children.filter((obj) => {
      return obj instanceof THREE.Mesh && obj.geometry.type === 'BoxGeometry';
    }) as THREE.Mesh[];

    // Usamos un arreglo temporal para no modificar la escena mientras iteramos
    const nuevosMuros: THREE.Mesh[] = [];

    // 2. Revisamos cada bloque para construir uno encima
    bloquesActuales.forEach((bloque) => {

      // Lógica de seguridad: Comprobamos si YA existe un bloque justo arriba de este.
      // Usamos < 0.1 en lugar de === para evitar errores de decimales en 3D.
      const existeArriba = bloquesActuales.some(b =>
        Math.abs(b.position.x - bloque.position.x) < 0.1 &&
        Math.abs(b.position.z - bloque.position.z) < 0.1 &&
        Math.abs(b.position.y - (bloque.position.y + 1)) < 0.1 // +1 porque es la altura del bloque
      );

      // Si no hay nada arriba, construimos el muro
      if (!existeArriba) {
        const geometry = new THREE.BoxGeometry(1, 1, 5);
        const material = this.initConcrete();
        const nuevoMuro = new THREE.Mesh(geometry, material);

        // Copiamos la posición exacta y la rotación del bloque base
        nuevoMuro.position.copy(bloque.position);
        nuevoMuro.rotation.copy(bloque.rotation);

        // Y lo subimos 1 unidad en el eje Y
        nuevoMuro.position.y += 1;

        nuevosMuros.push(nuevoMuro);
      }
    });

    // 3. Añadimos todos los nuevos muros a la escena de golpe
    nuevosMuros.forEach(muro => this.scene.add(muro));

    this.updateButtonPosition();
  }
}
