import { BgmTrack, MedievalBgmEngine } from './bgmEngine';

export type { BgmTrack };

class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private bgm = new MedievalBgmEngine();
  private desiredTrack: BgmTrack | null = null;

  private getOrCreateContext(): AudioContext | null {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    const ctx = this.getOrCreateContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(() => {
          if (!this.muted && this.desiredTrack && this.ctx) {
            this.bgm.startOrSwitchTrack(this.ctx, this.desiredTrack);
          }
        })
        .catch(() => {
          // Will unlock on next user gesture
        });
    }
    return ctx;
  }

  public unlockAndSyncBgm(track?: BgmTrack): void {
    if (track) {
      this.desiredTrack = track;
    }
    const ctx = this.getOrCreateContext();
    if (!ctx) return;

    this.bgm.setMuted(this.muted);
    if (ctx.state === 'suspended') {
      void ctx
        .resume()
        .then(() => {
          if (!this.muted && this.desiredTrack && this.ctx) {
            this.bgm.startOrSwitchTrack(this.ctx, this.desiredTrack);
          }
        })
        .catch(() => {
          // Will unlock on next user gesture
        });
    }
    if (!this.muted && this.desiredTrack) {
      this.bgm.startOrSwitchTrack(ctx, this.desiredTrack);
    }
  }

  public setBgmTrack(track: BgmTrack | null): void {
    this.desiredTrack = track;
    if (!track) {
      this.bgm.fadeOut();
      return;
    }
    if (!this.ctx) {
      // Wait for user gesture unlock
      return;
    }
    if (!this.muted) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().catch(() => {});
      }
      this.bgm.startOrSwitchTrack(this.ctx, track);
    }
  }

  public fadeOutBgm(): void {
    this.desiredTrack = null;
    this.bgm.fadeOut();
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    this.bgm.setMuted(muted);
    if (!muted && this.desiredTrack) {
      this.unlockAndSyncBgm(this.desiredTrack);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  // ============================================================================
  // MEDIEVAL UI & TRANSITION SOUND EFFECTS (Every button click & state shift)
  // ============================================================================

  /** Standard tactile castle-latch / gilded wood click for every button */
  public playUiClick(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Warm wooden body tap
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(620, now);
    body.frequency.exponentialRampToValueAtTime(290, now + 0.045);
    bodyGain.gain.setValueAtTime(0.085, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.055);
    body.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    body.start(now);
    body.stop(now + 0.065);

    // Subtle gilded bronze harmonic glint
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(1318.5, now); // E6
    pingGain.gain.setValueAtTime(0.03, now);
    pingGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.06);
    ping.connect(pingGain);
    pingGain.connect(ctx.destination);
    ping.start(now);
    ping.stop(now + 0.07);
  }

  /** Heroic royal fifth harp/lute chime for primary CTAs (Start, Co-op, Buy, Wave) */
  public playUiConfirm(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Low tactile wood weight
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(210, now);
    thump.frequency.exponentialRampToValueAtTime(115, now + 0.07);
    thumpGain.gain.setValueAtTime(0.07, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.08);
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.09);

    // Royal D5 -> A5 fifth chime
    const notes = [587.33, 880.0];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.048;
      const osc = ctx.createOscillator();
      const over = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      over.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      over.frequency.setValueAtTime(freq * 2, start);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3400, start);
      filter.frequency.exponentialRampToValueAtTime(1100, start + 0.19);

      const overGain = ctx.createGain();
      overGain.gain.setValueAtTime(0.24, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(idx === 1 ? 0.085 : 0.07, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.21);

      osc.connect(filter);
      over.connect(overGain);
      overGain.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      over.start(start);
      osc.stop(start + 0.23);
      over.stop(start + 0.23);
    });
  }

  /** Crisp light harp/lute pluck for tabs, camera cycles, speed & tower selection */
  public playUiTab(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(784.0, now); // G5
    osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.032); // A5 slight lift

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.exponentialRampToValueAtTime(950, now + 0.075);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.068, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.082);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /** Grounded descending woodblock tick for cancel / close / exit / refund */
  public playUiCancel(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(392.0, now);
    osc.frequency.exponentialRampToValueAtTime(215.0, now + 0.075);

    gain.gain.setValueAtTime(0.078, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.085);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.095);
  }

  /** Deep dramatic medieval war-horn swell + timpani hit when marching into battle */
  public playBattleTransitionHorn(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Resonant war drum impact
    const drum = ctx.createOscillator();
    const drumGain = ctx.createGain();
    drum.type = 'sine';
    drum.frequency.setValueAtTime(112, now);
    drum.frequency.exponentialRampToValueAtTime(46, now + 0.14);
    drumGain.gain.setValueAtTime(0.0001, now);
    drumGain.gain.linearRampToValueAtTime(0.24, now + 0.012);
    drumGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);
    drum.connect(drumGain);
    drumGain.connect(ctx.destination);
    drum.start(now);
    drum.stop(now + 0.7);

    // Fifth war-horn brass chord (E2 + B2 + E3)
    const freqs = [82.41, 123.47, 164.81];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + 0.04);
      osc.detune.setValueAtTime(idx === 1 ? 5 : idx === 2 ? -5 : 0, now + 0.04);

      filter.type = 'lowpass';
      filter.Q.setValueAtTime(2.0, now + 0.04);
      filter.frequency.setValueAtTime(240, now + 0.04);
      filter.frequency.exponentialRampToValueAtTime(1350, now + 0.42);
      filter.frequency.exponentialRampToValueAtTime(520, now + 1.38);

      const peak = idx === 0 ? 0.085 : 0.068;
      gain.gain.setValueAtTime(0.0001, now + 0.04);
      gain.gain.linearRampToValueAtTime(peak, now + 0.34);
      gain.gain.setValueAtTime(peak * 0.85, now + 0.92);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.48);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + 0.04);
      osc.stop(now + 1.52);
    });
  }

  // ============================================================================
  // BATTLE COMBAT SOUND EFFECTS
  // ============================================================================

  public playBowShot(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playFlameLaunch(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.22);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playFrostPulse(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playTeslaZap(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.1);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playBuildOrUpgrade(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [440, 660].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);
      gain.gain.setValueAtTime(0.09, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.13);
    });
  }

  public playWaveStart(isBoss = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = isBoss ? [146.8, 174.6, 220] : [220, 293.6, 392];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isBoss ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      gain.gain.setValueAtTime(0.08, now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.3);
    });
  }

  public playLordSkill(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.42);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.46);
  }
}

export const soundEngine = new ProceduralSoundEngine();
