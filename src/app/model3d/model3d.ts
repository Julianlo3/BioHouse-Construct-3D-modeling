import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as THREE from "three";
import { OrbitControls }  from "three/examples/jsm/controls/OrbitControls.js";
import { ActionsModel } from '../actions-model/actions-model';

@Component({
  selector: 'app-model3d',
  imports: [ActionsModel],
  templateUrl: './model3d.html',
  styleUrl: './model3d.css',
})
export class Model3d implements AfterViewInit {
  @ViewChild('modelado', { static: false })
  private container!: ElementRef;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private textureLoader!: THREE.TextureLoader;
  private controls!: OrbitControls;



  ngAfterViewInit(): void {
    this.initThree();
    this.animate();
  }

  initThree(){
    const fov = 75;
    const aspectRatio = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 1000;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(fov, aspectRatio, near, far);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setSize(1500, 1500);
    this.container.nativeElement.appendChild(this.renderer.domElement);

    this.textureLoader = new THREE.TextureLoader();
    const grassTexture = this.textureLoader.load("textures/grass.jpg");
    const concreteTexture = this.textureLoader.load("textures/concrete.jpg");

    concreteTexture.wrapS = THREE.RepeatWrapping;
    concreteTexture.wrapT = THREE.RepeatWrapping;

    concreteTexture.repeat.set(1, 1);

    const geometry = new THREE.BoxGeometry(1, 1, 5);

    const material = new THREE.MeshStandardMaterial({
      map: concreteTexture
    });
    const cube = new THREE.Mesh(geometry, material);

    cube.position.set(0, 0.5, 0);

    this.scene.add(cube);

    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;

    grassTexture.repeat.set(20, 20);

    grassTexture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);


    const groundGeometry = new THREE.PlaneGeometry(100, 100);

    const groundMaterial = new THREE.MeshStandardMaterial({
      map: grassTexture
    });

    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;

    this.scene.add(ground);

    grassTexture.colorSpace = THREE.SRGBColorSpace;

    const gridHelper = new THREE.GridHelper(200, 150, 0xff0000, 0x444444)
    this.scene.add(gridHelper);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    const boton = document.getElementById("crearBloque");

    boton?.addEventListener("click", () => {

      let x = document.getElementById("xblock") as HTMLInputElement;
      let z = document.getElementById("zblock") as HTMLInputElement;

      let xnumber = Number(x.value);
      let znumber = Number(z.value);

      const geometry = new THREE.BoxGeometry(1,1,5);
      const material = new THREE.MeshStandardMaterial({color: 0xaaaaaa});

      const cube = new THREE.Mesh(geometry, material);

      cube.position.set(xnumber,0.5,znumber);

      this.scene.add(cube);

    } )
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene,this.camera);
  }
}
