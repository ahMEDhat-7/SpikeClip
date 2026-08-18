import type { StudioAction } from "@spikeclip/shared";
import {
  type EffectState,
  type CaptionDef,
  type OverlayDef,
  type RenderState,
  createDefaultEffectState,
  applyActionsToEffectState,
} from "./renderer";

export interface PipelineResult {
  effects: EffectState;
  captions: CaptionDef[];
  overlays: OverlayDef[];
  layout: string;
  musicUrl: string | null;
  musicVolume: number;
  musicFadeIn: number;
  musicFadeOut: number;
  originalVolume: number;
  speed: number;
}

export function processActions(
  actions: StudioAction[],
  sceneStart: number,
  sceneEnd: number
): PipelineResult {
  let effects = createDefaultEffectState();
  const captions: CaptionDef[] = [];
  const overlays: OverlayDef[] = [];
  let layout = "full";
  let musicUrl: string | null = null;
  let musicVolume = 0.3;
  let musicFadeIn = 0;
  let musicFadeOut = 0;
  let originalVolume = 1;

  effects = applyActionsToEffectState(actions, effects);

  for (const action of actions) {
    switch (action.action) {
      case "add_captions": {
        const fontMap: Record<string, string> = {
          inter: "Inter",
          impact: "Impact",
          bebas: "Bebas Neue",
          playfair: "Playfair Display",
          mono: "JetBrains Mono",
        };

        const x = action.x !== undefined ? action.x : 50;
        let y = action.y;
        if (y === undefined) {
          switch (action.position) {
            case "top":
              y = 10;
              break;
            case "bottom":
              y = 85;
              break;
            default:
              y = 50;
              break;
          }
        }

        captions.push({
          text: action.text,
          font: fontMap[action.font] || "Inter",
          size: action.size,
          color: action.color,
          x,
          y,
          start: action.start - sceneStart,
          end: action.end - sceneStart,
          style: action.style,
          strokeWidth: action.strokeWidth,
          opacity: action.opacity,
          backgroundEnabled: action.backgroundEnabled,
          backgroundColor: action.backgroundColor || "#000000",
          animation: action.animation,
        });
        break;
      }
      case "mix_audio": {
        originalVolume = action.originalVolume;
        musicVolume = action.volume;
        musicFadeIn = action.fadeIn;
        musicFadeOut = action.fadeOut;
        break;
      }
      case "set_transition": {
        effects.transitionFade = {
          position: action.position,
          duration: action.duration,
        };
        break;
      }
      case "apply_effect": {
        if (action.type === "zoom_in" || action.type === "zoom_out") {
          overlays.push({
            type: "zoom-shake",
            x: 0,
            y: 0,
            width: 1080,
            height: 1920,
          });
        }
        break;
      }
    }
  }

  return {
    effects,
    captions,
    overlays,
    layout,
    musicUrl,
    musicVolume,
    musicFadeIn,
    musicFadeOut,
    originalVolume,
    speed: effects.speed,
  };
}

export function buildRenderState(
  pipeline: PipelineResult,
  sceneElapsed: number,
  sceneDuration: number
): RenderState {
  return {
    effects: pipeline.effects,
    captions: pipeline.captions,
    overlays: pipeline.overlays,
    layout: pipeline.layout,
    sceneElapsed,
    sceneDuration,
  };
}
