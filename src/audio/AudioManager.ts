export class AudioManager {
  private readonly ctx: AudioContext;

  constructor() {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
  }

  resume(): void {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1): void {
    if (this.ctx.state === 'suspended') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playPop(): void {
    if (this.ctx.state === 'suspended') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playWhistle(): void {
    if (this.ctx.state === 'suspended') return;
    const duration = 0.6;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc1.type = 'triangle';
    osc2.type = 'triangle';
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    mod.type = 'sine';
    mod.frequency.value = 50;
    modGain.gain.value = 100;
    osc1.frequency.setValueAtTime(2600, this.ctx.currentTime);
    osc2.frequency.setValueAtTime(2650, this.ctx.currentTime);
    mod.connect(modGain);
    modGain.connect(osc1.frequency);
    modGain.connect(osc2.frequency);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
    osc1.start();
    osc2.start();
    mod.start();
    osc1.stop(this.ctx.currentTime + duration);
    osc2.stop(this.ctx.currentTime + duration);
    mod.stop(this.ctx.currentTime + duration);
  }

  playScore(multiplier: number): void {
    if (this.ctx.state === 'suspended') return;
    if (multiplier === 1) {
      this.playTone(300 + Math.random() * 100, 'sine', 0.1, 0.1);
    } else {
      const baseFreq = Math.min(300 + multiplier * 50, 1000);
      this.playTone(baseFreq, 'square', 0.2, 0.1);
      setTimeout(() => this.playTone(baseFreq * 1.25, 'sine', 0.3, 0.15), 30);
      setTimeout(() => this.playTone(baseFreq * 1.5, 'triangle', 0.4, 0.1), 70);
    }
  }

  playTick(): void {
    this.playTone(800, 'square', 0.05, 0.05);
  }

  playGameOver(): void {
    if (this.ctx.state === 'suspended') return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 1);
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 1);
  }

  /** Cash/coin sound for shop purchases. */
  playCash(): void {
    if (this.ctx.state === 'suspended') return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.setValueAtTime(1320, t + 0.06);
    osc.frequency.setValueAtTime(1760, t + 0.12);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.08);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.14);
    gain.gain.linearRampToValueAtTime(0, t + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.22);
  }
}
