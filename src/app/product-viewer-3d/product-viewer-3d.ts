import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Component({
  selector: 'app-product-viewer-3d',
  standalone: true,
  template: '<div class="viewer" #viewer aria-label="Vista 3D del producto"></div>',
})
export class ProductViewer3d implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) modelUrl = '';
  @Input() alt = 'Modelo 3D del producto';

  @ViewChild('viewer', { static: true }) private viewerRef!: ElementRef<HTMLDivElement>;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private model?: THREE.Object3D;
  private dracoLoader?: DRACOLoader;
  private frameId = 0;
  private resizeObserver?: ResizeObserver;
  private initialized = false;

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    this.initialized = true;
    this.initScene();
    this.loadModel();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.initialized && changes['modelUrl']) {
      this.loadModel();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.disposeModel();
    this.renderer?.dispose();
  }

  private initScene(): void {
    const host = this.viewerRef.nativeElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf4f4f5);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    this.camera.position.set(0, 0.4, 4.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xffffff, 0x777777, 2.2);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3, 4, 5);
    keyLight.castShadow = true;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffd8cf, 1.1);
    fillLight.position.set(-4, 2, 3);
    this.scene.add(fillLight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = true;
    this.controls.enableZoom = false;
    this.controls.rotateSpeed = 0.7;
    this.controls.minPolarAngle = Math.PI * 0.2;
    this.controls.maxPolarAngle = Math.PI * 0.78;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();

    this.zone.runOutsideAngular(() => this.animate());
  }

  private loadModel(): void {
    if (!this.modelUrl || !this.scene) return;

    this.disposeModel();

    const loader = new GLTFLoader();
    this.dracoLoader ??= new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(this.dracoLoader);
    loader.load(
      this.modelUrl,
      (gltf) => {
        if (!this.scene) return;
        this.model = gltf.scene;
        this.prepareModel(this.model);
        this.scene.add(this.model);
        this.frameModel(this.model);
      },
      undefined,
      () => {
        this.showFallbackShape();
      },
    );
  }

  private prepareModel(model: THREE.Object3D): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  private frameModel(model: THREE.Object3D): void {
    if (!this.camera || !this.controls) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.6 / maxSize;

    model.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    model.position.sub(scaledCenter);
    model.position.y -= 0.08;

    this.camera.position.set(0, 0.35, 4.4);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private showFallbackShape(): void {
    if (!this.scene) return;

    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0xff675f, roughness: 0.72 });
    const geometry = new THREE.SphereGeometry(0.8, 32, 32);
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    this.model = group;
    this.scene.add(group);
  }

  private resize(): void {
    if (!this.camera || !this.renderer) return;

    const host = this.viewerRef.nativeElement;
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private animate(): void {
    this.frameId = requestAnimationFrame(() => this.animate());
    this.controls?.update();
    if (this.scene && this.camera && this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private disposeModel(): void {
    if (!this.model || !this.scene) return;

    this.scene.remove(this.model);
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.model = undefined;
  }
}