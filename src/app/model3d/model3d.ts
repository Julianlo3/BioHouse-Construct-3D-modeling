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
import { TEXTURE_MAP } from '../constants/textures/textures.constant';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { ActionsModel } from '../actions-model/actions-model';
import { CubeSelectionService } from '../services/cube-selection.service';
import { Subscription } from 'rxjs';
import { MODEL_MAP } from '../constants/models/models.constant';

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
  private controls!:      OrbitControls;
  private raycaster!:     THREE.Raycaster;
  private mouse!:         THREE.Vector2;

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

  ngOnInit(): void {
    this.subscription.add(
      this.cubeSelectionService.selectCube$.subscribe(() => {
        this.cubeSelectionService.setRaycasterActive(true);
      })
    );
  }

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

    // FIX #7 — Tamaño del renderer basado en el contenedor real, no hardcodeado
    this.ajustarRenderer();
    window.addEventListener('resize', () => this.ajustarRenderer());

    // ── Cámara ────────────────────────────────────────────────────────────
    // FIX #7 — aspect ratio calculado en ajustarRenderer()
    this.camera = new THREE.PerspectiveCamera(75, this.getAspectRatio(), 0.1, 1000);
    this.camera.position.z = 5;

    // ── Escena ────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    this.scene.add(ambientLight);

    // ── Controles de órbita ───────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // FIX #5 — updateButtonPosition sólo se ejecuta cuando la cámara se mueve,
    //          NO en cada frame del animate().
    this.controls.addEventListener('change', () => this.updateButtonPosition());

    // ── Guías ─────────────────────────────────────────────────────────────
    this.scene.add(new THREE.AxesHelper(20));
    this.scene.add(new THREE.GridHelper(100, 100, 0xffffff, 0xffffff));

    // ── Texturas ──────────────────────────────────────────────────────────
    this.textureLoader = new THREE.TextureLoader();
    this.initGrass();

    // ── Raycaster & selección por click ───────────────────────────────────
    this.mouse    = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.renderer.domElement.addEventListener('click', (event: MouseEvent) => {
      if (!this.cubeSelectionService.isRaycasterActive()) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left)  / rect.width)  *  2 - 1;
      this.mouse.y = ((event.clientY - rect.top)   / rect.height) * -2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.scene.children, true);

      const cubeHit = intersects.find(
        (obj) => obj.object.userData['isMuro'] === true
      );

      if (cubeHit) {
        // FIX #2 — Subimos al grupo raíz (name === 'muro') en vez de usar la malla hija
        this.selectCube(this.obtenerGrupoRaiz(cubeHit.object));
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
    const concreteTexture = this.textureLoader.load(this.textures.concrete.default);
    concreteTexture.wrapS = THREE.RepeatWrapping;
    concreteTexture.wrapT = THREE.RepeatWrapping;
    concreteTexture.repeat.set(1, 1);

    return new THREE.MeshStandardMaterial({
      map:         concreteTexture,
      transparent: true,
      opacity:     this.opacity,
    });
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



    // Dimensiones reales del bloque (de la consola)
    const halfX = 0.20;  // Mitad del ancho  (0.40 / 2)
    const halfZ = 1.50;  // Mitad del largo  (3.00 / 2)

    // Offset para esquina = halfX + halfZ (los dos semilados se tocan)
    const esquinaLateral = 2.32; // 1.70
    const esquinaFrontal = 1.96; // 1.30
    const posButtonTop = 0.65;

    let buttonConfigs: {
      offsetX: number;
      offsetZ: number;
      rotateY: boolean;
      btnPos:  THREE.Vector3;
    }[];

    if (!isRotated) {
      // Bloque orientado en Z (largo hacia adelante/atrás)
      buttonConfigs = [
        // ── Continuar recto ──────────────────────────────────────────────
        {
          offsetX: 0, offsetZ: 3.0, rotateY: false,
          btnPos: new THREE.Vector3(pos.x + posButtonTop , pos.y, pos.z + halfZ )
        },
        {
          offsetX: 0, offsetZ: -3.0, rotateY: false,
          btnPos: new THREE.Vector3(pos.x + posButtonTop , pos.y, pos.z - halfZ -1 )
        },
        // ── Esquinas derechas (punta delantera y trasera) ─────────────────
        {
          offsetX: 2.32 , offsetZ: 1.96, rotateY: true,
          btnPos: new THREE.Vector3(pos.x + 1.5, pos.y, pos.z +1)
        },
        {
          offsetX: esquinaLateral, offsetZ: -1.44, rotateY: true,
          btnPos: new THREE.Vector3(pos.x + 1.5 , pos.y, pos.z - 1.8)
        },
        // ── Esquinas izquierdas (punta delantera y trasera) ───────────────
        {
          offsetX: -0.28, offsetZ: esquinaFrontal, rotateY: true,
          btnPos: new THREE.Vector3(pos.x , pos.y, pos.z + 1)
        },
        {
          offsetX: -0.28, offsetZ: -1.44, rotateY: true,
          btnPos: new THREE.Vector3(pos.x , pos.y, pos.z - 1.8)
        },
      ];
    } else {
      // Bloque rotado 90° (largo hacia izquierda/derecha, en X)
      buttonConfigs = [
        // ── Continuar recto ──────────────────────────────────────────────
        {
          offsetX: 3.0, offsetZ: 0, rotateY: true,
          btnPos: new THREE.Vector3(pos.x + halfZ + halfZ, pos.y, pos.z)
        },
        {
          offsetX: -3.0, offsetZ: 0, rotateY: true,
          btnPos: new THREE.Vector3(pos.x - halfZ - halfZ, pos.y, pos.z)
        },
        // ── Esquinas frontales (punta derecha e izquierda) ────────────────
        {
          offsetX: 0.28, offsetZ: 1.44, rotateY: false,
          btnPos: new THREE.Vector3(pos.x + esquinaFrontal, pos.y, pos.z + esquinaLateral)
        },
        {
          offsetX: -2.32, offsetZ: 1.44, rotateY: false,
          btnPos: new THREE.Vector3(pos.x - esquinaFrontal, pos.y, pos.z + esquinaLateral)
        },
        // ── Esquinas traseras (punta derecha e izquierda) ─────────────────
        {
          offsetX: 0.28, offsetZ: -1.96, rotateY: false,
          btnPos: new THREE.Vector3(pos.x + esquinaFrontal, pos.y, pos.z - esquinaLateral)
        },
        {
          offsetX: -2.32, offsetZ: -1.96, rotateY: false,
          btnPos: new THREE.Vector3(pos.x - esquinaFrontal, pos.y, pos.z - esquinaLateral)
        },
      ];
    }

    const width  = this.renderer.domElement.clientWidth;
    const height = this.renderer.domElement.clientHeight;

    this.activeButtons = buttonConfigs.map((config) => {
      const vector = config.btnPos.clone();
      vector.project(this.camera);
      return {
        screenX: (vector.x *  0.5 + 0.5) * width,
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
      this.models.block,
      (gltf) => {
        this.moldeBloque = gltf.scene;
        this.moldeBloque.scale.set(40, 40, 40);

        this.moldeBloque.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(this.moldeBloque);
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        box.getCenter(center);
        console.log('Tamaño X:', size.x, '| Y:', size.y, '| Z:', size.z);
        console.log('Centro X:', center.x, '| Y:', center.y, '| Z:', center.z);


        const materialConcreto = this.initConcrete();

        this.moldeBloque.traverse((hijo) => {
          if (hijo instanceof THREE.Mesh) {
            hijo.material              = materialConcreto;
            hijo.castShadow            = true;
            hijo.receiveShadow         = true;
            hijo.userData['isMuro']    = true;
          }
        });

        this.moldeBloque.name = 'muro';

        this.alturaBloque = box.max.y - box.min.y;
        console.log(`Altura real del bloque: ${this.alturaBloque}`);

        console.log('Modelo GLB cargado y listo.');
        this.buildCube(-0.44, 1.88);
      },
      undefined,
      (error) => console.error('Error al cargar el modelo:', error)
    );
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
