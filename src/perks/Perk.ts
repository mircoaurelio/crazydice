import type { DieFaceValue } from '../types';
import type { Die } from '../dice/Die';

/** Context passed to Perk.apply for bonus-die effects. */
export interface PerkApplyContext {
  /** Add time (seconds) to the round timer. */
  addTime(seconds: number): void;
  /** Add gold/score to run total. */
  addGold(amount: number): void;
  /** Re-roll (throw) all other non-consumed dice. */
  rerollAllOtherDice(except: Die): void;
  /** Spawn N normal dice (for Spawn perk). */
  spawnDice?(count: number): void;
  /** Set all normal dice to show the same face value 1–6 (for Same perk). */
  setAllDiceToSameValue?(value: number): void;
  /** Show floating text at a 3D position. */
  showFloatingText(text: string, isCombo: boolean, pos?: { x: number; y: number; z: number }): void;
  /** Play a tone (optional). */
  playTone?(freq: number, type: string, duration: number, vol?: number): void;
  /** Extra seconds added when Time+ is owned (shop). */
  getTimeBonus?(): number;
  /** Extra gold per face when Gold+ is owned (shop). */
  getGoldBonus?(): number;
}

export interface Perk {
  id: string;
  name: string;
  effectType: string;
  /** Apply effect when a bonus die with this perk is clicked. Face value 1-6 maps to time/gold/nova in original. */
  apply(context: PerkApplyContext, die: Die, faceValue: DieFaceValue): void;
}
