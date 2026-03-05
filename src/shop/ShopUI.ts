import type { ShopOffer } from '../types';

export class ShopUI {
  private readonly overlay: HTMLElement;
  private readonly itemsContainer: HTMLElement;
  private readonly goldEl: HTMLElement | null;
  private readonly continueBtn: HTMLElement;
  private onContinue: (() => void) | null = null;

  constructor() {
    const overlay = document.getElementById('shop-overlay');
    const items = document.getElementById('shop-items');
    const continueBtn = document.getElementById('shop-continue-btn');
    if (!overlay || !items || !continueBtn) throw new Error('Missing shop DOM elements');
    this.overlay = overlay;
    this.itemsContainer = items;
    this.goldEl = document.getElementById('shop-gold');
    this.continueBtn = continueBtn;
    this.continueBtn.addEventListener('click', () => this.onContinue?.());
  }

  setGold(gold: number): void {
    const valEl = document.getElementById('shop-gold-val');
    if (valEl) valEl.textContent = String(gold);
    if (this.goldEl) this.goldEl.setAttribute('aria-label', `Gold: ${gold}`);
  }

  show(offers: ShopOffer[], gold: number, onPurchase: (offerId: string) => void, ante?: number): void {
    this.setGold(gold);
    const anteHint = document.getElementById('shop-ante-hint');
    if (anteHint) anteHint.textContent = ante != null ? `Next round target: reach ${ante} gold to earn` : '';
    this.itemsContainer.innerHTML = '';
    for (const offer of offers) {
      const el = document.createElement('div');
      const canAfford = gold >= offer.price;
      el.className = `shop-item ${canAfford ? 'shop-item-afford' : 'shop-item-cannot-afford'}`;
      el.dataset.offerId = offer.id;
      el.dataset.price = String(offer.price);
      const fish = offer.fish;
      el.innerHTML = `
        <div class="shop-item-fish" title="${fish.name}">${fish.emoji}</div>
        <div class="shop-item-body">
          <div class="shop-item-name">${offer.name}</div>
          ${offer.description ? `<div class="shop-item-desc">${offer.description}</div>` : ''}
          <div class="shop-item-price"><span class="shop-item-price-icon">🪙</span> ${offer.price}</div>
        </div>
      `;
      el.addEventListener('click', () => {
        if (gold >= offer.price) onPurchase(offer.id);
      });
      this.itemsContainer.appendChild(el);
    }
    this.overlay.classList.remove('hidden');
  }

  hide(): void {
    this.overlay.classList.add('hidden');
  }

  onContinueClick(callback: () => void): void {
    this.onContinue = callback;
  }
}
