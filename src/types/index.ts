import type { Mesh } from 'three';
import type { Body } from 'cannon-es';

/** Top-level game status (menu → playing round → shop → gameover). */
export type GameStatus = 'menu' | 'playing' | 'shop' | 'gameover';

/** Current round status. */
export type RunStatus = 'playing' | 'round_over';

/** Face value of a d6 (1-6). */
export type DieFaceValue = 1 | 2 | 3 | 4 | 5 | 6;

/** Identifiers for dice types (normal, bonus, future D8, etc.). */
export type DiceTypeId = 'normal' | 'bonus' | string;

/** Perk effect types (time, gold, nova, etc.). */
export type PerkEffectType = 'time' | 'gold' | 'nova' | string;

/** Playing card rank for card bonuses. */
export type CardRank = 'J' | 'Q' | 'K' | 'A' | string;

/** Playing card suit. */
export type CardSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades' | string;

/** Shop item kinds. */
export type ShopItemKind = 'perk' | 'dice' | 'card';

/** Casino fish associated with a shop item (shown on offer and as chip during run). */
export interface CasinoFish {
  fishId: string;
  emoji: string;
  name: string;
}

/** Single shop offer. */
export interface ShopOffer {
  id: string;
  kind: ShopItemKind;
  name: string;
  description?: string;
  price: number;
  /** For perks: perkId; for dice: diceTypeId; for cards: cardId */
  itemId: string;
  /** Casino fish shown on this offer and on the chip when owned. */
  fish: CasinoFish;
}

/** Data needed to create/identify a die (used by DiceFactory and scoring). */
export interface DieData {
  mesh: Mesh;
  body: Body;
  value: DieFaceValue;
  diceTypeId: DiceTypeId;
  perkId: string | null;
  juggleMult: number;
  isResting: boolean;
  consumed: boolean;
}
