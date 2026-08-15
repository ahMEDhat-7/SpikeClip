import {
  initWebGL,
  renderWithEffects,
  renderPassthrough,
  getEffectType,
  type WebGLEffectsContext,
} from "./webgl-effects";
import type { StudioAction } from "@spikeclips/shared";

export interface EffectState {
  vignetteIntensity: number;
  blurIntensity: number;
  sepiaIntensity: number;
  bwIntensity: number;
  sharpenIntensity: number;
  glitchIntensity: number;
  glowIntensity: number;
  zoomIntensity: number;
  zoomDirection: "in" | "out" | null;
  speed: number;
  transitionFade: { position: "start" | "end"; duration: number } | null;
}

export function createDefaultEffectState(): EffectState {
  return {
    vignetteIntensity: 0,
    blurIntensity: 0,
    sepiaIntensity: 0,
    bwIntensity: 0,
    sharpenIntensity: 0,
    glitchIntensity: 0,
    glowIntensity: 0,
    zoomIntensity: 0,
    zoomDirection: null,
    speed: 1,
    transitionFade: null,
  };
}

export function applyActionsToEffectState(
  actions: StudioAction[],
  state: EffectState
): EffectState {
  const result = { ...state };

  for (const action of actions) {
    if (action.action === "apply_effect") {
      const e = action;
      switch (e.type) {
        case "vignette":
          result.vignetteIntensity = e.intensity;
          break;
        case "blur":
          result.blurIntensity = e.intensity;
          break;
        case "sepia":
          result.sepiaIntensity = e.intensity;
          break;
        case "bw":
          result.bwIntensity = e.intensity;
          break;
        case "sharpen":
          result.sharpenIntensity = e.intensity;
          break;
        case "glitch":
          result.glitchIntensity = e.intensity;
          break;
        case "glow":
          result.glowIntensity = e.intensity;
          break;
        case "zoom_in":
          result.zoomIntensity = e.intensity;
          result.zoomDirection = "in";
          break;
        case "zoom_out":
          result.zoomIntensity = e.intensity;
          result.zoomDirection = "out";
          break;
      }
    } else if (action.action === "set_speed") {
      result.speed = action.rate;
    } else if (action.action === "set_transition") {
      result.transitionFade = {
        position: action.position,
        duration: action.duration,
      };
    }
  }

  return result;
}

export interface CaptionDef {
  text: string;
  font: string;
  size: number;
  color: string;
  x: number;
  y: number;
  start: number;
  end: number;
  style: string;
  strokeWidth: number;
  opacity: number;
  backgroundEnabled: boolean;
  backgroundColor: string;
  animation: string;
}

export interface OverlayDef {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  opacity?: number;
}

export interface RenderState {
  effects: EffectState;
  captions: CaptionDef[];
  overlays: OverlayDef[];
  layout: string;
  sceneElapsed: number;
  sceneDuration: number;
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx2d: CanvasRenderingContext2D;
  private webgl: WebGLEffectsContext | null = null;
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private width = 1080;
  private height = 1920;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx2d = canvas.getContext("2d")!;
    this.webgl = initWebGL(canvas);

    if (this.webgl) {
      const gl = this.webgl.gl;
      gl.canvas.addEventListener("webglcontextlost", () => {
        this.webgl = null;
      });
      gl.canvas.addEventListener("webglcontextrestored", () => {
        this.webgl = initWebGL(this.canvas);
      });
    }

