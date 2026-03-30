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

  constructor(private cdr: ChangeDetectorRef, private cubeSelectionService: CubeSelectionService) {}

  private subscription: Subscription = new Subscription();

  //diccionario de texturas
  public textures = TEXTURE_MAP;

  // posicion boton agregar cubo
  buttonX = 0;
  buttonY = 0;

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
      (this.selectedCube.material as THREE.MeshStandardMaterial).color.set(0xaaaaaa);
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
    const axesHelper = new THREE.AxesHelper(10);
    this.scene.add(axesHelper);
      // malla
    const gridHelper = new THREE.GridHelper(10, 10, 0xffffff, 0xffffff);
    this.scene.add(gridHelper);

    // cargue de texturas iniciales
    this.textureLoader = new THREE.TextureLoader();

    // cesped
    this.initGrass();

    //--------------------------------

    // construir cubo inicial
    this.buildCube(0,0);

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
  }

  crearBloqueDesdeSeleccion(): void {
    if (!this.selectedCube) return;

    const geometry = new THREE.BoxGeometry(1,1,1);
    const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });

    const newCube = new THREE.Mesh(geometry, material);

    newCube.position.set(
      this.selectedCube.position.x + 1,
      this.selectedCube.position.y,
      this.selectedCube.position.z
    );

    this.scene.add(newCube);
  }

  updateButtonPosition(): void {
    if (!this.selectedCube) return;

    const vector = this.selectedCube.position.clone();
    vector.y += 1;

    vector.project(this.camera);

    const rect = this.container.nativeElement.getBoundingClientRect();

    this.buttonX = (vector.x * 0.5 + 0.5) * rect.width;
    this.buttonY = (-vector.y * 0.5 + 0.5) * rect.height;

    this.cdr.detectChanges();
  }

  animate = (): void => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateButtonPosition();
  }
}
