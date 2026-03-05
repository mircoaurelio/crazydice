import type { CasinoFish } from '../types';

/** Casino fish by itemId (perks, cards, etc.). Used for shop offers and run chips. */
export const FISH_BY_ITEM_ID: Record<string, CasinoFish> = {
  time: { fishId: 'goldfish', emoji: '🐠', name: 'Goldfish' },
  gold: { fishId: 'puffer', emoji: '🐡', name: 'Puffer' },
  nova: { fishId: 'shark', emoji: '🦈', name: 'Shark' },
  king: { fishId: 'kingfish', emoji: '🐟', name: 'Kingfish' },
  extra: { fishId: 'dolphin', emoji: '🐬', name: 'Extra Die' },
};

export function getFishForItemId(itemId: string): CasinoFish | undefined {
  return FISH_BY_ITEM_ID[itemId];
}
