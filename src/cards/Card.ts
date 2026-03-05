import type { GameState } from '../game/GameState';

export interface Card {
  id: string;
  suit: string;
  rank: string;
  bonusDescription: string;
  /** Optional passive or active effect. */
  apply?(gameState: GameState): void;
}
