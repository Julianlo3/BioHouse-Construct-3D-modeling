import {
  AfterViewInit,
  Component,
  ElementRef,
  ViewChild,
  ChangeDetectorRef,
  OnInit,
  OnDestroy
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TEXTURE_MAP } from '../../constants/textures/textures.constant';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { ActionsModel } from '../actions-model/actions-model';
import { CubeSelectionService } from '../../services/cube-selection.service';
import { Subscription } from 'rxjs';
import { MODEL_MAP } from '../../constants/models/models.constant';


// Constantes de rutas de modelos
const MODEL_PATHS = {
  door: '/assets/models/PuertaMadera.glb',
  window: '/assets/models/Ventana.glb',
} as const;

// Constantes de dimensiones
const DOOR_DIMENSIONS = {
  width: 3,    // 1 metro de ancho
  height: 6,   // 2 metros de largo/altura
} as const;

const WINDOW_DIMENSIONS = {
  width: 3,    // 1 metro de ancho
  height: 3,   // 1 metro de largo/altura
} as const;

@Component({
  selector: 'app-model3d',
  imports: [ActionsModel],
  templateUrl: './model3d.html',
  styleUrl: './model3d.css',
})
export class Model3d implements AfterViewInit, OnInit, OnDestroy {

  // ─── Estado general ───────────────────────────────────────────────────────
  protected numBlocks: number = 0;
  protected opacity: number = 1.0;

  /** Altura real del bloque en unidades de escena, calculada tras cargar el GLB */
  private alturaBloque: number = 1;

  /** Molde del bloque (grupo raíz del GLB) */
  moldeBloque: THREE.Object3D | null = null;

  // ─── Inyección ────────────────────────────────────────────────────────────
  constructor(
    private cdr: ChangeDetectorRef,
    private cubeSelectionService: CubeSelectionService
  ) {}

  private subscription: Subscription = new Subscription();

  // ─── Diccionarios de assets ───────────────────────────────────────────────
  public textures = TEXTURE_MAP;
  public models   = MODEL_MAP;

  // ─── Referencia al contenedor DOM ────────────────────────────────────────
  @ViewChild('modelado', { static: false })
  private container!: ElementRef;

  // ─── Variables THREE ──────────────────────────────────────────────────────
  private scene!:         THREE.Scene;
  private camera!:        THREE.PerspectiveCamera;
  private renderer!:      THREE.WebGLRenderer;
  private textureLoader!: THREE.TextureLoader;
  private controls!: OrbitControls; // Movimiento del mouse
  private raycaster!: THREE.Raycaster; // Necesario para saber que objeto se selecciona
  private mouse!: THREE.Vector2;
  private gltfLoader = new GLTFLoader(); // Para cargar modelos 3D en formato GLTF/GLB
  private numRotation = 0; // Contador de rotaciones para decoraciones

  // ─── Botones flotantes sobre el bloque seleccionado ───────────────────────
  activeButtons: {
    screenX: number;
    screenY: number;
    offsetX: number;
    offsetZ: number;
    rotateY: boolean;
    visible: boolean;
  }[] = [];

  // ─── Cubo seleccionado (referencia al GRUPO RAÍZ, no a la malla hija) ─────
  selectedCube: THREE.Object3D | null = null;

  // =========================================================================
  // CICLO DE VIDA
  // =========================================================================

  // Mesh de selección para decoraciones (cuadro verde)
  private selectionMesh: THREE.Mesh | null = null;
  private decorationTargetPosition: THREE.Vector3 | null = null;
  private isAddingDecoration: boolean = false;

