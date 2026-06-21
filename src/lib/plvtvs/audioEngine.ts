'use client';

/**
 * Cyberpunk Audio Engine — pure Web Audio API synthesis.
 * No external audio files required; all sounds generated procedurally.
 *
 * Phases:
 *  - Ambient drone (40-60Hz sub-bass + analog hum) - Phase 1 (The Void)
 *  - Cybernetic click + rapid code ticking + sweep - Phase 2 (The Ritual)
 *  - Quantum thud (low boom) at scan completion
 *  - Synth pad (slow chord) - Phase 3 (The Revelation)
 *  - Granular glitch on hover (data swoosh)
 */

type AudioPhase = 'void' | 'ritual' | 'revelation' | 'dashboard';

class PlvtvsAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private padGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private padOscs: OscillatorNode[] = [];
  private muted = false;
  private currentPhase: AudioPhase = 'void';
  private initialized = false;

  init() {
    if (this.initialized) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio not supported', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(
        m ? 0 : 0.3,
        this.ctx.currentTime + 0.3
      );
    }
  }

  isMuted() {
    return this.muted;
  }

  private startAmbientDrone() {
    if (!this.ctx || !this.masterGain) return;
    this.stopAmbientDrone();
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0;
    this.ambientGain.connect(this.masterGain);

    // Sub-bass drone at 50Hz
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subOsc.frequency.value = 50;
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.5;
    this.subOsc.connect(subGain);
    subGain.connect(this.ambientGain);

    // Higher harmonic for "analog hum"
    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.value = 60;
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 120;
    droneFilter.Q.value = 5;
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.08;
    this.droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.ambientGain);

    this.subOsc.start();
    this.droneOsc.start();

    // Fade in
    this.ambientGain.gain.linearRampToValueAtTime(
      0.6,
      this.ctx.currentTime + 2
    );
  }

  private stopAmbientDrone() {
    if (!this.ctx) return;
    if (this.ambientGain) {
      this.ambientGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    }
    const oscs = [this.subOsc, this.droneOsc].filter(Boolean) as OscillatorNode[];
    setTimeout(() => {
      oscs.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* noop */
        }
      });
    }, 600);
    this.subOsc = null;
    this.droneOsc = null;
  }

  private startPad() {
    if (!this.ctx || !this.masterGain) return;
    this.stopPad();
    this.padGain = this.ctx.createGain();
    this.padGain.gain.value = 0;
    this.padGain.connect(this.masterGain);

    // C minor pad: C3, Eb3, G3, Bb3
    const freqs = [130.81, 155.56, 196.0, 233.08];
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;
    filter.connect(this.padGain);

    this.padOscs = freqs.map((f, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      const g = this.ctx!.createGain();
      g.gain.value = 0.15;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      return osc;
    });

    this.padGain.gain.linearRampToValueAtTime(0.35, this.ctx.currentTime + 1.5);
  }

  private stopPad() {
    if (!this.ctx) return;
    if (this.padGain) {
      this.padGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.6);
    }
    const oscs = [...this.padOscs];
    setTimeout(() => {
      oscs.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* noop */
        }
      });
    }, 700);
    this.padOscs = [];
  }

  // === SFX ===

  playClick() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playDataSwoosh() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(4000, t + 0.3);
    filter.Q.value = 8;
    const g = this.ctx.createGain();
    g.gain.value = 0.12;
    noise.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.3);
  }

  playCodeTick() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1800 + Math.random() * 1200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  playQuantumThud() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    // Low sine sweep + noise burst
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.6);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.85);

    // Noise burst
    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
    }
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 300;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.4;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.2);
  }

  playGlitch() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;
    const g = this.ctx.createGain();
    g.gain.value = 0.08;
    noise.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.08);
  }

  playSuccess() {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    // 3-tone ascending arpeggio
    [880, 1320, 1760].forEach((f, i) => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const g = this.ctx!.createGain();
      g.gain.setValueAtTime(0, t + i * 0.08);
      g.gain.linearRampToValueAtTime(0.15, t + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.25);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.3);
    });
  }

  setPhase(phase: AudioPhase) {
    if (phase === this.currentPhase || !this.ctx) return;
    this.currentPhase = phase;
    try {
      if (phase === 'void' || phase === 'ritual') {
        this.startAmbientDrone();
        this.stopPad();
      } else if (phase === 'revelation' || phase === 'dashboard') {
        this.stopAmbientDrone();
        this.startPad();
      }
    } catch (e) {
      console.warn('Audio phase transition failed', e);
    }
  }
}

let engineInstance: PlvtvsAudioEngine | null = null;

export function getAudioEngine(): PlvtvsAudioEngine {
  if (!engineInstance) {
    engineInstance = new PlvtvsAudioEngine();
  }
  return engineInstance;
}

export type { AudioPhase };
