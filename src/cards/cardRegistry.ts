import type { Card } from './Card';

/** Stub cards for future use (e.g. King: +1 juggle cap). */
const kingCard: Card = {
  id: 'king',
  suit: 'hearts',
  rank: 'K',
  bonusDescription: '+1 juggle cap',
  apply(_gameState) {
    // Future: e.g. increase max juggle mult
  },
};

const registry: Record<string, Card> = {
  king: kingCard,
};

export function getCard(id: string): Card | undefined {
  return registry[id];
}

export function getAllCards(): Card[] {
  return Object.values(registry);
}
