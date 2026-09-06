/**
 * NES Audio Context & Sound Synthesizer
 * Provides high-performance retro sound effects for menus
 * and low-latency audio streaming for the NES APU emulator.
 */

export class NesAudioContext {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.5;
  private isMuted: boolean = false;

  // Buffer queue for emulator audio streaming
  private bufferSize: number = 2048;
  private sampleRate: number = 44100;
  private audioBuffer: Float32Array;
  private bufferIndex: number = 0;
  private nextPlayTime: number = 0;

  constructor() {
    this.audioBuffer = new Float32Array(this.bufferSize);
  }

  private initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.sampleRate = this.ctx.sampleRate;
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
          this.masterGain.connect(this.ctx.destination);
          this.nextPlayTime = this.ctx.currentTime;
        }
      } catch (e) {
        console.warn("[NesAudio] AudioContext init error:", e);
      }
    }
  }

  public resume() {
    this.initContext();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  /**
   * Play wheel navigation tick sound
   */
  public playWheelTick() {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.03);

      gain.gain.setValueAtTime(0.12 * this.volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.03);
    } catch (e) {}
  }

  /**
   * Play game selection / confirmation sound
   */
  public playSelectSound() {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(660, now + 0.06);
      osc.frequency.setValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.18 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  /**
   * Play back / cancel / exit sound
   */
  public playBackSound() {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

      gain.gain.setValueAtTime(0.15 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  /**
   * Stream audio sample from emulator APU
   */
  public writeAudioSample(left: number, right: number) {
    if (this.isMuted) return;
    this.audioBuffer[this.bufferIndex++] = (left + right) * 0.5;

    if (this.bufferIndex >= this.bufferSize) {
      this.flushAudio();
    }
  }

  private flushAudio() {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) {
      this.bufferIndex = 0;
      return;
    }

    try {
      const buffer = this.ctx.createBuffer(1, this.bufferSize, this.sampleRate);
      buffer.copyToChannel(this.audioBuffer, 0);

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.masterGain);

      const now = this.ctx.currentTime;
      if (this.nextPlayTime < now) {
        this.nextPlayTime = now + 0.01;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;
    } catch (e) {
      // Ignore audio frame drops
    } finally {
      this.bufferIndex = 0;
    }
  }

  public destroy() {
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {}
      this.ctx = null;
    }
  }
}
