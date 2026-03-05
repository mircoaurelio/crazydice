import * as THREE from 'three';
import gsap from 'gsap';
import { SceneManager } from '../scene/SceneManager';
import { PhysicsWorld } from '../scene/PhysicsWorld';
import { DiceFactory, VAL_TO_INDEX, getBonusColorHex, getBonusColorStr } from '../dice/DiceFactory';
import { DICE_SIZE_HALF } from '../dice/geometry';
import { Die } from '../dice/Die';
import { getQuaternionForFaceValue } from '../dice/getDieValue';
import { faceValueToPerkId, getPerk, getBonusDieLabel, COMBO_VALUE_TO_PERK } from '../perks/perkRegistry';
import type { PerkApplyContext } from '../perks/Perk';
import { ScoringEngine } from '../scoring/ScoringEngine';
import { AudioManager } from '../audio/AudioManager';
import { Particles } from '../fx/Particles';
import { CameraShake } from '../fx/CameraShake';
import { updateBlobDeform } from '../fx/BlobDeform';
import { InputManager } from '../input/InputManager';
import { UIManager } from '../ui/UIManager';
import { GameState } from './GameState';
import { RunState } from './RunState';
import { Shop } from '../shop/Shop';
import { ShopUI } from '../shop/ShopUI';
import {
  INITIAL_DICE_COUNT,
  TIME_PER_ROUND,
  INITIAL_FORTUNE,
  getAnteForRound,
  getTargetScoreToPassAnte,
  isBossRound,
  MIN_ROUND_GOLD,
  ROUND_GOLD_RATE,
  MAX_JUGGLE_MULT,
  MAX_DICE_ON_TABLE,
  BONUS_DIE_LIFETIME,
  REST_VELOCITY_SQ,
  REST_ANGULAR_VELOCITY_SQ,
} from '../constants/config';
import { COMBO_COLORS } from '../dice/diceTextures';

export class Game {
  private readonly sceneManager: SceneManager;
  private readonly physics: PhysicsWorld;
  private readonly diceFactory: DiceFactory;
  private readonly scoring: ScoringEngine;
  private readonly audio: AudioManager;
  private readonly particles: Particles;
  private readonly cameraShake: CameraShake;
  private readonly input: InputManager;
  private readonly ui: UIManager;
  private readonly gameState: GameState;
  private readonly runState: RunState;
  private readonly shop: Shop;
  private readonly shopUI: ShopUI;
  private dice: Die[] = [];
  private clock = new THREE.Clock();

  constructor(container: HTMLElement) {
    this.sceneManager = new SceneManager(container);
    this.physics = new PhysicsWorld();
    this.diceFactory = new DiceFactory(
      this.sceneManager,
      this.physics,
      document.body,
      this.sceneManager.getMaxAnisotropy()
    );
    this.scoring = new ScoringEngine(this.diceFactory, {});
    this.audio = new AudioManager();
    this.particles = new Particles(this.sceneManager.scene);
    this.cameraShake = new CameraShake(this.sceneManager.camera);
    this.input = new InputManager();
    this.ui = new UIManager();
    this.gameState = new GameState();
    this.runState = new RunState();
    this.shop = new Shop(this.gameState);
    this.shopUI = new ShopUI();

    this.input.setCamera(this.sceneManager.camera);
    this.ui.setCamera(this.sceneManager.camera);
    this.runState.diceCount = INITIAL_DICE_COUNT;

    const initialBounds = this.sceneManager.getViewportBoundsOnFloor();
    this.physics.setBounds(initialBounds.minX, initialBounds.maxX, initialBounds.minZ, initialBounds.maxZ);

    this.scoring.setCallbacks({
      onScore: (r, position3D) => {
        this.gameState.totalScore += r.finalScore;
        this.runState.roundScore += r.finalScore;
        this.ui.setScore(this.gameState.totalScore);
        this.ui.setAnteProgress(this.runState.roundScore);
        const multText =
          r.multiplier > 1
            ? r.landings > 1
              ? `x${r.multiplier} [${r.landings}x]`
              : `x${r.multiplier}`
            : '';
        const numberColor =
          r.comboDice.length > 0
            ? COMBO_COLORS[r.comboDice[0]!]?.str ?? 'var(--text-main)'
            : 'var(--text-main)';
        if (position3D) {
          this.sceneManager.showWorldScore(
            position3D,
            `+${r.finalScore}`,
            numberColor,
            multText || undefined
          );
        } else {
          this.ui.showScorePop(
            r.finalScore,
            this.gameState.totalScore,
            r.multiplier,
            r.landings,
            r.comboDice
          );
        }
        this.audio.playScore(r.multiplier);
        if (r.multiplier > 1) {
          document.body.style.backgroundColor = '#e0e4eb';
          setTimeout(() => (document.body.style.backgroundColor = 'var(--bg)'), 100);
        }
      },
      onTower: (_die, _bonus) => {
        this.particles.explosion(_die.mesh.position.clone(), 60, 0xf1c40f);
        this.audio.playTone(1500, 'sine', 0.4, 0.2);
      },
      onComboExplosion: (die) => {
        const col = COMBO_COLORS[die.value];
        if (col) this.particles.explosion(die.mesh.position.clone(), 40, col.hex);
      },
      onSpawnBonusDie: (perkId) => {
        this.spawnDice(1, true, 'bonus', perkId);
        setTimeout(() => this.audio.playPop(), 50);
        this.ui.showFloatingText(new THREE.Vector3(0, 5, 0), 'BONUS DIE! CLICK IT!', true);
      },
      setShake: (i) => {
        this.runState.shakeIntensity = i;
      },
      showFloatingText: (text, isCombo, pos) => {
        if (pos) this.ui.showFloatingText(pos, text, isCombo);
      },
      updateDieComboAppearance: (diceList, comboDice, standard, highlight) => {
        for (const die of diceList) {
          if (die.diceTypeId !== 'normal') continue;
          if (!die.isResting) continue;
          const upIndex = VAL_TO_INDEX[die.value] ?? 2;
          if (comboDice.includes(die.value)) {
            const matArray = [...standard];
            const highlightMats = highlight[die.value];
            const mat = highlightMats?.[upIndex];
            if (mat) matArray[upIndex] = mat;
            die.mesh.material = matArray;
          } else {
            die.mesh.material = standard;
          }
        }
      },
    });
  }

