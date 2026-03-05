import {
  TIME_PER_ROUND,
  INITIAL_DICE_COUNT,
  INITIAL_FORTUNE,
} from '../constants/config';

/** Current round state (reset each round). */
export class RunState {
  timeLeft = TIME_PER_ROUND;
  diceCount = INITIAL_DICE_COUNT;
  fortune = INITIAL_FORTUNE;
  playerHasRolled = false;
  shakeIntensity = 0;
  lastTick = 0;
  /** Key of last landing batch we reported (avoids duplicate score pop on bounce). */
  lastReportedLandingKey = '';
  /** Score this round only (0 → ante record); total bank is in GameState.totalScore. */
  roundScore = 0;
  /** True when current round is a boss round (every BOSS_EVERY_N_ROUNDS). */
  isBossRound = false;

  resetRound(): void {
    this.timeLeft = TIME_PER_ROUND;
    this.playerHasRolled = false;
    this.shakeIntensity = 0;
    this.lastTick = 0;
    this.lastReportedLandingKey = '';
    this.roundScore = 0;
    this.isBossRound = false;
  }
}
