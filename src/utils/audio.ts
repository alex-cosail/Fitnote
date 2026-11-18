// Offline Web Audio API sound synthesizer (no external audio assets required)

class SoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.14,
    delaySec = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  unlock() {
    this.getContext();
  }

  playTick(muted: boolean) {
    if (muted) return;
    this.playTone(660, 0.08, 'triangle', 0.12);
  }

  playGo(muted: boolean) {
    if (muted) return;
    this.playTone(880, 0.12, 'sine', 0.18, 0);
    this.playTone(1174.66, 0.22, 'sine', 0.2, 0.11);
  }

  playDone(muted: boolean) {
    if (muted) return;
    this.playTone(523.25, 0.09, 'triangle', 0.14, 0);
    this.playTone(659.25, 0.13, 'triangle', 0.14, 0.07);
  }

  playRound(muted: boolean) {
    if (muted) return;
    this.playTone(440, 0.12, 'sine', 0.16, 0);
    this.playTone(659.25, 0.12, 'sine', 0.16, 0.1);
    this.playTone(880, 0.24, 'sine', 0.18, 0.2);
  }

  playFinish(muted: boolean) {
    if (muted) return;
    this.playTone(523.25, 0.14, 'sine', 0.16, 0);
    this.playTone(659.25, 0.14, 'sine', 0.16, 0.12);
    this.playTone(783.99, 0.16, 'sine', 0.18, 0.24);
    this.playTone(1046.5, 0.38, 'sine', 0.2, 0.36);
  }
}

export const soundEngine = new SoundEngine();
