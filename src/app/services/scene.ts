import { Injectable, ElementRef, ChangeDetectorRef } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AssetLoaderService } from './asset-loader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

@Injectable({
  providedIn: 'root',
})
export class SceneService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private container!: ElementRef;

  constructor(private assetLoader: AssetLoaderService) {}

  /**
   * Inicializa la escena, cámara, renderer, luces y controles
   */
  initialize(container: ElementRef, onControlsChange: () => void): void {
    this.container = container;

    // ── Renderer ──────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.container.nativeElement.appendChild(this.renderer.domElement);
    this.adjustRenderer();
    window.addEventListener('resize', () => this.adjustRenderer());

    // ── Cámara ────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.getAspectRatio(),
      0.1,
      1000
    );
    this.camera.position.z = 5;

    // ── Escena ────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    const ambientLight = new THREE.AmbientLight(0xffffff, 0);
    //this.scene.add(ambientLight);

    // ── Controles de órbita ───────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.addEventListener('change', () => onControlsChange());

    // --- LIMITAR EL ZOOM ---

// Qué tanto se puede ACERCAR (distancia mínima de la cámara al centro)
    this.controls.minDistance = 2;

// Qué tanto se puede ALEJAR (distancia máxima para que no se vea el borde de la esfera)
    this.controls.maxDistance = 60;

    // Limita que la cámara no baje más allá del horizonte (el suelo)
    this.controls.maxPolarAngle = Math.PI / 2.1; // Un poco más de 90 grados

// No olvides habilitar el damping para que el movimiento sea suave
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // ── Guías ─────────────────────────────────────────────────────────────


    // ── Texturas ──────────────────────────────────────────────────────────
    //this.initSkybox();
    this.createHDRCube();
    this.initGrass();
    this.initBorderMountains();
  }

  private initSkybox(): void {
    const rgbeLoader = new RGBELoader();

    rgbeLoader.load('textures/sky/quarry_04_puresky_1k.hdr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;

      this.scene.background = texture;
      this.scene.environment = texture;

      console.log('Cielo HDR cargado y luz de ambiente configurada.');
    });
  }



  /**
   * Inicializa la textura de pasto y el terreno
   */
  private initGrass(): void {
    const loader = new THREE.TextureLoader();

    // 1. Cargar los mapas
    const diffTex = loader.load('textures/grass/brown_mud_leaves_01_diff_1k.jpg');
    const norTex = loader.load('textures/grass/brown_mud_leaves_01_nor_gl_1k.jpg');
    const armTex = loader.load('textures/grass/brown_mud_leaves_01_arm_1k.jpg');

    // 2. Configuración de repetición (Tiling)
    [diffTex, norTex, armTex].forEach(tex => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(50, 50); // Ajusta según qué tan denso quieras el suelo
    });

    // 3. Crear el material usando el mapa ARM
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: diffTex,
      normalMap: norTex,
      aoMap: armTex,
      roughnessMap: armTex,

      // ESTO ES LO QUE HACE QUE LAS RAMAS SALGAN:
      // Si tienes el archivo de desplazamiento (displacement), úsalo aquí.
      // Si no, prueba con el mismo 'diffTex' para ver el efecto inicial.
      displacementMap: diffTex,
      displacementScale: 0.5,   // Ajusta este valor (ej: 0.3 a 0.8) hasta que las ramas salgan lo suficiente
      displacementBias: -0.1    // Ayuda a que el suelo no parezca que flota
    });

    // 4. Geometría subdividida para que se vea el relieve (aunque no uses displacement)
    const groundGeometry = new THREE.PlaneGeometry(400, 400, 256, 256);

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.name = 'suelo_pasto';

    this.scene.add(ground);
  }

  private initBorderMountains(): void {
    const loader = new THREE.TextureLoader();
    const heightMap = loader.load('textures/mountains/Rolling Hills Height Map.png');
    const textureMap = loader.load('textures/mountains/Rolling Hills Bitmap 1025.png');

    // 1. Crea un plano mucho más grande que tu suelo actual
    // Si tu suelo mide 100x100, haz este de 500x500
    const geometry = new THREE.PlaneGeometry(900, 900, 128, 128);

    const material = new THREE.MeshStandardMaterial({
      map: textureMap,
      displacementMap: heightMap,
      displacementScale: 150, // Altura moderada para no tapar todo el cielo
      roughness: 0.8
    });

    const mountains = new THREE.Mesh(geometry, material);
    mountains.rotation.x = -Math.PI / 2;

    // 2. EL TRUCO: Baja un poco el plano para que el centro sea plano
    // y las colinas solo sobresalgan en los bordes.
    mountains.position.y = -10;

    this.scene.add(mountains);
  }

  private createHDRCube(): void {
    const loader = new RGBELoader();

    // 1. Cargamos tu archivo .hdr
    loader.load('textures/sky/quarry_04_puresky_1k.hdr', (texture) => {

      // 2. Creamos la geometría del cubo (grande, para que encierre todo)
      // 1000 unidades de lado suele ser suficiente
      const geometry = new THREE.SphereGeometry(500, 60, 40);

      // 3. Creamos el material que usará el HDR
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide // IMPORTANTE: Para ver el cubo desde ADENTRO
      });

      const skyCube = new THREE.Mesh(geometry, material);
      this.scene.add(skyCube);

      // 4. OPCIONAL: Usar el mismo HDR para que BioHouse tenga luz realista
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.environment = texture;
    });
  }

  /**
   * Obtiene el material de concreto con opacidad específica
   */
  getConcreteMaterial(opacity: number): THREE.MeshStandardMaterial {
    return this.assetLoader.loadConcreteTexture(opacity);
  }

  /**
   * Ajusta el tamaño del renderer según el contenedor
   */
  private adjustRenderer(): void {
    if (!this.container) return;
    const el: HTMLElement = this.container.nativeElement;
    const w = el.clientWidth || 1200;
    const h = el.clientHeight || 700;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Obtiene el aspect ratio del contenedor
   */
  private getAspectRatio(): number {
    if (!this.container) return 16 / 9;
    const el: HTMLElement = this.container.nativeElement;
    return (el.clientWidth || 1200) / (el.clientHeight || 700);
  }

  /**
   * Actualiza la opacidad de todos los muros
   */
  updateWallsOpacity(opacity: number): void {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.userData['isMuro'] === true) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = opacity;
        mat.needsUpdate = true;
      }
    });
  }

  /**
   * Agrega un objeto a la escena
   */
  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * Remueve un objeto de la escena
   */
  remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * Obtiene todos los muros de la escena
   */
  getWalls(): THREE.Object3D[] {
    return this.scene.children.filter((obj) => obj.name === 'muro');
  }

  /**
   * Obtiene la escena THREE.js
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Obtiene la cámara
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Obtiene el renderer
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Obtiene los controles de órbita
   */
  getControls(): OrbitControls {
    return this.controls;
  }

  /**
   * Renderiza la escena
   */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Limpia recursos
   */
  dispose(): void {
    this.controls?.dispose();
    this.renderer?.dispose();

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

    window.removeEventListener('resize', () => this.adjustRenderer());
  }
}
