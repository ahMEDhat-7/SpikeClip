import { z } from "zod";
import {
  StudioAction,
  PlatformId,
  PlatformIdSchema,
  StudioActionSchema,
} from "./studio-actions";

export interface CaptionContext {
  text: string;
  start?: number;
  end?: number;
}

export interface MusicContext {
  name: string;
  volume: number;
}

export interface TemplateContext {
  id: string;
  name: string;
}

/**
 * Describes the current edit state of a scene so the translator can be
 * project-aware (understand "make it bigger" relative to existing captions,
 * avoid clobbering the chosen template, etc.).
 */
export interface StudioEditContext {
  platform: PlatformId;
  aspectRatio: string;
  maxDuration: number;
  sceneStart: number;
  sceneEnd: number;
  sceneDuration: number;
  availableAssets: string[];
  currentActions: StudioAction[];
  captions: CaptionContext[];
  music?: MusicContext | null;
  template?: TemplateContext | null;
  availableTemplates: TemplateContext[];
}

export const CaptionContextSchema = z.object({
  text: z.string(),
  start: z.number().optional(),
  end: z.number().optional(),
});

export const MusicContextSchema = z.object({
  name: z.string(),
  volume: z.number(),
});

export const TemplateContextSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const StudioEditContextSchema = z.object({
  platform: PlatformIdSchema,
  aspectRatio: z.string(),
  maxDuration: z.number(),
  sceneStart: z.number(),
  sceneEnd: z.number(),
  sceneDuration: z.number(),
  availableAssets: z.array(z.string()),
  currentActions: z.array(StudioActionSchema),
  captions: z.array(CaptionContextSchema),
  music: MusicContextSchema.nullable().optional(),
  template: TemplateContextSchema.nullable().optional(),
  availableTemplates: z.array(TemplateContextSchema),
});

/**
 * Returns a short human-readable description of a single StudioAction.
 * Used by the frontend to summarize AI-applied changes.
 */
export function describeAction(action: StudioAction): string {
  switch (action.action) {
    case "add_captions":
      return `"${action.text}" (${action.start}s-${action.end}s)`;
    case "mix_audio":
      return `Volume ${Math.round(action.volume * 100)}%`;
    case "apply_effect":
      return `${action.type} (${Math.round(action.intensity * 100)}%)`;
    case "set_speed":
      return `${action.rate}x speed`;
    case "add_overlay":
      return action.assetKey;
    case "set_transition":
      return `${action.type} (${action.duration}s)`;
    case "add_background":
      return action.color;
    case "trim":
      return `${action.startTime}s-${action.endTime}s`;
    default:
      return "Unknown action";
  }
}

/**
 * Actions that replace/transform the existing clip and therefore should be
 * previewed and confirmed before being committed.
 */
export const DESTRUCTIVE_ACTIONS = new Set([
  "trim",
  "set_speed",
  "apply_effect",
  "add_overlay",
  "add_background",
]);
