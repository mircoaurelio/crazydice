import type { Perk } from './Perk';

export const PERK_IDS = {
  TIME: 'time',
  GOLD: 'gold',
  NOVA: 'nova',
  SURGE: 'surge',
  FLUX: 'flux',
  SPARK: 'spark',
  SPAWN: 'spawn',
  SAME: 'same',
} as const;

/** All bonus modes (used when spawning randomly). */
export const BONUS_MODE_IDS = [
  PERK_IDS.TIME,
  PERK_IDS.GOLD,
  PERK_IDS.NOVA,
  PERK_IDS.SURGE,
  PERK_IDS.FLUX,
  PERK_IDS.SPARK,
  PERK_IDS.SPAWN,
  PERK_IDS.SAME,
] as const;

/** Combo die value (1–6) → perk id for bonus die spawn. */
export const COMBO_VALUE_TO_PERK: Record<number, string> = {
  1: PERK_IDS.GOLD,
  2: PERK_IDS.NOVA,
  3: PERK_IDS.TIME,
  4: PERK_IDS.SPAWN,
  5: PERK_IDS.SURGE,
  6: PERK_IDS.SAME,
};

/** Base time per multiplier point (seconds). Landed face value = multiplier. */
const TIME_BASE_PER_POINT = 2;
/** Base gold per multiplier point. Landed face value = multiplier. */
const GOLD_BASE_PER_POINT = 200;

/** Time: landed face (1–6) is multiplier for seconds. */
const timePerk: Perk = {
  id: PERK_IDS.TIME,
  name: 'Time',
  effectType: 'time',
  apply(context, _die, faceValue) {
    const mult = faceValue;
    const seconds = Math.max(1, TIME_BASE_PER_POINT * mult);
    context.addTime(seconds);
    context.showFloatingText(`Time +${seconds}s (×${mult})`, true);
    context.playTone?.(800, 'square', 0.2, 0.1);
    context.playTone?.(1200, 'sine', 0.3, 0.1);
  },
};

/** Gold: landed face (1–6) is multiplier for gold. */
const goldPerk: Perk = {
  id: PERK_IDS.GOLD,
  name: 'Gold',
  effectType: 'gold',
  apply(context, _die, faceValue) {
    const mult = faceValue;
    const basePerPoint = GOLD_BASE_PER_POINT + (context.getGoldBonus?.() ?? 0);
    const amount = basePerPoint * mult;
    context.addGold(amount);
    context.showFloatingText(`Gold +${amount} (×${mult})`, true);
    context.playTone?.(1500, 'triangle', 0.4, 0.1);
  },
};

/** Nova: re-roll all other dice; landed face is multiplier (shown). */
const novaPerk: Perk = {
  id: PERK_IDS.NOVA,
  name: 'Nova',
  effectType: 'nova',
  apply(context, die, faceValue) {
    const mult = faceValue;
    context.showFloatingText(`Nova: reroll all (×${mult})`, true);
    context.playTone?.(150, 'sawtooth', 0.5, 0.3);
    context.rerollAllOtherDice(die);
  },
};

/** Surge: landed face (1–6) is multiplier for score/gold. */
const SURGE_GOLD_PER_POINT = 300;
const surgePerk: Perk = {
  id: PERK_IDS.SURGE,
  name: 'Surge',
  effectType: 'surge',
  apply(context, _die, faceValue) {
    const mult = faceValue;
    const amount = SURGE_GOLD_PER_POINT * mult;
    context.addGold(amount);
    context.showFloatingText(`Surge: Gold +${amount} (×${mult})`, true);
    context.playTone?.(600, 'sine', 0.25, 0.12);
  },
};

/** Flux: landed face (1–6) is multiplier for time. */
const fluxPerk: Perk = {
  id: PERK_IDS.FLUX,
  name: 'Flux',
  effectType: 'flux',
  apply(context, _die, faceValue) {
    const mult = faceValue;
    const sec = Math.max(1, mult);
    context.addTime(sec);
    context.showFloatingText(`Flux: Time +${sec}s (×${mult})`, true);
    context.playTone?.(900, 'sine', 0.2, 0.1);
  },
};

/** Spark: re-roll others; landed face shown as multiplier. */
const sparkPerk: Perk = {
  id: PERK_IDS.SPARK,
  name: 'Spark',
  effectType: 'spark',
  apply(context, die, faceValue) {
    const mult = faceValue;
    context.showFloatingText(`Spark: reroll all (×${mult})`, true);
    context.playTone?.(1200, 'sine', 0.3, 0.15);
    context.rerollAllOtherDice(die);
  },
};

/** Spawn: add N normal dice (N = landed face value). */
const spawnPerk: Perk = {
  id: PERK_IDS.SPAWN,
  name: 'Spawn',
  effectType: 'spawn',
  apply(context, _die, faceValue) {
    const n = Math.max(1, Math.min(6, faceValue));
    context.spawnDice?.(n);
    context.showFloatingText(`Spawn: +${n} dice`, true);
    context.playTone?.(800, 'square', 0.25, 0.12);
  },
};

/** Same: set all normal dice to the same face value (landed face). */
const samePerk: Perk = {
  id: PERK_IDS.SAME,
  name: 'Same',
  effectType: 'same',
  apply(context, _die, faceValue) {
    const value = Math.max(1, Math.min(6, faceValue)) as 1 | 2 | 3 | 4 | 5 | 6;
    context.setAllDiceToSameValue?.(value);
    context.showFloatingText(`Same: all dice → ${value}`, true);
    context.playTone?.(600, 'sine', 0.3, 0.15);
  },
};

const registry: Record<string, Perk> = {
  [PERK_IDS.TIME]: timePerk,
  [PERK_IDS.GOLD]: goldPerk,
  [PERK_IDS.NOVA]: novaPerk,
  [PERK_IDS.SURGE]: surgePerk,
  [PERK_IDS.FLUX]: fluxPerk,
  [PERK_IDS.SPARK]: sparkPerk,
  [PERK_IDS.SPAWN]: spawnPerk,
  [PERK_IDS.SAME]: samePerk,
};

export function getPerk(id: string): Perk | undefined {
  return registry[id];
}

export function getAllPerks(): Perk[] {
  return Object.values(registry);
}

/** Map bonus-die face value to a default perk id (used as fallback only; die has fixed perkId at spawn). */
export function faceValueToPerkId(faceValue: number): string | null {
  return COMBO_VALUE_TO_PERK[faceValue] ?? null;
}

/** Short label for bonus die (property + formula). Shown on the die during the run. */
export function getBonusDieLabel(perkId: string): string {
  const labels: Record<string, string> = {
    [PERK_IDS.TIME]: `TIME +${TIME_BASE_PER_POINT}s×face`,
    [PERK_IDS.GOLD]: `GOLD +${GOLD_BASE_PER_POINT}×face`,
    [PERK_IDS.SURGE]: `SURGE +${SURGE_GOLD_PER_POINT}×face`,
    [PERK_IDS.FLUX]: 'FLUX +1s×face',
    [PERK_IDS.NOVA]: 'NOVA reroll all',
    [PERK_IDS.SPARK]: 'SPARK reroll all',
    [PERK_IDS.SPAWN]: 'SPAWN +N dice',
    [PERK_IDS.SAME]: 'SAME all→face',
  };
  return labels[perkId] ?? perkId.toUpperCase();
}