  //Suscripcion al canel de comunicacion con los botones
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
      this.cubeSelectionService.addDecoration$.subscribe((decorationType: string) => {
        this.startAddingDecoration(decorationType);
      })
    );
  }

  //Cancelar suscripcion
  ngOnDestroy(): void {
    this.subscription.unsubscribe();

    // FIX #8 — Limpieza para evitar memory leaks
    this.controls?.dispose();
    this.renderer?.dispose();

    // Liberar geometrías y materiales de la escena
    this.scene?.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    this.cargarModeloGLB();
    this.initThree();
    this.animate();
  }

  // =========================================================================
  // INICIALIZACIÓN DE THREE.JS
  // =========================================================================

  initThree(): void {
    // ── Renderer ──────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.container.nativeElement.appendChild(this.renderer.domElement);

    this.ajustarRenderer();
    window.addEventListener('resize', () => this.ajustarRenderer());

    // ── Cámara ────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(75, this.getAspectRatio(), 0.1, 1000);
    this.camera.position.z = 5;

    // ── Escena ────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    const ambientLight = new THREE.AmbientLight(0xffffff, 4);
    this.scene.add(ambientLight);

    // ── Controles de órbita ───────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.controls.addEventListener('change', () => this.updateButtonPosition());

    // ── Guías ─────────────────────────────────────────────────────────────
    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.position.set(-0.2, 0, -1.5);
    this.scene.add(axesHelper);
    const gridHelper = new THREE.GridHelper(100, 100, 0xffffff, 0xffffff);
    gridHelper.position.set(0.2, 0, 1.5);
    this.scene.add(gridHelper);

    // ── Texturas ──────────────────────────────────────────────────────────
    this.textureLoader = new THREE.TextureLoader();
    this.initGrass();

    // ── Raycaster & selección por click ───────────────────────────────────
    this.mouse    = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    // Listener para movimiento del mouse (para actualizar posición del ghost preview)
    this.renderer.domElement.addEventListener('mousemove', (event: MouseEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    });

    this.renderer.domElement.addEventListener('click', (event: MouseEvent) => {
      if (!this.cubeSelectionService.isRaycasterActive()) {
        // Deseleccionar el cubo si está seleccionado
        if (this.selectedCube) {
          this.selectedCube.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              (obj.material as THREE.MeshStandardMaterial).color.set(0xffffff);
            }
          });
          this.selectedCube = null;
          this.cdr.detectChanges();
        }
        return;
      }

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left)  / rect.width)  *  2 - 1;
      this.mouse.y = ((event.clientY - rect.top)   / rect.height) * -2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      const cubeHit = intersects.find(
        (obj) => obj.object.userData['isMuro'] === true
      );

      if (cubeHit) {
        const selectedGroup = this.obtenerGrupoRaiz(cubeHit.object);
        this.selectCube(selectedGroup);

        if (this.isAddingDecoration && this.cubeSelectionService.isRaycasterActive()) {
          // Actualizar posición cuando se selecciona un cubo durante la decoración
          this.decorationTargetPosition = selectedGroup.position.clone();
          if (this.selectionMesh) {
            this.selectionMesh.position.copy(this.decorationTargetPosition);
          }
        }
      }
    });
  }

  // =========================================================================
  // HELPERS DE CONFIGURACIÓN
  // =========================================================================

  /** Devuelve el ancestor cuyo name === 'muro', o el propio objeto si no lo encuentra */
  private obtenerGrupoRaiz(objeto: THREE.Object3D): THREE.Object3D {
    let current = objeto;
    while (current.parent && current.name !== 'muro') {
      current = current.parent;
    }
    return current;
  }

  /** Ajusta renderer y cámara al tamaño real del contenedor */
  private ajustarRenderer(): void {
    if (!this.container) return;
    const el: HTMLElement = this.container.nativeElement;
    const w = el.clientWidth  || 1200;
    const h = el.clientHeight || 700;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  private getAspectRatio(): number {
    if (!this.container) return 16 / 9;
    const el: HTMLElement = this.container.nativeElement;
    return (el.clientWidth || 1200) / (el.clientHeight || 700);
  }

  // =========================================================================
  // TEXTURAS Y MATERIALES
  // =========================================================================

  initGrass(): void {
    const grassTexture = this.textureLoader.load(this.textures.grass.default);
    grassTexture.wrapS        = THREE.RepeatWrapping;
    grassTexture.wrapT        = THREE.RepeatWrapping;
    grassTexture.repeat.set(20, 20);
    grassTexture.anisotropy   = this.renderer.capabilities.getMaxAnisotropy();
    grassTexture.colorSpace   = THREE.SRGBColorSpace;

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({ map: grassTexture })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);
  }

  initConcrete(): THREE.MeshStandardMaterial {
    const baseColor = this.textureLoader.load(this.textures.concreteDetail.color);
    const normalMap = this.textureLoader.load(this.textures.concreteDetail.gl);
    const roughnessMap = this.textureLoader.load(this.textures.concreteDetail.roughness);
    const aoMap = this.textureLoader.load(this.textures.concreteDetail.ambientOcc);

    const material = new THREE.MeshStandardMaterial({
      map: baseColor,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
      aoMap: aoMap,
      transparent: true,
      opacity: this.opacity,
      // Ajustes opcionales para realismo:
      roughness: 1, // 1 es totalmente mate (concreto)
      metalness: 0  // 0 porque no es metal
    });

    return material;
  }

  cambiarOpacidad(event: Event): void {
    const input   = event.target as HTMLInputElement;
    this.opacity  = parseFloat(input.value);

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData['isMuro'] === true) {
        const mat         = obj.material as THREE.MeshStandardMaterial;
        mat.transparent   = true;
        mat.opacity       = this.opacity;
        mat.needsUpdate   = true;
      }
    });
  }

  // =========================================================================
  // CONSTRUCCIÓN DE BLOQUES
  // =========================================================================

  /**
   * Clona el molde y le aplica la configuración estándar de muro.
   * Centraliza nombre, userData y opacidad actualizada.
   */
  private clonarMuro(): THREE.Object3D {
    const clone = this.moldeBloque!.clone();
    clone.name  = 'muro'; // FIX #1 y #4 — nombre siempre asignado

    // FIX #6 — aplicar opacidad actual al clonar (no la del momento de carga)
    clone.traverse((hijo) => {
      if (hijo instanceof THREE.Mesh) {
        const mat           = (hijo.material as THREE.MeshStandardMaterial).clone();
        mat.transparent     = true;
        mat.opacity         = this.opacity;
        mat.needsUpdate     = true;
        hijo.material       = mat;
        hijo.castShadow     = true;
        hijo.receiveShadow  = true;
        hijo.userData['isMuro'] = true;
      }
    });

    return clone;
  }

  buildCube(x: number, z: number): void {
    if (!this.moldeBloque) return;

    const cube = this.clonarMuro(); // FIX #1 — ahora tiene name = 'muro'
    cube.position.set(x, 0, z);
    this.scene.add(cube);
    this.numBlocks++;
  }

  crearBloqueDesdeSeleccion(offsetX: number, offsetZ: number, rotateY: boolean): void {
    if (!this.selectedCube || !this.moldeBloque) return;

    const newCube = this.clonarMuro(); // FIX #4 — ahora tiene name = 'muro'

    if (rotateY) newCube.rotation.y = Math.PI / 2;

    // FIX #2 — selectedCube ya es el grupo raíz, su position es correcta
    newCube.position.set(
      this.selectedCube.position.x + offsetX,
      this.selectedCube.position.y,
      this.selectedCube.position.z + offsetZ
    );

    this.scene.add(newCube);
    this.numBlocks++;
    this.updateButtonPosition();
  }

  construirMuros(): void {
    const input = window.prompt(
      '¿Cuántos bloques (metros) hacia arriba quieres construir?',
      '1'
    );
    if (input === null) return;

    const niveles = parseInt(input, 10);
    if (isNaN(niveles) || niveles <= 0) {
      window.alert('Por favor, ingresa un número válido mayor a 0.');
      return;
    }

    for (let i = 0; i < niveles; i++) {
      this.levantarUnPiso();
    }

    this.updateButtonPosition();
  }

  levantarUnPiso(): void {
    if (!this.moldeBloque) return;

    const bloquesActuales = this.scene.children.filter(
      (obj) => obj.name === 'muro'
    );

    const nuevosMuros: THREE.Object3D[] = [];

    bloquesActuales.forEach((bloque) => {
      // FIX #3 — usamos this.alturaBloque calculado desde el bounding box real,
      //          no el valor hardcodeado 1
      const existeArriba = bloquesActuales.some(
        (b) =>
          Math.abs(b.position.x - bloque.position.x)                      < 0.1 &&
          Math.abs(b.position.z - bloque.position.z)                      < 0.1 &&
          Math.abs(b.position.y - (bloque.position.y + this.alturaBloque)) < 0.1
      );

      if (!existeArriba) {
        const nuevoMuro = this.clonarMuro();
        nuevoMuro.position.copy(bloque.position);
        nuevoMuro.rotation.copy(bloque.rotation);
        nuevoMuro.position.y += this.alturaBloque; // FIX #3
        nuevosMuros.push(nuevoMuro);
      }
    });

    nuevosMuros.forEach((muro) => this.scene.add(muro));
    this.numBlocks += nuevosMuros.length;
  }

  // =========================================================================
  // SELECCIÓN DE BLOQUES
  // =========================================================================

  selectCube(grupo: THREE.Object3D): void {
    // Quitar highlight al anterior
    if (this.selectedCube) {
      this.selectedCube.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          (obj.material as THREE.MeshStandardMaterial).color.set(0xffffff);
        }
      });
    }

    // FIX #2 — recibimos el grupo raíz, no la malla hija
    this.selectedCube = grupo;

    // Aplicar highlight al nuevo seleccionado
    grupo.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const mat = (obj.material as THREE.MeshStandardMaterial).clone();
        mat.color.set(0xff0000);
        obj.material = mat;
      }
    });

    this.updateButtonPosition();
    this.cdr.detectChanges();
  }

  // =========================================================================
  // BOTONES FLOTANTES
  // =========================================================================
  updateButtonPosition(): void {
    if (!this.selectedCube) {
      this.activeButtons = [];
      this.cdr.detectChanges();
      return;
    }

    const pos       = this.selectedCube.position;
    const isRotated = Math.abs(this.selectedCube.rotation.y) > 0.1;

    const L = 3.0;   // Largo total
    const W = 0.4;   // Ancho total
    const halfL = L / 2; // 1.5
    const halfW = W / 2; // 0.2

    // Offsets calculados para que las caras se toquen perfectamente
    const offEsquinaX = halfL + halfW; // 1.7
    const offEsquinaZ = halfL - halfW; // 1.3

    // separacion botones
    const separacionX = 0.5;
    const separacionZ = 0.5;

    let buttonConfigs: any[] = [];

    if (!isRotated) {
      // ── Bloque orientado en Z (Recto) ──
      buttonConfigs = [
        // Continuar recto (Z)
        { offsetX: 0, offsetZ: L, rotateY: false, btnPos: new THREE.Vector3(pos.x, pos.y, pos.z + halfL + separacionZ) },
        { offsetX: 0, offsetZ: -L, rotateY: false, btnPos: new THREE.Vector3(pos.x, pos.y, pos.z - halfL - separacionZ) },

        // Esquinas Derechas (X+)
        { offsetX: offEsquinaX, offsetZ: offEsquinaZ, rotateY: true, btnPos: new THREE.Vector3(pos.x + halfW + separacionX, pos.y, pos.z + halfL) },
        { offsetX: offEsquinaX, offsetZ: -offEsquinaZ, rotateY: true, btnPos: new THREE.Vector3(pos.x + halfW + separacionX, pos.y, pos.z - halfL) },

        // Esquinas Izquierdas (X-)
        { offsetX: -offEsquinaX, offsetZ: offEsquinaZ, rotateY: true, btnPos: new THREE.Vector3(pos.x - halfW - separacionX, pos.y, pos.z + halfL) },
        { offsetX: -offEsquinaX, offsetZ: -offEsquinaZ, rotateY: true, btnPos: new THREE.Vector3(pos.x - halfW - separacionX, pos.y, pos.z - halfL) },
      ];
    } else {
      // ── Bloque orientado en X (Rotado) ──
      buttonConfigs = [
        // Continuar recto (X)
        { offsetX: L, offsetZ: 0, rotateY: true, btnPos: new THREE.Vector3(pos.x + halfL + separacionX, pos.y, pos.z) },
        { offsetX: -L, offsetZ: 0, rotateY: true, btnPos: new THREE.Vector3(pos.x - halfL - separacionZ, pos.y, pos.z) },

        // Esquinas Frontales (Z+)
        { offsetX: offEsquinaZ, offsetZ: offEsquinaX, rotateY: false, btnPos: new THREE.Vector3(pos.x + halfL, pos.y, pos.z + halfW + separacionZ) },
        { offsetX: -offEsquinaZ, offsetZ: offEsquinaX, rotateY: false, btnPos: new THREE.Vector3(pos.x - halfL, pos.y, pos.z + halfW + separacionZ) },

        // Esquinas Traseras (Z-)
        { offsetX: offEsquinaZ, offsetZ: -offEsquinaX, rotateY: false, btnPos: new THREE.Vector3(pos.x + halfL, pos.y, pos.z - halfW - separacionZ) },
        { offsetX: -offEsquinaZ, offsetZ: -offEsquinaX, rotateY: false, btnPos: new THREE.Vector3(pos.x - halfL, pos.y, pos.z - halfW - separacionZ) },
      ];
    }

    // --- PROYECCIÓN A PANTALLA ---
    const width  = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;

    this.activeButtons = buttonConfigs.map((config) => {
      const vector = config.btnPos.clone();
      vector.project(this.camera);
      return {
        screenX: (vector.x * 0.5 + 0.5) * width,
        screenY: (vector.y * -0.5 + 0.5) * height,
        offsetX: config.offsetX,
        offsetZ: config.offsetZ,
        rotateY: config.rotateY,
        visible: vector.z < 1,
      };
    });

    this.cdr.detectChanges();
  }

  // =========================================================================
  // CARGA DEL MODELO GLB
  // =========================================================================

  cargarModeloGLB(): void {
    const loader = new GLTFLoader();

    loader.load(
      this.models.blockMM,
      (gltf) => {
        const modeloOriginal = gltf.scene;

        // 1. Medimos el modelo tal cual viene
        const box = new THREE.Box3().setFromObject(modeloOriginal);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        // 2. Calculamos la escala para que el largo sea 3
        const largoObjetivo = 3;
        const maxDim = Math.max(size.x, size.z); // Usamos X o Z para el largo, no Y
        const escalaGral = largoObjetivo / maxDim;

        // 3. ✨ EL TRUCO: Creamos un contenedor "limpio"
        const contenedor = new THREE.Group();
        contenedor.name = 'muro';

        // 4. Aplicamos la corrección al modelo pero lo metemos al contenedor
        modeloOriginal.scale.set(escalaGral, escalaGral, escalaGral);

        // Centramos el modelo DENTRO del contenedor
        modeloOriginal.position.x = -center.x * escalaGral;
        modeloOriginal.position.z = -center.z * escalaGral;
        modeloOriginal.position.y = -box.min.y * escalaGral; // La base queda en 0 del contenedor

        contenedor.add(modeloOriginal);

        // Guardamos el CONTENEDOR como nuestro molde
        this.moldeBloque = contenedor;

        // 5. Material y sombras (ahora sobre el contenedor)
        const materialConcreto = this.initConcrete();
        this.moldeBloque.traverse((hijo) => {
          if (hijo instanceof THREE.Mesh) {
            hijo.material = materialConcreto;
            hijo.castShadow = true;
            hijo.receiveShadow = true;
            hijo.userData['isMuro'] = true;
          }
        });

        // 6. Ahora las coordenadas 0,0 en buildCube serán el centro real del bloque
        console.log('Modelo Normalizado y Encapsulado.');

        // Prueba con (0,0) y verás que queda perfecto en el centro del eje
        this.buildCube(0, 0);
      },
      undefined,
      (error) => console.error('Error al cargar el modelo:', error)
    );
  }


  async startAddingDecoration(modelType: string) {
    this.isAddingDecoration = true;
    this.activeButtons = [];
    this.cubeSelectionService.setDecorationActive(true);

    if (this.selectedCube) {
      this.decorationTargetPosition = this.selectedCube.position.clone();
    } else {
      this.decorationTargetPosition = null;
    }

    // Crear mesh de selección (cuadro verde de 1x1)
    const geometry = new THREE.PlaneGeometry(3, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
    this.selectionMesh = new THREE.Mesh(geometry, material);
    this.selectionMesh.rotation.x = -Math.PI / 2; // Horizontal

    if (this.decorationTargetPosition) {
      this.selectionMesh.position.copy(this.decorationTargetPosition);
    } else {
      this.selectionMesh.position.set(0.5, 0.05, 0.5); // Posición inicial en el centro de un cuadro de la grilla
    }

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
      } else if (event.key === 'q' || event.key === 'Q') {
        if (this.selectionMesh) {
          this.numRotation++;
          this.selectionMesh.rotateZ(Math.PI / 2);
        }
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
    // Calcular bounding box del modelo antes de escalar
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    // Calcular escala necesaria
    const scaleX = width / size.x;
    const scaleY = height / size.y;
    const scaleZ = 1; // Mantener profundidad

    // Aplicar escala
    model.scale.set(scaleX, scaleY, scaleZ);
    model.updateMatrixWorld(true);

    // Recálcular el centro con la escala aplicada y centrar el modelo
    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    model.position.sub(scaledCenter);
  }

  addDecorationToScene(modelType: string) {
    if (!this.selectionMesh) return;
    this.cubeSelectionService.setRaycasterActive(false);

    // Guardar la posición y rotación antes de remover el mesh
    const targetPosition = this.selectionMesh.position.clone();
    const targetRotation = this.selectionMesh.rotation.clone();

    // Remover el mesh de selección y cancelar
    this.cancelAddingDecoration();

    const modelPath = MODEL_PATHS[modelType as keyof typeof MODEL_PATHS];

    // Cargar un nuevo modelo para agregarlo a la escena
    this.gltfLoader.load(modelPath, (gltf) => {
      const newDecoration = gltf.scene;

      // Seleccionar dimensiones según el tipo de decoración
      let dimensions = modelType === 'door' ? DOOR_DIMENSIONS : WINDOW_DIMENSIONS;


      // Escalar el modelo a las dimensiones deseadas
      this.scaleModelToDimensions(newDecoration, dimensions.width, dimensions.height);

      // Posicionar en la ubicación guardada (con altura igual al cubo seleccionado)
      newDecoration.position.set(
        targetPosition.x,
        this.selectedCube ? this.selectedCube.position.y : targetPosition.y,
        targetPosition.z
      );

      // Eliminar cubos que se solapan con la decoración
      if (this.selectedCube) {
        const decorationHeight = dimensions.height;
        const baseY = this.selectedCube.position.y;
        const cubosTieneQueBorrados = this.scene.children.filter((obj) => {
          if (obj.name === 'muro') {
            // Verificar si está en la misma posición X, Z (con mayor tolerancia)
            const sameX = Math.abs(obj.position.x - this.selectedCube!.position.x) < 0.75;
            const sameZ = Math.abs(obj.position.z - this.selectedCube!.position.z) < 0.75;

            // Verificar si está ARRIBA del cubo seleccionado (eje Y)
            const isAbove = obj.position.y >= baseY;

            // Verificar si está dentro de la altura de la decoración
            const isWithinDecorationHeight = obj.position.y < baseY + decorationHeight;

            return sameX && sameZ && isAbove && isWithinDecorationHeight;
          }
          return false;
        });

        // Remover los cubos de la escena
        cubosTieneQueBorrados.forEach((cubo) => {
          this.scene.remove(cubo);
          this.numBlocks--;
        });
      }

      if (modelType === 'window') {
        newDecoration.position.y -= 2;
        newDecoration.position.z -= 1;
        if(!(this.numRotation%2 === 0)){
          newDecoration.position.z += 0.5;
        }else{
        newDecoration.position.x -= 0.5;
        }
      }

      if (modelType === 'door') {
          if (!(this.numRotation % 2 === 0)) {
            newDecoration.position.x += 1;
          } else {
            newDecoration.position.z += 0.7;
          }
      }

      if (!(this.numRotation % 2 === 0)){

        this.numRotation = 0;
        // Copiar solo la rotación en Z del preview
        newDecoration.rotation.z = Math.PI / 2;

        // Aplicar rotación en Y para levantarlo
        newDecoration.rotation.y = Math.PI / 2;

        // Aplicar rotación en X para que quede vertical
        newDecoration.rotation.x = -Math.PI / 2;
      }

      this.scene.add(newDecoration);
    });
    this.cubeSelectionService.setRaycasterActive(false);
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

  // =========================================================================
  // LOOP DE ANIMACIÓN
  // =========================================================================

  animate = (): void => {
    requestAnimationFrame(this.animate);
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  };
}
