import gsap from 'gsap';
import type { PerspectiveCamera } from 'three';
import type { Vector3 } from 'three';
import { getFishForItemId } from '../shop/fishRegistry';

export class UIManager {
  private readonly totalScoreVal: HTMLElement;
  private readonly timerVal: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly overlayTitle: HTMLElement;
  private readonly overlayDesc: HTMLElement;
  private readonly startBtn: HTMLElement;
  private readonly hugeScore: HTMLElement;
  private readonly multiplierText: HTMLElement;
  private readonly scoreContainer: HTMLElement;
  private readonly fortuneLabel: HTMLElement;
  private readonly chipsContainer: HTMLElement | null;
  private readonly anteTargetVal: HTMLElement | null;
  private readonly anteSublabel: HTMLElement | null;
  private readonly anteProgress: HTMLElement | null;
  private readonly anteNumber: HTMLElement | null;
  private readonly anteProgressBarFill: HTMLElement | null;
  private readonly anteContainer: HTMLElement | null;
  private anteTargetScore = 0;
  private camera: PerspectiveCamera | null = null;
  /** Last value we displayed (for count-up start). */
  private lastDisplayedScore = 0;
  private scoreTweenTarget: { value: number } = { value: 0 };

  constructor() {
    const get = (id: string) => {
      const el = document.getElementById(id);
      if (!el) throw new Error(`Missing #${id}`);
      return el;
    };
    this.totalScoreVal = get('total-score-val');
    this.timerVal = get('timer-val');
    this.overlay = get('overlay');
    this.overlayTitle = get('overlay-title');
    this.overlayDesc = get('overlay-desc');
    this.startBtn = get('start-btn');
    this.hugeScore = get('huge-score');
    this.multiplierText = get('multiplier-text');
    this.scoreContainer = get('score-container');
    this.fortuneLabel = get('fortune-label');
    this.chipsContainer = document.getElementById('chips-container');
    this.anteTargetVal = document.getElementById('ante-target-val');
    this.anteSublabel = document.getElementById('ante-sublabel');
    this.anteProgress = document.getElementById('ante-progress');
    this.anteNumber = document.getElementById('ante-number');
    this.anteProgressBarFill = document.getElementById('ante-progress-bar-fill');
    this.anteContainer = document.getElementById('ante-container');
  }

  /** Set the "to pass" target (Balatro-style): score needed to earn the ante. */
  setAnteTarget(targetScore: number, anteGold: number, anteLevel = 1, isBossRound = false): void {
    this.anteTargetScore = targetScore;
    if (this.anteTargetVal) this.anteTargetVal.textContent = this.formatScore(targetScore);
    if (this.anteSublabel) this.anteSublabel.textContent = `score to earn ${this.formatScore(anteGold)} gold`;
    if (this.anteNumber) this.anteNumber.textContent = isBossRound ? `BOSS – ANTE ${anteLevel}` : `ANTE ${anteLevel}`;
    if (this.anteContainer) {
      this.anteContainer.classList.remove('ante-passed');
      this.anteContainer.classList.toggle('ante-boss', isBossRound);
    }
    this.setAnteProgress(0, targetScore);
  }

  /** Update current score vs target during the round; updates progress bar. */
  setAnteProgress(currentScore: number, targetScore?: number): void {
    const target = targetScore ?? this.anteTargetScore;
    if (this.anteProgress) this.anteProgress.textContent = `${this.formatScore(currentScore)} / ${this.formatScore(target)}`;
    if (this.anteProgressBarFill) {
      const pct = target > 0 ? Math.min(100, (currentScore / target) * 100) : 0;
      this.anteProgressBarFill.style.width = `${pct}%`;
    }
    if (this.anteContainer && target > 0 && currentScore >= target) {
      this.anteContainer.classList.add('ante-passed');
    }
  }

  /** Update the casino chips shown during the run (one chip per owned shop item). */
  updateChips(ownedPerkIds: string[], ownedCardIds: string[], ownedDiceTypeIds: string[] = []): void {
    if (!this.chipsContainer) return;
    const itemIds = [...ownedPerkIds, ...ownedCardIds, ...ownedDiceTypeIds];
    this.chipsContainer.innerHTML = '';
    for (const itemId of itemIds) {
      const fish = getFishForItemId(itemId);
      if (!fish) continue;
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.title = fish.name;
      chip.textContent = fish.emoji;
      this.chipsContainer.appendChild(chip);
    }
  }