  start(): void {
    this.ui.showOverlay(
      'CRAZY DICE',
      `20 Seconds. Reach the ante target each round to earn gold!`,
      'START'
    );
    this.ui.setScore(0);
    this.ui.setTimer(TIME_PER_ROUND);
    this.ui.setFortuneLabel(`FORTUNE: ${Math.round(INITIAL_FORTUNE * 100)}%`);
    this.gameState.status = 'menu';
    this.ui.getStartButton().addEventListener('click', () => this.handleStart());
    this.input.onClick((die) => {
      if (this.gameState.status !== 'playing') return;
      if (!die) return;
      if (die.diceTypeId === 'bonus') {
        die.bonusTriggerOnLand = true;
        this.rollSingleDie(die, false);
      } else {
        this.rollSingleDie(die, false);
      }
    });
    window.addEventListener('pointermove', (e) => {
      this.input.onPointerMove(e);
      if (this.gameState.status === 'playing') {
        this.input.updateCursor(this.input.getIntersectedDie() !== null);
      }
    });
    window.addEventListener('pointerdown', (e) => this.input.handlePointerDown(e));
    this.shopUI.onContinueClick(() => this.handleShopContinue());
    const playAgainBtn = document.getElementById('play-again-btn');
    if (playAgainBtn) playAgainBtn.addEventListener('click', () => this.handlePlayAgain());
    this.tick();
  }

  /** Call when player loses (e.g. boss defeat). Shows game-over overlay. */
  private showGameOver(): void {
    this.gameState.status = 'gameover';
    this.sceneManager.setBossFloor(false);
    const overlay = document.getElementById('game-over-overlay');
    const bankEl = document.getElementById('game-over-bank');
    if (bankEl) bankEl.textContent = `Bank: ${this.gameState.gold}`;
    if (overlay) overlay.classList.remove('hidden');
  }

