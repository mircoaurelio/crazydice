import * as THREE from 'three';

const PARTICLE_COUNT = 1000;

export class Particles {
  private readonly system: THREE.Points;
  private readonly velocities: THREE.Vector3[] = [];
  private activeCount = 0;

  constructor(scene: THREE.Scene) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      this.velocities.push(new THREE.Vector3(0, 0, 0));
      const c = new THREE.Color(Math.random() > 0.5 ? 0xff6b6b : 0x4ecdc4);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      blending: THREE.NormalBlending,
      transparent: true,
      opacity: 1,
      depthWrite: true,
    });
    this.system = new THREE.Points(geo, mat);
    scene.add(this.system);
  }

  explosion(pos: THREE.Vector3, count: number, colorHex: number, speedMultiplier = 1): void {
    const startIdx = this.activeCount;
    const c = new THREE.Color(colorHex);
    const geo = this.system.geometry;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const colorAttr = geo.getAttribute('color') as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const colorArray = colorAttr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const idx = (startIdx + i) % PARTICLE_COUNT;
      posArray[idx * 3] = pos.x;
      posArray[idx * 3 + 1] = pos.y;
      posArray[idx * 3 + 2] = pos.z;
      colorArray[idx * 3] = c.r;
      colorArray[idx * 3 + 1] = c.g;
      colorArray[idx * 3 + 2] = c.b;
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 0.5 + 0.2) * speedMultiplier;
      const up = Math.random() * 0.5 * speedMultiplier;
      this.velocities[idx]!.set(
        Math.cos(angle) * speed,
        up,
        Math.sin(angle) * speed
      );
    }
    this.activeCount = (this.activeCount + count) % PARTICLE_COUNT;
    posAttr!.needsUpdate = true;
    colorAttr!.needsUpdate = true;
  }

  update(): void {
    const geo = this.system.geometry;
    const posAttr = geo.getAttribute('position');
    if (!posAttr?.array) return;
    const posArray = posAttr.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const v = this.velocities[i];
      if (v && posArray[i * 3 + 1]! > -50) {
        posArray[i * 3]! += v.x;
        posArray[i * 3 + 1]! += v.y;
        posArray[i * 3 + 2]! += v.z;
        v.y -= 0.02;
        if (posArray[i * 3 + 1]! < 0) posArray[i * 3 + 1] = -100;
      }
    }
    posAttr.needsUpdate = true;
  }
}
