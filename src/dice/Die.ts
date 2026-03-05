import * as THREE from 'three';
import type { Body } from 'cannon-es';
import { getDieValue } from './getDieValue';
import { REST_VELOCITY_SQ, REST_ANGULAR_VELOCITY_SQ, UNREST_VELOCITY_SQ } from '../constants/config';

export class Die {
  readonly mesh: THREE.Mesh;
  readonly body: Body;
  readonly light: THREE.PointLight;
  readonly label: HTMLDivElement;
  readonly diceTypeId: string;
  readonly perkId: string | null;
  juggleMult: number;
  isResting: boolean;
  consumed: boolean;
  /** Cached face value (1–6); updated by consumer when needed. */
  value: number = 1;
  /** Bonus only: seconds left before disappear. Set when landed. */
  bonusTimeLeft?: number;
  /** Bonus only: true when blob is shrinking before puff. */
  bonusPuffing?: boolean;
  /** Bonus only: floor blob mesh (circle under die). */
  floorBlob?: THREE.Mesh;
  /** Bonus only: glory aura mesh (larger soft ring under blob). */
  floorAura?: THREE.Mesh;
  /** Bonus only: when true, trigger perk and destroy as soon as this die lands (set when user clicks to throw). */
  bonusTriggerOnLand?: boolean;
  /** True only after this die was thrown or spawned in air; cleared when we attribute landing score. Stops resting dice that get bumped from triggering points. */
  eligibleForLandingScore = false;

  constructor(
    mesh: THREE.Mesh,
    body: Body,
    light: THREE.PointLight,
    label: HTMLDivElement,
    diceTypeId: string,
    perkId: string | null,
    floorBlob?: THREE.Mesh,
    floorAura?: THREE.Mesh
  ) {
    this.mesh = mesh;
    this.body = body;
    this.light = light;
    this.label = label;
    this.diceTypeId = diceTypeId;
    this.perkId = perkId;
    this.floorBlob = floorBlob;
    this.floorAura = floorAura;
    this.juggleMult = 1;
    this.isResting = true;
    this.consumed = false;
  }

  /** Get current face value from mesh rotation (1–6). */
  getValue(): number {
    return getDieValue(this.mesh);
  }

  /** Sync mesh position/rotation from physics body. */
  syncFromBody(): void {
    this.mesh.position.copy(this.body.position as unknown as THREE.Vector3);
    this.mesh.quaternion.copy(this.body.quaternion as unknown as THREE.Quaternion);
    this.light.position.copy(this.body.position as unknown as THREE.Vector3);
    if (this.floorBlob) {
      this.floorBlob.position.set(
        this.body.position.x,
        0.02,
        this.body.position.z
      );
    }
    if (this.floorAura) {
      this.floorAura.position.set(
        this.body.position.x,
        0.01,
        this.body.position.z
      );
    }
  }

  /** Update isResting based on velocity thresholds. */
  updateResting(): void {
    const vel = this.body.velocity.lengthSquared();
    const angVel = this.body.angularVelocity.lengthSquared();
    if (vel < REST_VELOCITY_SQ && angVel < REST_ANGULAR_VELOCITY_SQ) {
      this.isResting = true;
    } else if (vel > UNREST_VELOCITY_SQ || angVel > UNREST_VELOCITY_SQ) {
      this.isResting = false;
    }
  }
}