  private hideGameOver(): void {
    const overlay = document.getElementById('game-over-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  private handlePlayAgain(): void {
    this.hideGameOver();
    this.gameState.resetRun();
    this.gameState.status = 'menu';
    this.ui.showOverlay(
      'CRAZY DICE',
      `20 Seconds. Reach the ante target each round to earn gold!`,
      'START'
    );
    this.ui.setScore(0);
    this.ui.setTimer(TIME_PER_ROUND);
  }

  private handleShopContinue(): void {
    this.shopUI.hide();
    const nextRound = this.gameState.currentRound + 1;
    const ante = getAnteForRound(nextRound);
    this.audio.playWhistle();
    this.gameState.currentRound++;
    this.runState.resetRound();
    const extraDice = this.gameState.ownedDiceTypeIds.filter((id) => id === 'extra').length;
    this.runState.diceCount = INITIAL_DICE_COUNT + extraDice;
    this.ui.setScore(this.gameState.totalScore);
    this.ui.setTimer(TIME_PER_ROUND);
    this.ui.setTimerDanger(false);
    if (this.gameState.ownedPerkIds.includes('time')) {
      this.runState.timeLeft += 3;
      this.ui.setTimer(this.runState.timeLeft);
    }
    const roundNum = this.gameState.currentRound;
    this.runState.isBossRound = isBossRound(roundNum);
    this.sceneManager.setBossFloor(this.runState.isBossRound);
    this.ui.setAnteTarget(getTargetScoreToPassAnte(ante), ante, roundNum, this.runState.isBossRound);
    this.ui.setAnteProgress(0);
    this.clearDice();
    this.spawnDice(this.runState.diceCount);
    this.dice.forEach((d) => {
      d.body.position.set(
        (Math.random() - 0.5) * 8,
        5 + Math.random() * 5,
        (Math.random() - 0.5) * 8
      );
      this.rollSingleDie(d, true);
    });
    this.ui.updateChips(this.gameState.ownedPerkIds, this.gameState.ownedCardIds, this.gameState.ownedDiceTypeIds);
    this.gameState.status = 'playing';
  }

  private handleStart(): void {
    this.audio.resume();
    this.gameState.resetRun();
    const firstAnte = getAnteForRound(1);
    this.audio.playWhistle();
    this.runState.resetRound();
    const extraDice = this.gameState.ownedDiceTypeIds.filter((id) => id === 'extra').length;
    this.runState.diceCount = INITIAL_DICE_COUNT + extraDice;
    this.ui.hideOverlay();
    this.ui.setScore(this.gameState.totalScore);
    this.ui.setTimer(TIME_PER_ROUND);
    this.ui.setTimerDanger(false);
    if (this.gameState.ownedPerkIds.includes('time')) {
      this.runState.timeLeft += 3;
      this.ui.setTimer(this.runState.timeLeft);
    }
    this.runState.isBossRound = isBossRound(1);
    this.sceneManager.setBossFloor(this.runState.isBossRound);
    this.ui.setAnteTarget(getTargetScoreToPassAnte(firstAnte), firstAnte, 1, this.runState.isBossRound);
    this.ui.setAnteProgress(0);
    this.clearDice();
    this.spawnDice(this.runState.diceCount);
    this.dice.forEach((d) => {
      d.body.position.set(
        (Math.random() - 0.5) * 8,
        5 + Math.random() * 5,
        (Math.random() - 0.5) * 8
      );
      this.rollSingleDie(d, true);
    });
    this.ui.updateChips(this.gameState.ownedPerkIds, this.gameState.ownedCardIds, this.gameState.ownedDiceTypeIds);
    this.gameState.status = 'playing';
  }

  private getMaxJuggleMult(): number {
    const kingCount = this.gameState.ownedCardIds.filter((id) => id === 'king').length;
    return MAX_JUGGLE_MULT + kingCount;
  }

  private clearDice(): void {
    this.dice.forEach((d) => this.diceFactory.destroyDie(d));
    this.dice = [];
    this.input.setDice(this.dice);
  }

  private spawnDice(
    count: number,
    spawnInAir = false,
    diceTypeId: 'normal' | 'bonus' | 'd20' = 'normal',
    bonusPerkId?: string
  ): void {
    const perkId =
      diceTypeId === 'bonus'
        ? bonusPerkId ?? COMBO_VALUE_TO_PERK[Math.floor(Math.random() * 6) + 1]!
        : null;
    const capped =
      diceTypeId === 'normal'
        ? Math.max(0, Math.min(count, MAX_DICE_ON_TABLE - this.dice.length))
        : count;
    for (let i = 0; i < capped; i++) {
      const die = this.diceFactory.createDie(diceTypeId, perkId, spawnInAir);
      if (spawnInAir) die.eligibleForLandingScore = true;
      this.dice.push(die);
    }
    this.input.setDice(this.dice);
  }

  private rollSingleDie(die: Die, isInitialSetup: boolean): void {
    if (!isInitialSetup) {
      this.runState.playerHasRolled = true;
      if (!die.isResting) {
        die.juggleMult = Math.min((die.juggleMult || 1) + 1, this.getMaxJuggleMult());
        this.ui.showFloatingText(die.mesh.position.clone(), `${die.juggleMult}x JUGGLE!`, true);
        this.audio.playTone(400 + die.juggleMult * 100, 'square', 0.1, 0.1);
      } else {
        die.juggleMult = 1;
      }
      this.audio.playPop();
      this.runState.shakeIntensity = Math.max(
        this.runState.shakeIntensity,
        0.1 + 0.05 * (die.juggleMult || 1)
      );
    } else {
      die.juggleMult = 1;
    }
    this.ui.dimScoreContainer();
    if (die.diceTypeId === 'normal') {
      die.mesh.material = this.diceFactory.standardMaterials;
      die.label.classList.remove('combo-label');
      die.label.style.color = 'var(--text-main)';
    }
    die.isResting = false;
    die.eligibleForLandingScore = true;
    die.label.style.opacity = '0';
    die.body.wakeUp();
    if (die.juggleMult > 1) {
      die.body.velocity.set(
        (Math.random() - 0.5) * 2,
        15 + Math.random() * 3 + die.juggleMult * 2,
        (Math.random() - 0.5) * 2
      );
    } else {
      die.body.velocity.set(
        (Math.random() - 0.5) * 8,
        12 + Math.random() * 6,
        (Math.random() - 0.5) * 8
      );
    }
    die.body.angularVelocity.set(
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50,
      (Math.random() - 0.5) * 50
    );
    gsap.fromTo(
      die.mesh.scale,
      { x: 1.5, y: 1.5, z: 1.5 },
      { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(2)' }
    );
  }

  private activateBonusDie(die: Die): void {
    if (die.consumed) return;
    die.consumed = true;
    const val = die.getValue();
    const perkId = die.perkId ?? faceValueToPerkId(val);
    const perk = perkId ? getPerk(perkId) : undefined;
    const pos = die.mesh.position.clone();
    const context: PerkApplyContext = {
      addTime: (s) => {
        this.runState.timeLeft += s;
        this.ui.setTimer(this.runState.timeLeft);
      },
      addGold: (amount) => {
        this.gameState.totalScore += amount;
        this.ui.setScore(this.gameState.totalScore);
        this.ui.setAnteProgress(this.gameState.totalScore);
        const totalEl = document.getElementById('total-score-val');
        if (totalEl) gsap.fromTo(totalEl, { scale: 1.5, color: '#ffd700' }, { scale: 1, duration: 0.5 });
      },
      getTimeBonus: () => (this.gameState.ownedPerkIds.includes('time') ? 3 : 0),
      getGoldBonus: () => (this.gameState.ownedPerkIds.includes('gold') ? 200 : 0),
      rerollAllOtherDice: (except) => {
        this.dice.forEach((other) => {
          if (other !== except && !other.consumed) this.rollSingleDie(other, true);
        });
      },
      spawnDice: (n) => {
        this.spawnDice(n, true, 'normal');
      },
      setAllDiceToSameValue: (value) => {
        const q = getQuaternionForFaceValue(value);
        for (const d of this.dice) {
          if (d.diceTypeId !== 'normal' || d.consumed) continue;
          if (!d.isResting) continue;
          d.body.quaternion.set(q.x, q.y, q.z, q.w);
          d.body.velocity.set(0, 0, 0);
          d.body.angularVelocity.set(0, 0, 0);
          d.value = value;
          d.syncFromBody();
          d.label.innerText = String(value);
        }
      },
      showFloatingText: (text, isCombo) => {
        this.ui.showFloatingText(pos, text, isCombo, perkId ? getBonusColorStr(perkId) : undefined);
      },
      playTone: (freq, type, duration, vol) => {
        this.audio.playTone(freq, type as OscillatorType, duration, vol);
      },
    };
    if (perk) perk.apply(context, die, val as import('../types').DieFaceValue);
    const colorHex = getBonusColorHex(perkId);
    this.runState.shakeIntensity = Math.max(this.runState.shakeIntensity, 0.8);
    const isNova = perkId === 'nova';
    if (isNova) {
      this.particles.explosion(pos.clone(), 280, colorHex, 2.2);
    }
    this.particles.explosion(pos, 120, colorHex);
    gsap.fromTo(
      die.mesh.scale,
      { x: 1, y: 1, z: 1 },
      {
        x: 1.4,
        y: 1.4,
        z: 1.4,
        duration: 0.08,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(die.mesh.scale, {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.2,
            ease: 'power2.in',
            onComplete: () => {
              this.particles.explosion(pos, isNova ? 200 : 150, colorHex, isNova ? 1.8 : 1);
              this.diceFactory.destroyDie(die);
              const idx = this.dice.indexOf(die);
              if (idx > -1) this.dice.splice(idx, 1);
              this.input.setDice(this.dice);
            },
          });
        },
      }
    );
  }

  private tick = (): void => {
    requestAnimationFrame(this.tick);
    const dt = this.clock.getDelta();

    if (this.gameState.status === 'playing') {
      this.runState.timeLeft -= dt;
      if (this.runState.timeLeft < 0) this.runState.timeLeft = 0;
      this.ui.setTimer(this.runState.timeLeft);
      if (this.runState.timeLeft <= 5 && this.runState.timeLeft > 0) {
        this.ui.setTimerDanger(true);
        const currentSec = Math.ceil(this.runState.timeLeft);
        if (currentSec !== this.runState.lastTick) {
          this.audio.playTick();
          this.runState.lastTick = currentSec;
        }
      }
      if (this.runState.timeLeft <= 0) {
        const target = getTargetScoreToPassAnte(getAnteForRound(this.gameState.currentRound));
        if (this.runState.isBossRound && this.runState.roundScore < target) {
          this.audio.playGameOver();
          this.showGameOver();
          return;
        }
        this.audio.playGameOver();
        this.gameState.gold += Math.max(MIN_ROUND_GOLD, Math.floor(this.runState.roundScore * ROUND_GOLD_RATE));
        this.gameState.status = 'shop';
        const offers = this.shop.generateOffers();
        this.shopUI.show(offers, this.gameState.gold, (offerId: string) => {
          if (this.shop.purchase(offerId)) {
            this.audio.playCash();
            this.shopUI.setGold(this.gameState.gold);
          }
        }, getAnteForRound(this.gameState.currentRound + 1));
        return;
      }
    }

    this.physics.step(dt);

    const bounds = this.physics.getBounds();
    if (bounds) {
      for (const die of this.dice) {
        if (die.isResting) continue;
        const m = DICE_SIZE_HALF;
        const p = die.body.position;
        const v = die.body.velocity;
        if (p.x < bounds.minX + m) {
          p.x = bounds.minX + m;
          if (v.x < 0) v.x = 0;
        } else if (p.x > bounds.maxX - m) {
          p.x = bounds.maxX - m;
          if (v.x > 0) v.x = 0;
        }
        if (p.z < bounds.minZ + m) {
          p.z = bounds.minZ + m;
          if (v.z < 0) v.z = 0;
        } else if (p.z > bounds.maxZ - m) {
          p.z = bounds.maxZ - m;
          if (v.z > 0) v.z = 0;
        }
      }
    }

    for (const die of this.dice) {
      die.syncFromBody();
      if (die.diceTypeId === 'bonus' && die.perkId) {
        const perkId = die.perkId;
        die.label.textContent = getBonusDieLabel(perkId);
        die.label.style.color = getBonusColorStr(perkId);
        die.label.style.opacity = die.isResting ? '1' : '0';
        die.label.classList.add('combo-label');
        die.light.color.setHex(getBonusColorHex(perkId));
        die.light.intensity = 1.2;
        die.light.position.copy(die.body.position as unknown as THREE.Vector3);
        die.light.position.y = Math.max(0.2, die.body.position.y - 0.8);
        die.mesh.material = this.diceFactory.getBonusDieMaterials(perkId);
      }
      if (parseFloat(die.label.style.opacity || '0') > 0) {
        const v = die.mesh.position.clone();
        v.y += 1;
        v.project(this.sceneManager.camera);
        const x = (v.x * 0.5 + 0.5) * window.innerWidth;
        const y = (v.y * -0.5 + 0.5) * window.innerHeight;
        die.label.style.left = `${x}px`;
        die.label.style.top = `${y}px`;
      }
    }

    this.particles.update();

    const justLanded: Die[] = [];
    let newLandings = 0;
    for (const die of this.dice) {
      const wasResting = die.isResting;
      const velSq = die.body.velocity.lengthSquared();
      const angVelSq = die.body.angularVelocity.lengthSquared();
      const settled = velSq < REST_VELOCITY_SQ && angVelSq < REST_ANGULAR_VELOCITY_SQ;
      die.updateResting();
      const nowResting = die.isResting;
      const justLandedThisFrame = !wasResting && (nowResting || settled);
      if (die.diceTypeId === 'bonus') {
        if (nowResting && !wasResting) {
          newLandings++;
          justLanded.push(die);
        }
      } else if (justLandedThisFrame && die.eligibleForLandingScore) {
        newLandings++;
        justLanded.push(die);
        die.eligibleForLandingScore = false;
      }
    }
    let scorePosition3D: THREE.Vector3 | undefined;
    if (justLanded.length > 0) {
      scorePosition3D = new THREE.Vector3(0, 0, 0);
      for (const d of justLanded) scorePosition3D.add(d.mesh.position);
      scorePosition3D.divideScalar(justLanded.length);
    }
    if (newLandings > 0 && this.gameState.status === 'playing') {
      for (const die of justLanded) {
        if (die.diceTypeId === 'bonus' && die.bonusTriggerOnLand) {
          this.activateBonusDie(die);
        }
      }
      const landingKey = justLanded
        .map((d) => d.mesh.id)
        .sort((a, b) => a - b)
        .join(',');
      const reportScore = landingKey !== this.runState.lastReportedLandingKey;
      if (reportScore) this.runState.lastReportedLandingKey = landingKey;
      this.scoring.calculateResults(
        this.dice,
        newLandings,
        this.runState.playerHasRolled,
        this.gameState.status,
        scorePosition3D,
        reportScore,
        justLanded
      );
    }

    // Bonus dice: start countdown when landed; blob with organic motion; shrink then puff when time runs out
    const elapsed = this.clock.getElapsedTime();
    for (const die of this.dice) {
      if (die.diceTypeId !== 'bonus' || die.consumed || die.bonusPuffing) continue;
      if (die.isResting && die.bonusTimeLeft === undefined) {
        die.bonusTimeLeft = BONUS_DIE_LIFETIME;
        if (die.floorBlob) die.floorBlob.visible = true;
        if (die.floorAura) die.floorAura.visible = true;
      }
      if (die.bonusTimeLeft === undefined) continue;
      die.bonusTimeLeft -= dt;
      if (die.floorBlob && die.perkId) {
        updateBlobDeform(die.floorBlob, elapsed);
        const t = Math.max(0, die.bonusTimeLeft) / BONUS_DIE_LIFETIME;
        die.floorBlob.scale.setScalar(t);
        die.floorBlob.position.y = 0.02;
        const col = getBonusColorHex(die.perkId);
        const mat = die.floorBlob.material as THREE.MeshBasicMaterial;
        if (mat.color) mat.color.setHex(col);
        mat.opacity = 0.88;
      }
      if (die.floorAura && die.perkId) {
        const t = Math.max(0, die.bonusTimeLeft!) / BONUS_DIE_LIFETIME;
        die.floorAura.scale.setScalar(t);
        die.floorAura.position.y = 0.01;
        const auraMat = die.floorAura.material as THREE.MeshBasicMaterial;
        if (auraMat.color) auraMat.color.setHex(getBonusColorHex(die.perkId));
        auraMat.opacity = 0.2;
      }
      if (die.bonusTimeLeft <= 0) {
        die.bonusPuffing = true;
        const blob = die.floorBlob;
        const puffDie = die;
        const puffColor = getBonusColorHex(puffDie.perkId);
        const onPuffComplete = () => {
          this.particles.explosion(puffDie.mesh.position.clone(), 150, puffColor);
          this.diceFactory.destroyDie(puffDie);
          const idx = this.dice.indexOf(puffDie);
          if (idx > -1) this.dice.splice(idx, 1);
          this.input.setDice(this.dice);
        };
        gsap.to(die.mesh.scale, {
          x: 0,
          y: 0,
          z: 0,
          duration: 0.35,
          ease: 'power2.in',
        });
        if (blob) {
          gsap.to(blob.scale, {
            x: 0,
            y: 0,
            z: 0,
            duration: 0.35,
            ease: 'power2.in',
            onComplete: onPuffComplete,
          });
        } else {
          gsap.delayedCall(0.35, onPuffComplete);
        }
      }
    }

    this.runState.shakeIntensity -= 0.02;
    if (this.runState.shakeIntensity < 0) this.runState.shakeIntensity = 0;
    this.cameraShake.intensity = this.runState.shakeIntensity;
    this.cameraShake.update();
    if (this.runState.isBossRound && this.gameState.status === 'playing') {
      this.sceneManager.updateBossFloorTime(this.clock.getElapsedTime());
    }
    this.sceneManager.render();
  };

  onResize(): void {
    this.sceneManager.resize();
    const b = this.sceneManager.getViewportBoundsOnFloor();
    this.physics.setBounds(b.minX, b.maxX, b.minZ, b.maxZ);
  }
}