  setCamera(camera: PerspectiveCamera): void {
    this.camera = camera;
  }

  showOverlay(title: string, desc: string, buttonText: string): void {
    this.overlayTitle.textContent = title;
    this.overlayDesc.textContent = desc;
    this.startBtn.textContent = buttonText;
    this.overlay.style.display = 'flex';
  }

  hideOverlay(): void {
    this.overlay.style.display = 'none';
  }

  setScore(total: number): void {
    if (total <= this.lastDisplayedScore || total === 0) {
      gsap.killTweensOf(this.scoreTweenTarget);
      this.lastDisplayedScore = total;
      this.totalScoreVal.textContent = this.formatScore(total);
      return;
    }
    gsap.killTweensOf(this.scoreTweenTarget);
    this.lastDisplayedScore = Math.round(this.scoreTweenTarget.value);
    this.scoreTweenTarget.value = this.lastDisplayedScore;
    const startFrom = this.lastDisplayedScore;
    const duration = Math.min(0.85, 0.35 + (total - startFrom) / 8000);
    gsap.to(this.scoreTweenTarget, {
      value: total,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        this.totalScoreVal.textContent = this.formatScore(Math.round(this.scoreTweenTarget.value));
      },
      onComplete: () => {
        this.lastDisplayedScore = total;
        this.totalScoreVal.textContent = this.formatScore(total);
      },
    });
  }

  private formatScore(n: number): string {
    return n.toLocaleString();
  }

  setTimer(seconds: number): void {
    this.timerVal.textContent = seconds.toFixed(2);
  }

  setTimerDanger(danger: boolean): void {
    if (danger) this.timerVal.classList.add('danger');
    else this.timerVal.classList.remove('danger');
  }

  setMultiplier(text: string, isCombo: boolean): void {
    this.multiplierText.textContent = text;
    this.multiplierText.style.color = isCombo ? 'var(--primary)' : 'var(--secondary)';
  }

  setFortuneLabel(text: string): void {
    this.fortuneLabel.textContent = text;
  }

  showScorePop(
    finalScore: number,
    totalScore: number,
    multiplier: number,
    landings: number,
    _comboDice: number[] = []
  ): void {
    this.hugeScore.textContent = `+${finalScore}`;
    this.multiplierText.textContent =
      multiplier > 1 ? (landings > 1 ? `x${multiplier} [${landings}x]` : `x${multiplier}`) : '';
    /* Score and multiplier use different CSS gradients; combo color not applied to multiplier to keep gradient */
    gsap.killTweensOf(this.scoreContainer);
    gsap.fromTo(
      this.scoreContainer,
      { opacity: 0, scale: 0.2, y: 50 },
      { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' }
    );
    this.setScore(totalScore);
    gsap.fromTo(
      this.totalScoreVal,
      { scale: 1.8, color: '#ff6b6b' },
      { scale: 1, color: 'var(--text-main)', duration: 0.8, ease: 'elastic.out(1, 0.4)' }
    );
  }

  showReady(): void {
    this.hugeScore.textContent = 'READY';
    this.multiplierText.textContent = 'CLICK A DIE TO SCORE!';
    this.multiplierText.style.color = 'var(--secondary)';
    gsap.killTweensOf(this.scoreContainer);
    gsap.to(this.scoreContainer, { opacity: 1, y: 0, scale: 1, duration: 0.5 });
  }

  dimScoreContainer(): void {
    gsap.to(this.scoreContainer, { opacity: 0.3, duration: 0.1, scale: 0.9 });
  }

  showFloatingText(pos3D: Vector3, text: string, isCombo: boolean, colorStr?: string): void {
    if (!this.camera) return;
    const vector = pos3D.clone().project(this.camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vector.y * -0.5 + 0.5) * window.innerHeight;
    const el = document.createElement('div');
    el.className = 'floating-text';
    if (colorStr) el.style.color = colorStr;
    else if (isCombo) el.style.color = 'var(--primary)';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    const layer = document.getElementById('floating-text-layer');
    (layer ?? document.body).appendChild(el);
    gsap.fromTo(
      el,
      { y, opacity: 1, scale: 0.1 },
      { y: y - 100, opacity: 0, scale: 2, duration: 1.5, ease: 'elastic.out(1, 0.4)', onComplete: () => el.remove() }
    );
  }

  getStartButton(): HTMLElement {
    return document.getElementById('start-btn') ?? this.startBtn;
  }
}
