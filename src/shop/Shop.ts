import type { ShopOffer } from '../types';
import type { GameState } from '../game/GameState';
import { getFishForItemId } from './fishRegistry';

const OFFER_COUNT = 3;

/** Generates shop offers and handles purchase. */
export class Shop {
  private offers: ShopOffer[] = [];

  constructor(private gameState: GameState) {}

  /** Generate new offers for the current run. */
  generateOffers(): ShopOffer[] {
    const pool: ShopOffer[] = [
      { id: 'perk-time-1', kind: 'perk', name: 'Time+', description: '+3s on bonus die', price: 500, itemId: 'time', fish: getFishForItemId('time')! },
      { id: 'perk-gold-1', kind: 'perk', name: 'Gold+', description: '+200/face on gold die', price: 500, itemId: 'gold', fish: getFishForItemId('gold')! },
      { id: 'perk-nova-1', kind: 'perk', name: 'Nova', description: 'Re-roll all dice', price: 500, itemId: 'nova', fish: getFishForItemId('nova')! },
      { id: 'card-king-1', kind: 'card', name: 'King', description: '+1 juggle cap (max 6x)', price: 300, itemId: 'king', fish: getFishForItemId('king')! },
      { id: 'dice-extra-1', kind: 'dice', name: 'Extra Die', description: '+1 die per round', price: 400, itemId: 'extra', fish: getFishForItemId('extra')! },
    ];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    this.offers = shuffled.slice(0, OFFER_COUNT);
    return this.offers;
  }

  getOffers(): ShopOffer[] {
    return this.offers;
  }

  canAfford(price: number): boolean {
    return this.gameState.gold >= price;
  }

  purchase(offerId: string): boolean {
    const offer = this.offers.find((o) => o.id === offerId);
    if (!offer || this.gameState.gold < offer.price) return false;
    this.gameState.gold -= offer.price;
    if (offer.kind === 'perk') this.gameState.ownedPerkIds.push(offer.itemId);
    if (offer.kind === 'card') this.gameState.ownedCardIds.push(offer.itemId);
    if (offer.kind === 'dice') this.gameState.ownedDiceTypeIds.push(offer.itemId);
    this.offers = this.offers.filter((o) => o.id !== offerId);
    return true;
  }
}
