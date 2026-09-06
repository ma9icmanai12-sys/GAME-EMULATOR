import { NES, Controller } from "jsnes";
import { NesAudioContext } from "./audio";
import { NesButton } from "../types";

export const NES_WIDTH = 256;
export const NES_HEIGHT = 240;

const BUTTON_MAP: Record<NesButton, number> = {
  A: Controller.BUTTON_A,
  B: Controller.BUTTON_B,
  SELECT: Controller.BUTTON_SELECT,
  START: Controller.BUTTON_START,
  UP: Controller.BUTTON_UP,
  DOWN: Controller.BUTTON_DOWN,
  LEFT: Controller.BUTTON_LEFT,
  RIGHT: Controller.BUTTON_RIGHT,
  TURBO_A: Controller.BUTTON_A,
  TURBO_B: Controller.BUTTON_B,
};

export interface NesEngineOptions {
  onFpsChange?: (fps: number) => void;
  onError?: (err: any) => void;
}

export class NesEngine {
  private nes: any = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private imageData: ImageData | null = null;
  private buf32: Uint32Array | null = null;
  private audio: NesAudioContext;

  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private animFrameId: number | null = null;

  // FPS tracking
  private lastFpsTime: number = 0;
  private frameCount: number = 0;
  private onFpsChange?: (fps: number) => void;
  private onError?: (err: any) => void;

  // Frame timing
  private lastFrameTime: number = 0;
  private readonly targetFrameMs: number = 1000 / 60; // 60 FPS

  constructor(options?: NesEngineOptions) {
    this.onFpsChange = options?.onFpsChange;
    this.onError = options?.onError;
    this.audio = new NesAudioContext();

    this.initNes();
  }

  private initNes() {
    this.nes = new NES({
      onFrame: (frameBuffer: Uint32Array) => {
        this.renderFrame(frameBuffer);
      },
      onAudioSample: (left: number, right: number) => {
        this.audio.writeAudioSample(left, right);
      },
      emulateSound: true,
    });
  }

  public attachCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
      this.imageData = this.ctx.createImageData(NES_WIDTH, NES_HEIGHT);
      this.buf32 = new Uint32Array(this.imageData.data.buffer);
    }
  }

  public getAudio(): NesAudioContext {
    return this.audio;
  }

  public async loadRom(data: ArrayBuffer | Uint8Array) {
    try {
      this.stop();

      // Ensure data is Uint8Array or binary string as jsnes expects
      let romBuffer: Uint8Array;
      if (data instanceof ArrayBuffer) {
        romBuffer = new Uint8Array(data);
      } else {
        romBuffer = data;
      }

      // Convert Uint8Array to binary string format required by jsnes
      let binaryStr = "";
      const len = romBuffer.length;
      const CHUNK = 8192;
      for (let i = 0; i < len; i += CHUNK) {
        const slice = romBuffer.subarray(i, Math.min(i + CHUNK, len));
        binaryStr += String.fromCharCode.apply(null, slice as any);
      }

      this.initNes();
      this.nes.loadROM(binaryStr);

      this.isPaused = false;
      this.start();
    } catch (err) {
      console.error("[NesEngine] Failed to load ROM:", err);
      this.onError?.(err);
      throw err;
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.lastFpsTime = performance.now();
    this.frameCount = 0;

    const loop = (now: number) => {
      if (!this.isRunning) return;

      const elapsed = now - this.lastFrameTime;
      if (!this.isPaused && elapsed >= this.targetFrameMs - 2) {
        try {
          this.nes.frame();
          this.frameCount++;
        } catch (e) {
          console.error("[NesEngine] Frame emulation error:", e);
        }
        this.lastFrameTime = now;

        // FPS calculation every 500ms
        if (now - this.lastFpsTime >= 500) {
          const fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
          this.onFpsChange?.(fps);
          this.frameCount = 0;
          this.lastFpsTime = now;
        }
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public reset() {
    if (this.nes) {
      try {
        this.nes.reset();
      } catch (e) {
        console.warn("[NesEngine] Reset error:", e);
      }
    }
  }

  public buttonDown(slot: 1 | 2, button: NesButton) {
    if (!this.nes || !this.nes.controllers) return;
    const btnCode = BUTTON_MAP[button];
    if (btnCode !== undefined) {
      const controller = this.nes.controllers[slot];
      if (controller) {
        controller.buttonDown(btnCode);
      }
    }
  }

  public buttonUp(slot: 1 | 2, button: NesButton) {
    if (!this.nes || !this.nes.controllers) return;
    const btnCode = BUTTON_MAP[button];
    if (btnCode !== undefined) {
      const controller = this.nes.controllers[slot];
      if (controller) {
        controller.buttonUp(btnCode);
      }
    }
  }

  private renderFrame(frameBuffer: Uint32Array) {
    if (!this.ctx || !this.imageData || !this.buf32) return;

    // Convert jsnes 0x00RRGGBB buffer to 32-bit little-endian RGBA (0xFFBBGGRR in uint32)
    const buf32 = this.buf32;
    const len = NES_WIDTH * NES_HEIGHT;
    for (let i = 0; i < len; i++) {
      const pixel = frameBuffer[i];
      const r = (pixel >> 16) & 0xff;
      const g = (pixel >> 8) & 0xff;
      const b = pixel & 0xff;
      buf32[i] = 0xff000000 | (b << 16) | (g << 8) | r;
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  public destroy() {
    this.stop();
    this.audio.destroy();
    this.canvas = null;
    this.ctx = null;
    this.imageData = null;
    this.buf32 = null;
  }
}