    this.offscreen = document.createElement("canvas");
    this.offscreen.width = this.width;
    this.offscreen.height = this.height;
    this.offCtx = this.offscreen.getContext("2d")!;
  }

  renderFrame(
    frame: VideoFrame,
    state: RenderState
  ): void {
    const { effects, captions, overlays, layout, sceneElapsed, sceneDuration } = state;

    if (this.webgl) {
      let effectType = 0;
      let intensity = 0;

      if (effects.vignetteIntensity > 0) {
        effectType = getEffectType("vignette");
        intensity = effects.vignetteIntensity;
      } else if (effects.blurIntensity > 0) {
        effectType = getEffectType("blur");
        intensity = effects.blurIntensity;
      } else if (effects.sepiaIntensity > 0) {
        effectType = getEffectType("sepia");
        intensity = effects.sepiaIntensity;
      } else if (effects.bwIntensity > 0) {
        effectType = getEffectType("bw");
        intensity = effects.bwIntensity;
      } else if (effects.sharpenIntensity > 0) {
        effectType = getEffectType("sharpen");
        intensity = effects.sharpenIntensity;
      } else if (effects.glitchIntensity > 0) {
        effectType = getEffectType("glitch");
        intensity = effects.glitchIntensity;
      } else if (effects.glowIntensity > 0) {
        effectType = getEffectType("glow");
        intensity = effects.glowIntensity;
      }

      if (effectType > 0) {
        renderWithEffects(this.webgl, frame, effectType, intensity, sceneElapsed);
      } else {
        renderPassthrough(this.webgl, frame);
      }
    } else {
      this.offCtx.drawImage(frame, 0, 0, this.width, this.height);
      this.ctx2d.drawImage(this.offscreen, 0, 0);
    }

    this.renderCaptions(captions, sceneElapsed);
    this.renderOverlays(overlays, sceneElapsed, sceneDuration);
  }

  private renderCaptions(captions: CaptionDef[], elapsed: number): void {
    const ctx = this.ctx2d;

    for (const cap of captions) {
      if (elapsed < cap.start || elapsed > cap.end) continue;

      let alpha = cap.opacity;
      if (cap.animation === "fade") {
        const fadeDur = 0.3;
        if (elapsed - cap.start < fadeDur) {
          alpha *= (elapsed - cap.start) / fadeDur;
        }
      }

      let fontSize = cap.size;
      if (cap.animation === "pop") {
        const popDur = 0.15;
        const popElapsed = elapsed - cap.start;
        if (popElapsed < popDur) {
          const progress = popElapsed / popDur;
          fontSize = cap.size * 0.5 + cap.size * 1.5 * progress;
        }
      }

      if (cap.animation === "slide") {
        const slideDur = 0.4;
        const slideElapsed = elapsed - cap.start;
        if (slideElapsed < slideDur) {
          const progress = slideElapsed / slideDur;
          const eased = 1 - Math.pow(1 - progress, 3);
          alpha *= eased;
        }
      }

      const x = (cap.x / 100) * this.width;
      const y = (cap.y / 100) * this.height;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${fontSize}px ${cap.font}, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (cap.backgroundEnabled && cap.backgroundColor) {
        ctx.fillStyle = cap.backgroundColor + "80";
        const textWidth = ctx.measureText(cap.text).width;
        ctx.fillRect(
          x - textWidth / 2 - 10,
          y - fontSize / 2 - 5,
          textWidth + 20,
          fontSize + 10
        );
      }

      if (cap.style === "neon") {
        ctx.shadowColor = cap.color;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = cap.color;
        ctx.lineWidth = 3;
        ctx.strokeText(cap.text, x, y);
        ctx.shadowBlur = 25;
        ctx.strokeText(cap.text, x, y);
        ctx.shadowBlur = 0;
      }

      if (cap.style === "outlined" || cap.style === "bold") {
        ctx.strokeStyle = "black";
        ctx.lineWidth = cap.strokeWidth;
        ctx.strokeText(cap.text, x, y);
      }

      if (cap.style === "shadow") {
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }

      ctx.fillStyle = cap.color;
      ctx.fillText(cap.text, x, y);
      ctx.restore();
    }
  }

  private renderOverlays(
    overlays: OverlayDef[],
    elapsed: number,
    duration: number
  ): void {
    const ctx = this.ctx2d;

    for (const overlay of overlays) {
      ctx.save();

      switch (overlay.type) {
        case "countdown-numbers": {
          const remaining = Math.max(0, Math.ceil(3 - elapsed));
          if (remaining > 0 && remaining <= 3 && elapsed <= 3) {
            ctx.font = "bold 120px sans-serif";
            ctx.fillStyle = "#f97316";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "rgba(255,255,255,0.6)";
            ctx.shadowBlur = 15;
            ctx.fillText(
              String(remaining),
              this.width / 2,
              this.height / 3
            );
          }
          break;
        }
        case "progress-bar": {
          const pct = duration > 0 ? elapsed / duration : 0;
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.fillRect(0, this.height - 4, this.width, 4);
          ctx.fillStyle = "#f97316";
          ctx.fillRect(0, this.height - 4, this.width * Math.min(1, pct), 4);
          break;
        }
        case "quote-marks": {
          ctx.font = "80px serif";
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.fillText("\u201C", this.width * 0.1, this.height * 0.2);
          ctx.fillText("\u201D", this.width * 0.85, this.height * 0.8);
          break;
        }
        case "step-numbers": {
          const step = Math.min(3, Math.ceil((elapsed / duration) * 3));
          ctx.beginPath();
          ctx.arc(50, 50, 20, 0, Math.PI * 2);
          ctx.fillStyle = "#f97316";
          ctx.fill();
          ctx.font = "bold 16px sans-serif";
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(step), 50, 50);
          break;
        }
        case "photo-flash": {
          if (elapsed < 0.15) {
            const opacity = (1 - elapsed / 0.15) * 0.6;
            ctx.fillStyle = `rgba(255,255,255,${opacity})`;
            ctx.fillRect(0, 0, this.width, this.height);
          }
          break;
        }
        case "bg-overlay": {
          ctx.fillStyle = "rgba(0,0,0,0.4)";
          ctx.fillRect(0, 0, this.width, this.height);
          break;
        }
        case "vignette": {
          const gradient = ctx.createRadialGradient(
            this.width / 2,
            this.height / 2,
            this.width * 0.2,
            this.width / 2,
            this.height / 2,
            this.width * 0.7
          );
          gradient.addColorStop(0, "transparent");
          gradient.addColorStop(1, "rgba(0,0,0,0.5)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, this.width, this.height);
          break;
        }
        case "pov-label": {
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.fillText("POV:", this.width / 2, this.height * 0.1);
          break;
        }
        case "zoom-shake": {
          const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 0;
          const scale = 1 + progress * 0.5;
          ctx.strokeStyle = "rgba(249,115,22,0.3)";
          ctx.lineWidth = 8;
          ctx.strokeRect(0, 0, this.width, this.height);
          ctx.setTransform(scale, 0, 0, scale, 0, 0);
          break;
        }
        case "impact-text": {
          ctx.font = "bold 160px sans-serif";
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("IMPACT", this.width / 2, this.height / 2);
          break;
        }
        case "flash-transition": {
          const nearEnd = duration - elapsed < 0.2;
          const atStart = elapsed < 0.15;
          if (nearEnd || atStart) {
            const opacity = atStart
              ? (1 - elapsed / 0.15) * 0.5
              : ((duration - elapsed) / 0.2) * 0.5;
            ctx.fillStyle = `rgba(255,255,255,${Math.max(0, opacity)})`;
            ctx.fillRect(0, 0, this.width, this.height);
          }
          break;
        }
        case "grid-sync": {
          const pulse = Math.sin(elapsed * 4) * 0.3 + 0.5;
          ctx.strokeStyle = `rgba(255,255,255,${pulse * 0.3})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, this.height / 2);
          ctx.lineTo(this.width, this.height / 2);
          ctx.moveTo(this.width / 2, 0);
          ctx.lineTo(this.width / 2, this.height);
          ctx.stroke();
          break;
        }
        case "split-labels": {
          ctx.font = "10px monospace";
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.textAlign = "center";
          ctx.fillText("TOP", this.width / 2, 20);
          ctx.fillText("BOTTOM", this.width / 2, this.height - 10);
          break;
        }
      }

      ctx.restore();
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  destroy(): void {
    if (this.webgl) {
      const gl = this.webgl.gl;
      gl.deleteProgram(this.webgl.program);
      gl.deleteBuffer(this.webgl.positionBuffer);
      gl.deleteBuffer(this.webgl.texCoordBuffer);
      gl.deleteTexture(this.webgl.texture);
      this.webgl = null;
    }
  }
}
