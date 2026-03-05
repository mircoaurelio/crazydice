import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { GRAVITY_Y } from '../constants/config';

/** Creates floor texture for the scene (used by PhysicsWorld or caller). */
export function createFloorTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f0f3f8';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#dfe6e9';
  for (let i = 0; i < 512; i += 64) {
    for (let j = 0; j < 512; j += 64) {
      ctx.beginPath();
      ctx.arc(i + 32, j + 32, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(20, 20);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

const WALL_HEIGHT = 20;
const WALL_THICKNESS = 0.5;

export class PhysicsWorld {
  readonly world: CANNON.World;
  readonly floorBody: CANNON.Body;
  readonly diceMaterial: CANNON.Material;
  private wallBodies: CANNON.Body[] = [];
  private wallMaterial: CANNON.Material;
  private bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null = null;

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, GRAVITY_Y, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    (this.world.solver as { iterations?: number }).iterations = 20;

    const floorMaterial = new CANNON.Material({ friction: 0.3, restitution: 0.2 });
    this.floorBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: floorMaterial,
    });
    this.floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(this.floorBody);

    this.diceMaterial = new CANNON.Material({ friction: 0.3, restitution: 0.3 });
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(floorMaterial, this.diceMaterial, {
        friction: 0.4,
        restitution: 0.2,
      })
    );

    this.wallMaterial = new CANNON.Material({ friction: 0.2, restitution: 0 });
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.wallMaterial, this.diceMaterial, {
        friction: 0.3,
        restitution: 0,
      })
    );
  }

  /** Set play area bounds from viewport; walls are updated so dice stay inside and do not oscillate at walls. */
  setBounds(minX: number, maxX: number, minZ: number, maxZ: number): void {
    for (const body of this.wallBodies) this.world.removeBody(body);
    this.wallBodies = [];
    this.bounds = { minX, maxX, minZ, maxZ };

    const w = maxX - minX;
    const d = maxZ - minZ;
    const h = WALL_HEIGHT / 2;
    const t = WALL_THICKNESS / 2;

    const left = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(t, h, d / 2 + t)),
      material: this.wallMaterial,
    });
    left.position.set(minX - t, h, (minZ + maxZ) / 2);
    this.world.addBody(left);
    this.wallBodies.push(left);

    const right = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(t, h, d / 2 + t)),
      material: this.wallMaterial,
    });
    right.position.set(maxX + t, h, (minZ + maxZ) / 2);
    this.world.addBody(right);
    this.wallBodies.push(right);

    const back = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(w / 2 + t, h, t)),
      material: this.wallMaterial,
    });
    back.position.set((minX + maxX) / 2, h, minZ - t);
    this.world.addBody(back);
    this.wallBodies.push(back);

    const front = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(w / 2 + t, h, t)),
      material: this.wallMaterial,
    });
    front.position.set((minX + maxX) / 2, h, maxZ + t);
    this.world.addBody(front);
    this.wallBodies.push(front);
  }

  getBounds(): { minX: number; maxX: number; minZ: number; maxZ: number } | null {
    return this.bounds;
  }

  step(dt: number, maxSubSteps = 3): void {
    this.world.step(1 / 60, dt, maxSubSteps);
  }

  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
  }
}
