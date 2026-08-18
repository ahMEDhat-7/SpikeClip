import { Injectable, Logger } from "@nestjs/common";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import {
  VideoProcessor,
  CaptionOverlay,
  MusicMixConfig,
} from "../../domain/services/video-processor";
import { generateSrt } from "./srt-generator";
import { FilterGraphBuilder } from "./filter-graph-builder";
import {
  StudioAction,
  PlatformId,
  OutputQuality,
  OutputFormat,
  FONT_MAP,
} from "@spikeclip/shared";
import { withTimeout } from "./utils/timeout";

const execFileAsync = promisify(execFile);
const TMP_DIR = "/tmp/spikeclips-ffmpeg";
const FFMPEG_TIMEOUT_MS = 300_000; // 5 minutes

@Injectable()
export class FfmpegService implements VideoProcessor {
  private readonly logger = new Logger(FfmpegService.name);

  async trim(
    inputPath: string,
    startTime: number,
    endTime: number,
    outputPath: string
  ): Promise<void> {
    this.logger.log(`Trimming ${startTime}-${endTime} to ${outputPath}`);
    const duration = endTime - startTime;

    try {
      await withTimeout(
        execFileAsync("ffmpeg", [
          "-y",
          "-ss", String(startTime),
          "-i", inputPath,
          "-t", String(duration),
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          "-c:a", "aac",
          outputPath,
        ]),
        FFMPEG_TIMEOUT_MS,
        "trim"
      );
    } catch (err) {
      this.logger.error(`Trim failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  async reformatToVertical(
    inputPath: string,
    startTime: number,
    endTime: number,
    outputPath: string,
    width: number = 1080,
    height: number = 1920
  ): Promise<void> {
    this.logger.log(`Reformatting to ${width}x${height}: ${outputPath}`);
    const duration = endTime - startTime;

    try {
      await withTimeout(
        execFileAsync("ffmpeg", [
          "-y",
          "-ss", String(startTime),
          "-i", inputPath,
          "-t", String(duration),
          "-vf", `crop=ih*9/16:ih,scale=${width}:${height}`,
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          "-c:a", "aac",
          outputPath,
        ]),
        FFMPEG_TIMEOUT_MS,
        "reformat"
      );
    } catch (err) {
      this.logger.error(`Reformat failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  async overlayCaptions(
    inputPath: string,
    outputPath: string,
    captions: CaptionOverlay[],
    videoDuration: number
  ): Promise<void> {
    if (!captions.length) {
      await execFileAsync("cp", [inputPath, outputPath]);
      return;
    }

    const hasStyling = captions.some(
      (c) => c.font !== "inter" || c.color !== "#FFFFFF" || c.position !== "center" ||
             c.animation !== "none" || c.backgroundEnabled || c.strokeWidth
    );

    if (!hasStyling) {
      const fps = 30;
      const srtPath = join(TMP_DIR, `${Date.now()}-captions.srt`);
      const srtContent = generateSrt(captions, fps, videoDuration);
      await writeFile(srtPath, srtContent, "utf-8");

      try {
        const forceStyle = `FontSize=20,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1,Alignment=2,MarginV=40`;
        await withTimeout(
          execFileAsync("ffmpeg", [
            "-y",
            "-i", inputPath,
            "-vf", `subtitles=${srtPath}:force_style='${forceStyle}'`,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-c:a", "copy",
            outputPath,
          ]),
          FFMPEG_TIMEOUT_MS,
          "captions-srt"
        );
        await unlink(srtPath).catch(() => {});
        return;
      } catch {
        this.logger.warn("SRT subtitles filter failed, falling back to drawtext");
        await unlink(srtPath).catch(() => {});
      }
    }

    const filters: string[] = [];
    for (const cap of captions) {
      const escapedText = cap.text
        .replace(/\\/g, "\\\\")
        .replace(/%/g, "%%")
        .replace(/\$/g, "\\$")
        .replace(/\[/g, "\\[")
        .replace(/\]/g, "\\]")
        .replace(/'/g, "'\\\\\\''")
        .replace(/:/g, "\\:")
        .replace(/\n/g, " ");

      const fontSize = Math.round(cap.size * 0.5);
      const fontFile = FONT_MAP[cap.font] ?? FONT_MAP.inter;
      const color = cap.color.replace("#", "0x");

      let yExpr: string;
      if (cap.y !== undefined && cap.y !== null) {
        yExpr = `h*${(cap.y / 100).toFixed(3)}-text_h/2`;
      } else {
        switch (cap.position) {
          case "top": yExpr = "h*0.1"; break;
          case "bottom": yExpr = "h*0.85"; break;
          default: yExpr = "(h-text_h)/2";
        }
      }

      let xExpr: string;
      if (cap.x !== undefined && cap.x !== null) {
        xExpr = `w*${(cap.x / 100).toFixed(3)}-text_w/2`;
      } else {
        xExpr = "(w-text_w)/2";
      }

      const startFrame = cap.startFrame ?? 0;
      const endFrame = cap.endFrame ?? Math.round(30 * videoDuration);
      const startSec = startFrame / 30;
      const endSec = endFrame / 30;

      let drawtext =
        `drawtext=text='${escapedText}'` +
        `:fontfile=${fontFile}` +
        `:fontsize=${fontSize}` +
        `:fontcolor=${color}` +
        `:x=${xExpr}` +
        `:y=${yExpr}` +
        `:enable='between(t\\,${startSec.toFixed(3)}\\,${endSec.toFixed(3)})'`;

      if (cap.strokeWidth) {
        drawtext += `:borderw=${cap.strokeWidth}:bordercolor=black`;
      }

      if (cap.backgroundEnabled && cap.backgroundColor) {
        drawtext += `:box=1:boxcolor=${cap.backgroundColor}@0.5:boxborderw=10`;
      }

      filters.push(drawtext);
    }

    const filterComplex = filters.join(",");

    try {
      await withTimeout(
        execFileAsync("ffmpeg", [
          "-y",
          "-i", inputPath,
          "-vf", filterComplex,
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          "-c:a", "copy",
          outputPath,
        ]),
        FFMPEG_TIMEOUT_MS,
        "captions-drawtext"
      );
    } catch (err) {
      this.logger.error(`Caption overlay failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  async mixAudio(
    videoPath: string,
    musicPath: string,
    outputPath: string,
    config: MusicMixConfig,
    videoDuration?: number
  ): Promise<void> {
    const duration = videoDuration ?? await this.getDuration(videoPath);
    const fadeOutStart = Math.max(0, duration - config.fadeOut);

    try {
      await withTimeout(
        execFileAsync("ffmpeg", [
          "-y",
          "-i", videoPath,
          "-i", musicPath,
          "-filter_complex",
          `[0:a]volume=${config.originalVolume}[orig];` +
          `[1:a]volume=${config.volume},` +
          `afade=t=in:d=${config.fadeIn},` +
          `afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${config.fadeOut}[music];` +
          `[orig][music]amix=inputs=2:duration=first:normalize=0[aout]`,
          "-map", "0:v",
          "-map", "[aout]",
          "-shortest",
          "-c:v", "copy",
          "-c:a", "aac",
          outputPath,
        ]),
        FFMPEG_TIMEOUT_MS,
        "mix-audio"
      );
    } catch (err) {
      this.logger.error(`Audio mix failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  async applyTemplateEffects(
    inputPath: string,
    outputPath: string,
    templateConfig: Record<string, unknown>
  ): Promise<void> {
    const filters: string[] = [];

    const overlayEffects = templateConfig.overlayEffects as string[] | undefined;
    const layout = templateConfig.layout as string | undefined;

    if (overlayEffects?.includes("vignette")) {
      filters.push("vignette=PI/4");
    }

    if (layout === "split-horizontal") {
      filters.push("drawbox=x=0:y=ih/2:w=iw:h=2:color=white@0.3:t=fill");
    }

    if (layout === "split-vertical") {
      filters.push("drawbox=x=iw/2:y=0:w=2:h=ih:color=white@0.3:t=fill");
    }

    if (layout === "grid") {
      filters.push("drawbox=x=0:y=ih/2:w=iw:h=2:color=white@0.3:t=fill");
      filters.push("drawbox=x=iw/2:y=0:w=2:h=ih:color=white@0.3:t=fill");
    }

    if (filters.length === 0) {
      await execFileAsync("cp", [inputPath, outputPath]);
      return;
    }

    const filterComplex = filters.join(",");

    try {
      await withTimeout(
        execFileAsync("ffmpeg", [
          "-y",
          "-i", inputPath,
          "-vf", filterComplex,
          "-c:v", "libx264",
          "-pix_fmt", "yuv420p",
          "-movflags", "+faststart",
          "-c:a", "copy",
          outputPath,
        ]),
        FFMPEG_TIMEOUT_MS,
        "template-effects"
      );
    } catch (err) {
      this.logger.error(`Template effects failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  async getDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await withTimeout(
        execFileAsync("ffprobe", [
          "-v", "error",
          "-show_entries", "format=duration",
          "-of", "default=noprint_wrappers=1:nokey=1",
          filePath,
        ]),
        30_000,
        "get-duration"
      );
      const duration = parseFloat(stdout.trim());
      if (isNaN(duration)) {
        throw new Error(`Invalid duration from ffprobe: ${stdout}`);
      }
      return duration;
    } catch (err) {
      this.logger.error(`Get duration failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  async applyStudioActions(
    inputPath: string,
    outputPath: string,
    actions: StudioAction[],
    platform: PlatformId,
    quality: OutputQuality = "1080p",
    format: OutputFormat = "mp4",
    startTime?: number,
    duration?: number
  ): Promise<void> {
    this.logger.log(`Applying ${actions.length} studio actions to ${outputPath}`);

    const builder = new FilterGraphBuilder();
    const { command } = builder.buildCommand({
      actions,
      platform,
      quality,
      format,
      inputPath,
      outputPath,
      startTime,
      duration,
    });

    try {
      await withTimeout(
        execFileAsync("ffmpeg", command),
        FFMPEG_TIMEOUT_MS,
        "studio-actions"
      );
    } catch (err) {
      this.logger.error(`Studio actions failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }

  async applyPreviewActions(
    inputPath: string,
    outputPath: string,
    actions: StudioAction[],
    platform: PlatformId
  ): Promise<void> {
    this.logger.log(`Applying preview actions to ${outputPath}`);

    const builder = new FilterGraphBuilder();
    const { command } = builder.buildPreviewCommand({
      actions,
      platform,
      quality: "480p",
      format: "mp4",
      inputPath,
      outputPath,
    });

    try {
      await withTimeout(
        execFileAsync("ffmpeg", command),
        30_000,
        "preview-actions"
      );
    } catch (err) {
      this.logger.error(`Preview actions failed: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }
}
