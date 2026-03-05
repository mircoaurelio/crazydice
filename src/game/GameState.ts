import type { GameStatus } from '../types';
import { STARTING_GOLD } from '../constants/config';

/** Run-level state (persists across rounds, used by shop). */
export class GameState {
  status: GameStatus = 'menu';
  ante = 1;
  currentRound = 0;
  totalScore = 0;
  gold = STARTING_GOLD;
  ownedPerkIds: string[] = [];
  ownedDiceTypeIds: string[] = [];
  ownedCardIds: string[] = [];

  resetRun(): void {
    this.status = 'playing';
    this.ante = 1;
    this.currentRound = 0;
    this.totalScore = 0;
    this.gold = STARTING_GOLD;
    this.ownedPerkIds = [];
    this.ownedDiceTypeIds = [];
    this.ownedCardIds = [];
  }
}
