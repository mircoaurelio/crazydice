import * as THREE from 'three';

const DEFAULT_CAMERA_POS = { x: 0, y: 10, z: 14 };
const LOOK_AT = new THREE.Vector3(0, -2, 0);

export class CameraShake {
  intensity = 0;
  private readonly camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  trigger(intensity: number): void {
    this.intensity = Math.max(this.intensity, intensity);
  }

  /** Apply current intensity (caller decays intensity externally). */
  update(): void {
    if (this.intensity > 0) {
      this.camera.position.x = DEFAULT_CAMERA_POS.x + (Math.random() - 0.5) * this.intensity;
      this.camera.position.y = DEFAULT_CAMERA_POS.y + (Math.random() - 0.5) * this.intensity;
      this.camera.position.z = DEFAULT_CAMERA_POS.z;
      this.camera.lookAt(LOOK_AT);
    } else {
      this.camera.position.set(DEFAULT_CAMERA_POS.x, DEFAULT_CAMERA_POS.y, DEFAULT_CAMERA_POS.z);
      this.camera.lookAt(LOOK_AT);
    }
  }
}
