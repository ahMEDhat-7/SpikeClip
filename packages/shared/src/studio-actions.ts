import { z } from "zod";

// ─── Action Types ───────────────────────────────────────────────────────────

export type StudioAction =
  | AddCaptionsAction
  | MixAudioAction
  | ApplyEffectAction
  | SetSpeedAction
  | AddOverlayAction
  | SetTransitionAction
  | AddBackgroundAction
  | TrimAction;

// ─── AddCaptions ────────────────────────────────────────────────────────────

export const CaptionFontSchema = z.enum(["inter", "impact", "bebas", "playfair", "mono"]);
export type CaptionFont = z.infer<typeof CaptionFontSchema>;

export const CaptionPositionSchema = z.enum(["top", "center", "bottom"]);
export type CaptionPosition = z.infer<typeof CaptionPositionSchema>;

export const CaptionAnimationSchema = z.enum(["fade", "slide", "pop", "typewriter", "none"]);
type CaptionAnimation = z.infer<typeof CaptionAnimationSchema>;

export const CaptionStyleSchema = z.enum(["normal", "bold", "outlined", "shadow", "neon"]);
type CaptionStyle = z.infer<typeof CaptionStyleSchema>;

export const AddCaptionsActionSchema = z.object({
  action: z.literal("add_captions"),
  text: z.string().min(1),
  font: CaptionFontSchema.default("inter"),
  size: z.number().min(12).max(120).default(48),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FFFFFF"),
  position: CaptionPositionSchema.default("center"),
  start: z.number().min(0),
  end: z.number().min(0),
  animation: CaptionAnimationSchema.default("none"),
  style: CaptionStyleSchema.default("normal"),
  opacity: z.number().min(0).max(1).default(1),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundEnabled: z.boolean().default(false),
  strokeWidth: z.number().min(1).max(10).default(2),
  shadowRadius: z.number().min(1).max(20).default(2),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
}).refine((data) => data.end > data.start, { message: "end must be greater than start" });

export type AddCaptionsAction = z.infer<typeof AddCaptionsActionSchema>;

// ─── MixAudio ───────────────────────────────────────────────────────────────

export const AudioToneSchema = z.enum(["normal", "bass_boost", "treble_boost", "warm"]);
type AudioTone = z.infer<typeof AudioToneSchema>;

export const MixAudioActionSchema = z.object({
  action: z.literal("mix_audio"),
  volume: z.number().min(0).max(1).default(0.5),
  originalVolume: z.number().min(0).max(1).default(1),
  fadeIn: z.number().min(0).default(0),
  fadeOut: z.number().min(0).default(0),
  startTime: z.number().min(0).default(0),
  tone: AudioToneSchema.default("normal"),
});

export type MixAudioAction = z.infer<typeof MixAudioActionSchema>;

// ─── ApplyEffect ────────────────────────────────────────────────────────────

export const EffectTypeSchema = z.enum([
  "vignette", "zoom_in", "zoom_out", "blur", "sharpen",
  "sepia", "bw", "glitch", "glow",
]);
type EffectType = z.infer<typeof EffectTypeSchema>;

export const ApplyEffectActionSchema = z.object({
  action: z.literal("apply_effect"),
  type: EffectTypeSchema,
  intensity: z.number().min(0).max(1).default(0.7),
  startTime: z.number().min(0).optional(),
  endTime: z.number().min(0).optional(),
});

export type ApplyEffectAction = z.infer<typeof ApplyEffectActionSchema>;

// ─── SetSpeed ───────────────────────────────────────────────────────────────

export const SetSpeedActionSchema = z.object({
  action: z.literal("set_speed"),
  rate: z.number().min(0.25).max(4).default(1),
  preservePitch: z.boolean().default(true),
});

export type SetSpeedAction = z.infer<typeof SetSpeedActionSchema>;

// ─── AddOverlay ─────────────────────────────────────────────────────────────

export const AddOverlayActionSchema = z.object({
  action: z.literal("add_overlay"),
  assetKey: z.string().min(1),
  x: z.number().min(0).max(100).default(50),
  y: z.number().min(0).max(100).default(50),
  scale: z.number().min(0.1).max(2).default(1),
  opacity: z.number().min(0).max(1).default(1),
  startTime: z.number().min(0).optional(),
  endTime: z.number().min(0).optional(),
});

export type AddOverlayAction = z.infer<typeof AddOverlayActionSchema>;

// ─── SetTransition ──────────────────────────────────────────────────────────

export const TransitionTypeSchema = z.enum([
  "fade", "slide_left", "slide_right", "zoom", "wipe",
]);
export type TransitionType = z.infer<typeof TransitionTypeSchema>;

