import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { SceneManager } from '../scene/SceneManager';
import type { PhysicsWorld } from '../scene/PhysicsWorld';
import { createRoundedDiceGeometry, DICE_SIZE_HALF } from './geometry';
import {
  createDiceTexture,
  createBonusFaceTexture,
  createPaintBlobTexture,
  COMBO_COLORS,
} from './diceTextures';
import { Die } from './Die';

export type MaterialsByValue = Record<number, THREE.MeshStandardMaterial[]>;
export type BonusMaterialCache = Record<string, THREE.MeshStandardMaterial>;

/** Maps face value (1–6) to geometry material index (which face is "up"). */
export const VAL_TO_INDEX: Record<number, number> = { 3: 0, 4: 1, 1: 2, 6: 3, 2: 4, 5: 5 };
const BONUS_COLORS: Record<string, { hex: number; str: string }> = {
  time: { hex: 0x2ecc71, str: '#2ecc71' },
  gold: { hex: 0xf1c40f, str: '#f1c40f' },
  nova: { hex: 0x9b59b6, str: '#9b59b6' },
  surge: { hex: 0xe74c3c, str: '#e74c3c' },
  flux: { hex: 0x3498db, str: '#3498db' },
  spark: { hex: 0x1abc9c, str: '#1abc9c' },
  spawn: { hex: 0xe67e22, str: '#e67e22' },
  same: { hex: 0x8e44ad, str: '#8e44ad' },
};

export function getBonusColorHex(perkId: string | null): number {
  if (!perkId) return 0x9b59b6;
  return BONUS_COLORS[perkId]?.hex ?? 0x9b59b6;
}

export function getBonusColorStr(perkId: string | null): string {
  if (!perkId) return '#9b59b6';
  return BONUS_COLORS[perkId]?.str ?? '#9b59b6';
}

export class DiceFactory {
  private readonly geometry: THREE.BufferGeometry;
  readonly standardMaterials: THREE.MeshStandardMaterial[];
  readonly highlightMaterialsByValue: MaterialsByValue;
  readonly bonusMaterialCache: BonusMaterialCache = {};
  private readonly scene: SceneManager;
  private readonly physics: PhysicsWorld;
  private readonly labelParent: HTMLElement;
  private readonly anisotropy: number;

  constructor(
    scene: SceneManager,
    physics: PhysicsWorld,
    labelParent: HTMLElement,
    anisotropy: number
  ) {
    this.anisotropy = anisotropy;
    this.scene = scene;
    this.physics = physics;
    this.labelParent = labelParent;
    this.geometry = createRoundedDiceGeometry();
    this.standardMaterials = [
      this.makeMaterial(3, false, anisotropy),
      this.makeMaterial(4, false, anisotropy),
      this.makeMaterial(1, false, anisotropy),
      this.makeMaterial(6, false, anisotropy),
      this.makeMaterial(2, false, anisotropy),
      this.makeMaterial(5, false, anisotropy),
    ];
    this.highlightMaterialsByValue = {} as MaterialsByValue;
    for (let i = 1; i <= 6; i++) {
      const col = COMBO_COLORS[i] ?? { hex: 0x808080, str: '#808080' };
      this.highlightMaterialsByValue[i] = [
        this.makeMaterial(3, true, anisotropy, col.str),
        this.makeMaterial(4, true, anisotropy, col.str),
        this.makeMaterial(1, true, anisotropy, col.str),
        this.makeMaterial(6, true, anisotropy, col.str),
        this.makeMaterial(2, true, anisotropy, col.str),
        this.makeMaterial(5, true, anisotropy, col.str),
      ];
    }
  }

