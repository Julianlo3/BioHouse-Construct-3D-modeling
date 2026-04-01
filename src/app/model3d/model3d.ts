import { AfterViewInit, Component, ElementRef, ViewChild, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import * as THREE from "three";
import { OrbitControls }  from "three/examples/jsm/controls/OrbitControls.js";
import { TEXTURE_MAP } from '../constants/textures/textures.constant';

import { ActionsModel } from '../actions-model/actions-model';
import { CubeSelectionService } from '../services/cube-selection.service';
import { Subscription } from 'rxjs';
// Importamos el GLTFLoader para cargar modelos 3D
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Constantes de rutas de modelos
const MODEL_PATHS = {
  door: '/assets/models/PuertaMadera.glb'
} as const;

// Constantes de dimensiones
const DOOR_DIMENSIONS = {
  width: 1,    // 1 metro de ancho
  height: 2,   // 2 metros de largo/altura
} as const;

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
  private gltfLoader = new GLTFLoader(); // Para cargar modelos 3D en formato GLTF/GLB

  //logica para botones en bloque
  activeButtons: { screenX: number, screenY: number, offsetX: number, offsetZ: number, rotateY: boolean, visible: boolean }[] = [];

  // Logica de cubo seleccionado
  selectedCube: THREE.Mesh | null = null;

  // Mesh de selección para decoraciones (cuadro verde)
  private selectionMesh: THREE.Mesh | null = null;
  private isAddingDecoration: boolean = false;

  ngOnInit(): void {
    this.subscription.add(
      this.cubeSelectionService.selectCube$.subscribe(() => {
        this.cubeSelectionService.setRaycasterActive(true);
      })
    );
    this.subscription.add(
      this.cubeSelectionService.construirMuro$.subscribe(() => {
        this.construirMuros();
      })
    );
    this.subscription.add(
      this.cubeSelectionService.addDecoration$.subscribe(() => {
        this.startAddingDecoration('door');
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

    // Listener para movimiento del mouse (para actualizar posición del ghost preview)
    this.renderer.domElement.addEventListener('mousemove', (event: MouseEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    });

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

  construirMuros() {
    const input = window.prompt('¿Cuántos bloques (metros) hacia arriba quieres construir?', '1');

    // Si el usuario presiona "Cancelar" o cierra la ventana, detenemos la función
    if (input === null) return;

    // Convertimos el texto a un número entero
    const niveles = parseInt(input, 10);

    // Validamos que el usuario haya escrito un número válido y mayor a cero
    if (isNaN(niveles) || niveles <= 0) {
      window.alert('Por favor, ingresa un número válido mayor a 0.');
      return;
    }

    // Ejecutamos la construcción la cantidad de veces que el usuario pidió
    for (let i = 0; i < niveles; i++) {
      this.levantarUnPiso();
    }

    // Actualizamos los botones por si había un cubo seleccionado
    this.updateButtonPosition();
  }

  // 2. La lógica aislada de levantar una sola capa (tu código anterior adaptado)
  levantarUnPiso() {
    const bloquesActuales = this.scene.children.filter((obj) => {
      return obj instanceof THREE.Mesh && obj.geometry.type === 'BoxGeometry';
    }) as THREE.Mesh[];

    const nuevosMuros: THREE.Mesh[] = [];


    // comprobar existencia bloques arriba
    bloquesActuales.forEach((bloque) => {
      const existeArriba = bloquesActuales.some(b =>
        Math.abs(b.position.x - bloque.position.x) < 0.1 &&
        Math.abs(b.position.z - bloque.position.z) < 0.1 &&
        Math.abs(b.position.y - (bloque.position.y + 1)) < 0.1
      );

      if (!existeArriba) {
        const geometry = new THREE.BoxGeometry(1, 1, 5);
        const material = this.initConcrete();
        const nuevoMuro = new THREE.Mesh(geometry, material);

        nuevoMuro.position.copy(bloque.position);
        nuevoMuro.rotation.copy(bloque.rotation);
        nuevoMuro.position.y += 1; // Lo subimos 1 unidad
        this.numBlocks ++;
        nuevosMuros.push(nuevoMuro);
      }
    });

    // agregar bloques para crear pared
    nuevosMuros.forEach(muro => this.scene.add(muro));
  }

  loadModel(modelPath: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          
          resolve(model);
        },
        undefined,
        (error) => {
          console.error('Error cargando modelo:', error);
          reject(error);
        }
      );
    });
  }

  async startAddingDecoration(modelType: string) {
    this.isAddingDecoration = true;
    this.cubeSelectionService.setDecorationActive(true);
    
    // Crear mesh de selección (cuadro verde de 1x1)
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
    this.selectionMesh = new THREE.Mesh(geometry, material);
    this.selectionMesh.rotation.x = -Math.PI / 2; // Horizontal
    this.selectionMesh.position.set(0.5, 0.05, 0.5); // Posición inicial en el centro de un cuadro de la grilla
    this.scene.add(this.selectionMesh);
    
    // Agregar listener para teclas (W,S,A,D para mover, L para agregar, ESC para cancelar)
    const keyListener = (event: KeyboardEvent) => {
      if (!this.isAddingDecoration) return;
      
      if (event.key === 'Escape' || event.key === 'Esc') {
        this.cancelAddingDecoration();
      } else if (event.key === 'l' || event.key === 'L') {
        this.addDecorationToScene(modelType);
      } else if (event.key === 'w' || event.key === 'W') {
        this.moveSelection(0, 1); // Arriba (+Z)
      } else if (event.key === 's' || event.key === 'S') {
        this.moveSelection(0, -1); // Abajo (-Z)
      } else if (event.key === 'a' || event.key === 'A') {
        this.moveSelection(-1, 0); // Izquierda (-X)
      } else if (event.key === 'd' || event.key === 'D') {
        this.moveSelection(1, 0); // Derecha (+X)
      }
    };
    
    window.addEventListener('keydown', keyListener);
    
    // Guardar referencia para poder remover después
    (this as any).decorationKeyListener = keyListener;
  }

  moveSelection(dx: number, dz: number) {
    if (!this.selectionMesh) return;
    
    // Mover en incrementos de 1 unidad (tamaño del cuadro)
    this.selectionMesh.position.x += dx;
    this.selectionMesh.position.z += dz;
  }

  scaleModelToDimensions(model: THREE.Group, width: number, height: number) {
    // Calcular bounding box del modelo
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    
    // Calcular escala necesaria
    const scaleX = width / size.x;
    const scaleY = height / size.y;
    const scaleZ = 1; // Mantener profundidad
    
    // Aplicar escala
    model.scale.set(scaleX, scaleY, scaleZ);
    
    // Centrar el modelo
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
  }

  addDecorationToScene(modelType: string) {
    if (!this.selectionMesh) return;
    
    // Guardar la posición antes de remover el mesh
    const targetPosition = this.selectionMesh.position.clone();
    
    // Remover el mesh de selección y cancelar
    this.cancelAddingDecoration();
    
    const modelPath = MODEL_PATHS[modelType as keyof typeof MODEL_PATHS];
    
    // Cargar un nuevo modelo para agregarlo a la escena
    this.gltfLoader.load(modelPath, (gltf) => {
      const newDecoration = gltf.scene;
      
      // Escalar el modelo a las dimensiones deseadas
      this.scaleModelToDimensions(newDecoration, DOOR_DIMENSIONS.width, DOOR_DIMENSIONS.height);
      
      // Posicionar en la ubicación guardada
      newDecoration.position.copy(targetPosition);
      newDecoration.position.y = 0; // Ajustar Y si es necesario
      newDecoration.position.z = 0.1; // Sobre la grilla
      
      this.scene.add(newDecoration);
    });
  }

  cancelAddingDecoration() {
    if (this.selectionMesh) {
      this.scene.remove(this.selectionMesh);
      this.selectionMesh = null;
    }
    
    this.isAddingDecoration = false;
    this.cubeSelectionService.setDecorationActive(false);
    document.body.classList.remove('mouse-red-cursor');
    
    // Remover listeners
    if ((this as any).decorationKeyListener) {
      window.removeEventListener('keydown', (this as any).decorationKeyListener);
    }
  }

  animate = (): void => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    
    this.renderer.render(this.scene, this.camera);
    this.updateButtonPosition();
  }

}