export const SetTransitionActionSchema = z.object({
  action: z.literal("set_transition"),
  type: TransitionTypeSchema,
  duration: z.number().min(0.1).max(5).default(0.5),
  position: z.enum(["start", "end"]),
});

export type SetTransitionAction = z.infer<typeof SetTransitionActionSchema>;

// ─── AddBackground ──────────────────────────────────────────────────────────

export const AddBackgroundActionSchema = z.object({
  action: z.literal("add_background"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
}).refine((data) => data.endTime > data.startTime, { message: "endTime must be greater than startTime" });

export type AddBackgroundAction = z.infer<typeof AddBackgroundActionSchema>;

// ─── Trim ───────────────────────────────────────────────────────────────────

export const TrimActionSchema = z.object({
  action: z.literal("trim"),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
}).refine((data) => data.endTime > data.startTime, { message: "endTime must be greater than startTime" });

export type TrimAction = z.infer<typeof TrimActionSchema>;

// ─── Combined Schema ────────────────────────────────────────────────────────

export const StudioActionSchema = z.discriminatedUnion("action", [
  AddCaptionsActionSchema,
  MixAudioActionSchema,
  ApplyEffectActionSchema,
  SetSpeedActionSchema,
  AddOverlayActionSchema,
  SetTransitionActionSchema,
  AddBackgroundActionSchema,
  TrimActionSchema,
]);

export const StudioActionsArraySchema = z.array(StudioActionSchema).min(1).max(10);

// ─── Clarification Response ─────────────────────────────────────────────────

export const ClarificationResponseSchema = z.object({
  type: z.literal("clarification"),
  question: z.string(),
  suggestions: z.array(z.string()).min(1).max(5),
});

export type ClarificationResponse = z.infer<typeof ClarificationResponseSchema>;

// ─── Platform Types ─────────────────────────────────────────────────────────

const PlatformIdSchema = z.enum(["youtube-shorts", "instagram-reels", "tiktok"]);
export type PlatformId = z.infer<typeof PlatformIdSchema>;

// ─── Output Config ──────────────────────────────────────────────────────────

export const OutputQualitySchema = z.enum(["480p", "720p", "1080p"]);
export type OutputQuality = z.infer<typeof OutputQualitySchema>;

export const OutputFormatSchema = z.enum(["mp4", "webm"]);
export type OutputFormat = z.infer<typeof OutputFormatSchema>;

// ─── Platform Encoding Presets ──────────────────────────────────────────────

export interface EncodingPreset {
  maxDuration: number;
  resolution: { width: number; height: number };
  videoCodec: string;
  audioCodec: string;
  audioBitrate: string;
  extraFlags: string[];
}

export const PLATFORM_PRESETS: Record<PlatformId, EncodingPreset> = {
  "youtube-shorts": {
    maxDuration: 60,
    resolution: { width: 1080, height: 1920 },
    videoCodec: "libx264",
    audioCodec: "aac",
    audioBitrate: "128k",
    extraFlags: ["-movflags", "+faststart"],
  },
  "instagram-reels": {
    maxDuration: 90,
    resolution: { width: 1080, height: 1920 },
    videoCodec: "libx264",
    audioCodec: "aac",
    audioBitrate: "128k",
    extraFlags: ["-movflags", "+faststart"],
  },
  tiktok: {
    maxDuration: 180,
    resolution: { width: 1080, height: 1920 },
    videoCodec: "libx264",
    audioCodec: "aac",
    audioBitrate: "128k",
    extraFlags: ["-movflags", "+faststart"],
  },
};

// ─── Quality Presets ────────────────────────────────────────────────────────

export interface QualityPreset {
  scale: string;
  crf: string;
}

export const QUALITY_PRESETS: Record<OutputQuality, QualityPreset> = {
  "480p": { scale: "scale=-2:480", crf: "28" },
  "720p": { scale: "scale=-2:720", crf: "26" },
  "1080p": { scale: "scale=-2:1080", crf: "23" },
};

// ─── Format Codecs ──────────────────────────────────────────────────────────

export const FORMAT_CODECS: Record<OutputFormat, string[]> = {
  mp4: ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac"],
  webm: ["-c:v", "libvpx-vp9", "-b:v", "2M", "-pix_fmt", "yuv420p", "-c:a", "libopus"],
};

// ─── Helper Functions ───────────────────────────────────────────────────────

export function getPlatformEncodingPreset(platform: PlatformId): EncodingPreset {
  return PLATFORM_PRESETS[platform];
}

export function getQualityPreset(quality: OutputQuality): QualityPreset {
  return QUALITY_PRESETS[quality];
}

export function getFormatCodecs(format: OutputFormat): string[] {
  return FORMAT_CODECS[format];
}
