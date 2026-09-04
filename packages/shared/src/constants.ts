export const FONT_MAP: Record<string, string> = {
  inter: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  impact: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  bebas: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  playfair: "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
  mono: "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
};

// ── Plan Tiers ──────────────────────────────────────────────────────────────
export const PlanTier = {
  FREE: "free",
  PRO: "pro",
  TEAM: "team",
} as const;
export type PlanTierValue = (typeof PlanTier)[keyof typeof PlanTier];

export const PLAN_LIMITS: Record<
  PlanTierValue,
  { analysesLimit: number; scenesLimit: number; clipsLimit: number }
> = {
  free: { analysesLimit: 3, scenesLimit: 3, clipsLimit: 2 },
  pro: { analysesLimit: -1, scenesLimit: 10, clipsLimit: -1 },
  team: { analysesLimit: -1, scenesLimit: 25, clipsLimit: -1 },
};

// ── Job Status ──────────────────────────────────────────────────────────────
export const JobStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type JobStatusValue = (typeof JobStatus)[keyof typeof JobStatus];

// ── Clip Status ─────────────────────────────────────────────────────────────
export const ClipStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type ClipStatusValue = (typeof ClipStatus)[keyof typeof ClipStatus];

// ── Platform ────────────────────────────────────────────────────────────────
export const Platform = {
  YOUTUBE_SHORTS: "youtube_shorts",
  INSTAGRAM_REELS: "instagram_reels",
  TIKTOK: "tiktok",
} as const;
export type PlatformValue = (typeof Platform)[keyof typeof Platform];

export const PLATFORM_CAST: Record<string, "youtube-shorts" | "instagram-reels" | "tiktok"> = {
  youtube_shorts: "youtube-shorts",
  instagram_reels: "instagram-reels",
  tiktok: "tiktok",
};

// ── Format ──────────────────────────────────────────────────────────────────
export const Format = {
  MP4: "mp4",
  WEBM: "webm",
} as const;
export type FormatValue = (typeof Format)[keyof typeof Format];

// ── Quality ─────────────────────────────────────────────────────────────────
export const Quality = {
  P720: "720p",
  P1080: "1080p",
} as const;
export type QualityValue = (typeof Quality)[keyof typeof Quality];

// ── Billing Interval ────────────────────────────────────────────────────────
export const BillingInterval = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;
export type BillingIntervalValue = (typeof BillingInterval)[keyof typeof BillingInterval];

// ── BullMQ Queue Names ─────────────────────────────────────────────────────
export const QueueName = {
  ANALYSIS: "analysis",
  EXPORT: "export",
  SOURCE: "source",
  SCENE_GENERATION: "scene-generation",
  PROJECT_EXPORT: "project-export",
} as const;
export type QueueNameValue = (typeof QueueName)[keyof typeof QueueName];

// ── Storage ─────────────────────────────────────────────────────────────────
export const StorageDriver = {
  LOCAL: "local",
  MINIO: "minio",
} as const;
export type StorageDriverValue = (typeof StorageDriver)[keyof typeof StorageDriver];

// ── MIME Types ──────────────────────────────────────────────────────────────
export const MimeTypes = {
  VIDEO_MP4: "video/mp4",
  VIDEO_WEBM: "video/webm",
  AUDIO_MPEG: "audio/mpeg",
  AUDIO_WAV: "audio/wav",
  AUDIO_OGG: "audio/ogg",
  AUDIO_MP4: "audio/mp4",
  OCTET_STREAM: "application/octet-stream",
} as const;

export const EXTENSION_TO_MIME: Record<string, string> = {
  mp4: MimeTypes.VIDEO_MP4,
  webm: MimeTypes.VIDEO_WEBM,
  mp3: MimeTypes.AUDIO_MPEG,
  wav: MimeTypes.AUDIO_WAV,
  ogg: MimeTypes.AUDIO_OGG,
  m4a: MimeTypes.AUDIO_MP4,
};

export const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "m4a"];

// ── FFmpeg Codecs ───────────────────────────────────────────────────────────
export const FfmpegCodec = {
  VIDEO: "libx264",
  AUDIO: "aac",
} as const;

export const VERTICAL_CROP_FILTER = "crop=ih*9/16:ih,scale=1080:1920";

// ── yt-dlp Format String ────────────────────────────────────────────────────
export const YTDLP_FORMAT = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]";

// ── Limits ──────────────────────────────────────────────────────────────────
export const MAX_SCENES_PER_EXPORT = 25;
export const FREE_PLAN_MAX_SCENES = 3;
export const UPLOAD_MAX_SIZE_BYTES = 500 * 1024 * 1024;
export const MUSIC_SIGNED_URL_TTL = 600;

// ── Paths ───────────────────────────────────────────────────────────────────
export const TMP_PREVIEW_DIR = "/tmp/spikeclips-preview";
export const TMP_EXPORT_DIR = "/tmp/spikeclips-export";
export const CLIPS_STORAGE_PREFIX = "clips/";

// ── Cache ───────────────────────────────────────────────────────────────────
export const PREVIEW_CACHE_CONTROL = "private, max-age=3600";

// ── Prisma Error Codes ──────────────────────────────────────────────────────
export const PrismaErrorCode = {
  UNIQUE_CONSTRAINT: "P2002",
} as const;

// ── Unlimited sentinel ──────────────────────────────────────────────────────
export const UNLIMITED = -1;
