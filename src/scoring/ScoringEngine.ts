import * as THREE from 'three';
import type { Die } from '../dice/Die';
import { getDieValue } from '../dice/getDieValue';
import type { DiceFactory, MaterialsByValue } from '../dice/DiceFactory';
import {
  TOWER_BONUS_PER_DIE,
  MAX_DICE_ON_TABLE,
  INITIAL_FORTUNE,
} from '../constants/config';
import { COMBO_VALUE_TO_PERK } from '../perks/perkRegistry';

export interface ScoringResult {
  baseScore: number;
  multiplier: number;
  towerBonus: number;
  finalScore: number;
  landings: number;
  comboDice: number[];
}

export interface ScoringCallbacks {
  onScore?(result: ScoringResult, position3D?: THREE.Vector3): void;
  onTower?(die: Die, bonus: number): void;
  onComboExplosion?(die: Die, colorHex: number): void;
  /** Called with the perk id for the bonus die to spawn (based on combo values). */
  onSpawnBonusDie?(perkId: string): void;
  setShake?(intensity: number): void;
  showFloatingText?(text: string, isCombo: boolean, pos: THREE.Vector3): void;
  updateDieComboAppearance?(dice: Die[], comboDice: number[], standardMaterials: THREE.MeshStandardMaterial[], highlightMaterialsByValue: MaterialsByValue): void;
}

export class ScoringEngine {
  constructor(
    private readonly diceFactory: DiceFactory,
    private callbacks: ScoringCallbacks
  ) {}

  setCallbacks(cb: ScoringCallbacks): void {
    this.callbacks = cb;
  }

  /**
   * Compute score for currently resting dice. Returns result and optionally
   * triggers UI/sound/spawn. Only scores normal dice; bonus dice don't contribute to base.
   * Dice in justLanded are always counted for this score (so landing on another die still gives points).
   */
  calculateResults(
    dice: Die[],
    landings: number,
    playerHasRolled: boolean,
    status: string,
    scorePosition3D?: THREE.Vector3,
    reportScore = true,
    justLanded: Die[] = []
  ): ScoringResult | null {
    const counts: Record<number, number> = {};
    let baseScore = 0;
    let towerBonusAmount = 0;
    const stackedDice = new Set<Die>();

    for (const dieA of dice) {
      if (!dieA.isResting || dieA.consumed) continue;
      for (const dieB of dice) {
        if (dieA === dieB || !dieB.isResting || dieB.consumed) continue;
        const dx = Math.abs(dieA.body.position.x - dieB.body.position.x);
        const dy = dieA.body.position.y - dieB.body.position.y;
        const dz = Math.abs(dieA.body.position.z - dieB.body.position.z);
        if (dx < 0.6 && dz < 0.6 && dy > 0.8 && dy < 1.4) {
          if (!stackedDice.has(dieA)) {
            stackedDice.add(dieA);
            const tBonus = TOWER_BONUS_PER_DIE * (dieA.juggleMult || 1);
            towerBonusAmount += tBonus;
            this.callbacks.onTower?.(dieA, tBonus);
            this.callbacks.showFloatingText?.(`TOWER! +${tBonus}`, true, dieA.mesh.position.clone());
            this.callbacks.setShake?.(0.5);
          }
        }
      }
    }

    const justLandedSet = new Set(justLanded);
    for (const die of dice) {
      if (die.diceTypeId === 'normal') {
        const val = getDieValue(die.mesh);
        die.value = val;
        die.label.innerText = (die.juggleMult || 1) > 1 ? `${val} (x${die.juggleMult})` : String(val);
        const countForScore = die.isResting || justLandedSet.has(die);
        if (countForScore) {
          const juggle = die.juggleMult || 1;
          baseScore += val * juggle;
          counts[val] = (counts[val] ?? 0) + 1;
          if (die.isResting) die.juggleMult = 1;
        }
      }
    }

    let multiplier = 1;
    const comboDice: number[] = [];
    const valuesPresent = Object.keys(counts).map((k) => parseInt(k, 10));
    const hasFullSet =
      valuesPresent.length === 6 &&
      [1, 2, 3, 4, 5, 6].every((v) => valuesPresent.includes(v));
    const fullSetBonus = hasFullSet ? 500 : 0;
    if (hasFullSet) {
      comboDice.push(1, 2, 3, 4, 5, 6);
    }
    for (const [val, count] of Object.entries(counts)) {
      const v = parseInt(val, 10);
      if (count > 1 && !hasFullSet) {
        multiplier += count - 1;
        comboDice.push(v);
      }
    }

    const scorePerLanding = baseScore * multiplier;
    const finalScore = scorePerLanding * landings + towerBonusAmount + fullSetBonus;

    if (
      reportScore &&
      (baseScore > 0 || towerBonusAmount > 0 || fullSetBonus > 0) &&
      playerHasRolled
    ) {
      if (fullSetBonus > 0 && scorePosition3D) {
        this.callbacks.showFloatingText?.('+500 FULL SET!', true, scorePosition3D.clone());
      }
      this.callbacks.onScore?.(
        { baseScore, multiplier, towerBonus: towerBonusAmount, finalScore, landings, comboDice },
        scorePosition3D
      );
    }

    if (
      reportScore &&
      playerHasRolled &&
      multiplier > 1 &&
      status === 'playing' &&
      dice.length < MAX_DICE_ON_TABLE
    ) {
      const comboCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      for (const v of comboDice) {
        comboCounts[v] = (comboCounts[v] ?? 0) + 1;
      }
      const totalComboDice = Object.values(comboCounts).reduce((a, c) => a + c, 0);
      const spawnChance = Math.min(1, INITIAL_FORTUNE * totalComboDice);
      if (totalComboDice > 0 && Math.random() < spawnChance) {
        const totalWeight = Object.values(comboCounts).reduce((a, c) => a + c, 0);
        let r = Math.random() * totalWeight;
        let chosenValue = 1;
        for (let v = 1; v <= 6; v++) {
          const w = comboCounts[v] ?? 0;
          if (r < w) {
            chosenValue = v;
            break;
          }
          r -= w;
        }
        const perkId = COMBO_VALUE_TO_PERK[chosenValue];
        if (perkId) this.callbacks.onSpawnBonusDie?.(perkId);
      }
    }

    this.callbacks.updateDieComboAppearance?.(
      dice,
      comboDice,
      this.diceFactory.standardMaterials,
      this.diceFactory.highlightMaterialsByValue
    );

    return { baseScore, multiplier, towerBonus: towerBonusAmount, finalScore, landings, comboDice };
  }
}
