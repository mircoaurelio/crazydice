import * as THREE from 'three';
import type { WebGLRenderer } from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import gsap from 'gsap';
import { createFloorTexture } from './PhysicsWorld';
import { createBossFloorMaterial, BOSS_FLOOR_UNIFORMS } from './BossFloorShader';

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  private readonly css2DRenderer: CSS2DRenderer;
  private readonly floorMesh: THREE.Mesh;
  private readonly floorMatNormal: THREE.MeshStandardMaterial;
  private readonly floorMatBoss: THREE.ShaderMaterial;
  private bossFloorActive = false;

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xf5f6fa, 0.02);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 10, 14);
    this.camera.lookAt(0, -2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.css2DRenderer = new CSS2DRenderer();
    this.css2DRenderer.setSize(window.innerWidth, window.innerHeight);
    this.css2DRenderer.domElement.style.position = 'absolute';
    this.css2DRenderer.domElement.style.top = '0';
    this.css2DRenderer.domElement.style.left = '0';
    this.css2DRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.css2DRenderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    // Widen shadow camera frustum to prevent clipping (dice play area ~-10 to 10 x/z, 0–25 y)
    const shadowCam = dirLight.shadow.camera;
    shadowCam.left = -25;
    shadowCam.right = 25;
    shadowCam.top = 25;
    shadowCam.bottom = -25;
    shadowCam.near = 0.5;
    shadowCam.far = 60;
    dirLight.shadow.bias = -0.0001;
    this.scene.add(dirLight);

    const floorGeo = new THREE.PlaneGeometry(100, 100);
    this.floorMatNormal = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: createFloorTexture(this.renderer),
      roughness: 0.9,
      metalness: 0.05,
    });
    this.floorMatBoss = createBossFloorMaterial();
    this.floorMesh = new THREE.Mesh(floorGeo, this.floorMatNormal);
    this.floorMesh.rotation.x = -Math.PI / 2;
    this.floorMesh.receiveShadow = true;
    this.scene.add(this.floorMesh);
  }

  /** Switch floor to boss shader (true) or normal (false). */
  setBossFloor(active: boolean): void {
    if (this.bossFloorActive === active) return;
    this.bossFloorActive = active;
    this.floorMesh.material = active ? this.floorMatBoss : this.floorMatNormal;
    this.floorMesh.receiveShadow = !active;
  }

  /** Update boss floor shader time (call each frame when boss round). */
  updateBossFloorTime(t: number): void {
    if (this.bossFloorActive && BOSS_FLOOR_UNIFORMS.uTime) {
      BOSS_FLOOR_UNIFORMS.uTime.value = t;
    }
  }

  add(mesh: THREE.Object3D): void {
    this.scene.add(mesh);
  }

  remove(mesh: THREE.Object3D): void {
    this.scene.remove(mesh);
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.css2DRenderer.setSize(w, h);
  }

  /** Visible play area on the floor (y=0) from the current viewport. Margin shrinks bounds slightly. */
  getViewportBoundsOnFloor(margin = 0.5): { minX: number; maxX: number; minZ: number; maxZ: number } {
    const camPos = new THREE.Vector3().setFromMatrixPosition(this.camera.matrixWorld);
    const ndcCorners = [
      new THREE.Vector3(-1, -1, 0.5),
      new THREE.Vector3(1, -1, 0.5),
      new THREE.Vector3(1, 1, 0.5),
      new THREE.Vector3(-1, 1, 0.5),
    ];
    const point = new THREE.Vector3();
    const direction = new THREE.Vector3();
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const ndc of ndcCorners) {
      point.copy(ndc).unproject(this.camera);
      direction.copy(point).sub(camPos).normalize();
      if (Math.abs(direction.y) < 1e-6) continue;
      const t = (0 - camPos.y) / direction.y;
      if (t <= 0) continue;
      const hit = camPos.clone().addScaledVector(direction, t);
      minX = Math.min(minX, hit.x);
      maxX = Math.max(maxX, hit.x);
      minZ = Math.min(minZ, hit.z);
      maxZ = Math.max(maxZ, hit.z);
    }
    if (minX === Infinity || minX >= maxX || minZ >= maxZ) {
      minX = -8;
      maxX = 8;
      minZ = -5;
      maxZ = 6;
    }
    return {
      minX: minX + margin,
      maxX: maxX - margin,
      minZ: minZ + margin,
      maxZ: maxZ - margin,
    };
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
    this.css2DRenderer.render(this.scene, this.camera);
  }

  /** Show score and optional multiplier in 3D world space on one row with different gradients. */
  showWorldScore(
    position3D: THREE.Vector3,
    scoreText: string,
    _colorStr?: string,
    multText?: string
  ): void {
    const wrap = document.createElement('div');
    wrap.className = 'world-score-row';
    const scoreSpan = document.createElement('span');
    scoreSpan.className = 'world-score-num';
    scoreSpan.textContent = scoreText;
    wrap.appendChild(scoreSpan);
    if (multText) {
      const multSpan = document.createElement('span');
      multSpan.className = 'world-score-mult';
      multSpan.textContent = ` ${multText}`;
      wrap.appendChild(multSpan);
    }
    const label = new CSS2DObject(wrap);
    const pos = position3D.clone();
    pos.y += 1;
    label.position.copy(pos);
    this.scene.add(label);
    gsap.to(pos, {
      y: pos.y + 1.5,
      duration: 1.5,
      ease: 'power2.out',
      onUpdate: () => {
        label.position.copy(pos);
      },
    });
    gsap.to(wrap, {
      opacity: 0,
      duration: 1.5,
      delay: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        this.scene.remove(label);
      },
    });
  }

  getMaxAnisotropy(): number {
    return this.renderer.capabilities.getMaxAnisotropy();
  }
}
