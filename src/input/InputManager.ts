import * as THREE from 'three';
import type { PerspectiveCamera } from 'three';
import type { Die } from '../dice/Die';

export class InputManager {
  private readonly raycaster = new THREE.Raycaster();
  private readonly mouse = new THREE.Vector2();
  private onClickCallback: ((die: Die | null) => void) | null = null;
  private dice: Die[] = [];
  private camera: PerspectiveCamera | null = null;

  setCamera(camera: PerspectiveCamera): void {
    this.camera = camera;
  }

  setDice(dice: Die[]): void {
    this.dice = dice;
  }

  onPointerMove(event: PointerEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  getPointerNDC(): THREE.Vector2 {
    return this.mouse.clone();
  }

  /** Returns the top-most die under the current pointer, or null. */
  getIntersectedDie(): Die | null {
    if (!this.camera || this.dice.length === 0) return null;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.dice.map((d) => d.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);
    const first = intersects[0];
    if (!first) return null;
    const mesh = first.object;
    return this.dice.find((d) => d.mesh === mesh) ?? null;
  }

  /** Subscribe to pointer down; callback receives the clicked die or null. */
  onClick(callback: (die: Die | null) => void): void {
    this.onClickCallback = callback;
  }

  handlePointerDown(event: PointerEvent): void {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    const die = this.getIntersectedDie();
    this.onClickCallback?.(die ?? null);
  }

  /** Call from Game to update cursor style (e.g. pointer when over a die). */
  updateCursor(isOverDie: boolean): void {
    document.body.style.cursor = isOverDie ? 'pointer' : 'default';
  }
}
