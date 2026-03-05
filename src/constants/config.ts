/** Initial number of dice per round. */
export const INITIAL_DICE_COUNT = 6;

/** Time per round in seconds. */
export const TIME_PER_ROUND = 20;

/** Chance (0–1) to spawn a bonus die on combo. */
export const INITIAL_FORTUNE = 0.1;

/** Maximum juggle multiplier per die (1–5). */
export const MAX_JUGGLE_MULT = 5;

/** Tower bonus base per stacked die (× juggleMult). */
export const TOWER_BONUS_PER_DIE = 2000;

/** Maximum dice on table (cap for bonus spawns). */
export const MAX_DICE_ON_TABLE = 25;

/** Bonus die: time added when TIME face is clicked (seconds). */
export const BONUS_TIME_SECONDS = 3;

/** Bonus die: gold added when GOLD face is clicked. */
export const BONUS_GOLD_AMOUNT = 1000;

/** Seconds a landed bonus die stays before it disappears (floor blob shrinks, then puff). Kept longer so they stay on field with glory aura. */
export const BONUS_DIE_LIFETIME = 18;

/** Physics: gravity Y (negative = down). */
export const GRAVITY_Y = -50;

/** Resting velocity threshold (squared). */
export const REST_VELOCITY_SQ = 0.1;

/** Resting angular velocity threshold (squared). */
export const REST_ANGULAR_VELOCITY_SQ = 0.1;

/** Un-rest velocity threshold (squared) when bumped. */
export const UNREST_VELOCITY_SQ = 1.0;

/** Starting gold for a new run. */
export const STARTING_GOLD = 500;

/** Ante for round 1. Increases each round. */
export const ANTE_START = 100;
/** Added to ante each round (ante for round r = ANTE_START + (r - 1) * ANTE_INCREMENT). */
export const ANTE_INCREMENT = 50;

/** Ante target for the given round (1-based): score goal to earn that much gold. */
export function getAnteForRound(round: number): number {
  return ANTE_START + Math.max(0, (round - 1) * ANTE_INCREMENT);
}

/** Round earnings: gold += max(MIN_ROUND_GOLD, floor(totalScore * ROUND_GOLD_RATE)). */
export const ROUND_GOLD_RATE = 0.05;
export const MIN_ROUND_GOLD = 100;

/** Score needed so that round gold >= ante (the "ante record": reach 0 to x during the round). */
export function getTargetScoreToPassAnte(ante: number): number {
  return Math.ceil(ante / ROUND_GOLD_RATE);
}

/** Rounds between shop appearances (e.g. every 1 = after every round). */
export const ROUNDS_BETWEEN_SHOP = 1;

/** Boss round every N levels (e.g. 3 = boss on rounds 3, 6, 9, …). Round is 1-based. */
export const BOSS_EVERY_N_ROUNDS = 3;

/** True when this round (1-based) is a boss round. */
export function isBossRound(round: number): boolean {
  return round > 0 && round % BOSS_EVERY_N_ROUNDS === 0;
}