  private makeMaterial(
    face: number,
    isHover: boolean,
    anisotropy: number,
    highlightStr?: string
  ): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      map: createDiceTexture(face, isHover, highlightStr ?? '#ff6b6b', anisotropy),
      roughness: 0.4,
      metalness: 0.1,
    });
  }

  createDie(
    diceTypeId: string,
    perkId: string | null,
    spawnInAir: boolean
  ): Die {
    const mesh = new THREE.Mesh(this.geometry, this.standardMaterials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const shape = new CANNON.Box(new CANNON.Vec3(DICE_SIZE_HALF, DICE_SIZE_HALF, DICE_SIZE_HALF));
    const body = new CANNON.Body({
      mass: 1,
      shape,
      material: this.physics.diceMaterial,
    });
    if (spawnInAir) {
      body.position.set(
        (Math.random() - 0.5) * 4,
        15 + Math.random() * 5,
        (Math.random() - 0.5) * 4
      );
      body.velocity.set(
        (Math.random() - 0.5) * 5,
        -10,
        (Math.random() - 0.5) * 5
      );
      body.angularVelocity.set(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
      );
    } else {
      body.position.set(
        (Math.random() - 0.5) * 8,
        5 + Math.random() * 5,
        (Math.random() - 0.5) * 8
      );
    }
    this.physics.addBody(body);

    const light = new THREE.PointLight(0xffffff, 0, 10);
    this.scene.add(light);

    const label = document.createElement('div');
    label.className = 'die-label';
    if (diceTypeId === 'bonus') this.labelParent.appendChild(label);

    let floorBlob: THREE.Mesh | undefined;
    let floorAura: THREE.Mesh | undefined;
    if (diceTypeId === 'bonus') {
      const blobGeo = new THREE.CircleGeometry(1.5, 32);
      const blobColor = perkId && BONUS_COLORS[perkId] ? BONUS_COLORS[perkId].hex : 0x9b59b6;
      const blobMat = new THREE.MeshBasicMaterial({
        map: createPaintBlobTexture(),
        color: blobColor,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
      });
      floorBlob = new THREE.Mesh(blobGeo, blobMat);
      floorBlob.rotation.x = -Math.PI / 2;
      floorBlob.position.set(body.position.x, 0.02, body.position.z);
      floorBlob.visible = false;
      this.scene.add(floorBlob);

      const auraGeo = new THREE.CircleGeometry(2.4, 32);
      const auraMat = new THREE.MeshBasicMaterial({
        color: blobColor,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      floorAura = new THREE.Mesh(auraGeo, auraMat);
      floorAura.rotation.x = -Math.PI / 2;
      floorAura.position.set(body.position.x, 0.01, body.position.z);
      floorAura.visible = false;
      this.scene.add(floorAura);
    }

    return new Die(mesh, body, light, label, diceTypeId, perkId, floorBlob, floorAura);
  }

  /** Get or create a single glowing face material for bonus dice (emoji/symbol face). */
  getBonusFaceMaterial(val: number, perkId: string): THREE.MeshStandardMaterial {
    const cacheKey = `${val}-${perkId}`;
    if (!this.bonusMaterialCache[cacheKey]) {
      const col = BONUS_COLORS[perkId] ?? { hex: 0xffffff, str: '#ffffff' };
      this.bonusMaterialCache[cacheKey] = new THREE.MeshStandardMaterial({
        map: createBonusFaceTexture(val, perkId, col.str, this.anisotropy),
        roughness: 0.4,
        metalness: 0.1,
        emissive: col.hex,
        emissiveIntensity: 0.15,
      });
    }
    return this.bonusMaterialCache[cacheKey];
  }

  /** Build full 6-face material array for a bonus die (all faces emoji/symbol of that type). */
  getBonusDieMaterials(perkId: string): THREE.MeshStandardMaterial[] {
    const faceValues = [3, 4, 1, 6, 2, 5] as const;
    return faceValues.map((fv) => this.getBonusFaceMaterial(fv, perkId));
  }

  /** Remove die from scene, physics, and DOM. */
  destroyDie(die: Die): void {
    this.scene.remove(die.mesh);
    this.scene.remove(die.light);
    if (die.floorBlob) this.scene.remove(die.floorBlob);
    if (die.floorAura) this.scene.remove(die.floorAura);
    this.physics.removeBody(die.body);
    if (die.label.parentNode) die.label.parentNode.removeChild(die.label);
  }
}
