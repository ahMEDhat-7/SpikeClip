import type { Project, VideoExportSettings } from "@openreel/core";

let enginePromise: Promise<typeof import("@openreel/core")> | null = null;

async function getCore() {
  if (!enginePromise) {
    enginePromise = import("@openreel/core").catch((err) => {
      enginePromise = null;
      throw err;
    });
  }
  return enginePromise;
}

export interface ExportClipOptions {
  width?: number;
  height?: number;
  frameRate?: number;
  bitrate?: number;
  codec?: "h264" | "vp9";
  format?: "mp4" | "webm";
  onProgress?: (phase: string, ratio: number) => void;
}

export interface ExportClipResult {
  blob: Blob;
  stats: { framesRendered: number; duration: number; fileSize: number } | null;
}

/**
 * Export an OpenReel Project to a video Blob via the upstream
 * @openreel/core ExportEngine (WebCodecs primary path).
 */
export async function exportClip(
  project: Project,
  options: ExportClipOptions = {},
): Promise<ExportClipResult> {
  const { getExportEngine, DEFAULT_VIDEO_SETTINGS } = await getCore();

  const engine = getExportEngine();
  await engine.initialize();

  const settings: Partial<VideoExportSettings> = {
    width: options.width ?? 1080,
    height: options.height ?? 1920,
    frameRate: options.frameRate ?? 30,
    bitrate: options.bitrate ?? 12_000,
    codec: options.codec ?? "h264",
    format: options.format ?? "mp4",
    bitrateMode: "vbr",
    quality: 90,
    keyframeInterval: 30,
    audioSettings: {
      ...DEFAULT_VIDEO_SETTINGS.audioSettings,
      format: "aac",
      sampleRate: 44100,
      bitDepth: 16,
      bitrate: 192,
      channels: 2,
    },
  };

  const gen = engine.exportVideo(project, settings);
  let result: Awaited<ReturnType<typeof gen.next>>;

  do {
    result = await gen.next();
    if (!result.done) {
      const p = result.value;
      if (options.onProgress) {
        const ratio = p.progress;
        options.onProgress(p.phase, ratio);
      }
    }
  } while (!result.done);

  const exportResult = result.value;
  if (!exportResult.success || !exportResult.blob) {
    throw new Error(exportResult.error?.message ?? "Export failed");
  }

  return {
    blob: exportResult.blob,
    stats: exportResult.stats
      ? {
          framesRendered: exportResult.stats.framesRendered,
          duration: exportResult.stats.duration,
          fileSize: exportResult.stats.fileSize,
        }
      : null,
  };
}

export function isSupported(): boolean {
  if (typeof VideoEncoder === "undefined") return false;
  if (typeof VideoDecoder === "undefined") return false;
  return true;
}

export function hasWebGpu(): boolean {
  if (typeof navigator === "undefined") return false;
  return "gpu" in navigator;
}
