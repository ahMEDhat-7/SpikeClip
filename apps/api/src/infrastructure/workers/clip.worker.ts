import { Logger } from "@nestjs/common";
import { Job as BullMQJob, Worker } from "bullmq";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../storage/storage.interface";
import { FfmpegService } from "../external/ffmpeg.service";
import { YtdlpService } from "../external/ytdlp.service";
import { CaptionOverlay, MusicMixConfig } from "../../domain/services/video-processor";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { unlink, mkdir, stat, access, rename, writeFile } from "fs/promises";
import { join } from "path";
import type { StudioAction } from "@spikeclip/shared";
import {
  QueueName,
  ClipStatus,
  Platform,
  Quality,
  Format,
  type QualityValue,
  type FormatValue,
  FfmpegCodec,
  VERTICAL_CROP_FILTER,
  YTDLP_FORMAT,
  MUSIC_SIGNED_URL_TTL,
  CLIPS_STORAGE_PREFIX,
  MimeTypes,
  PLATFORM_CAST,
} from "@spikeclip/shared";
import { publishClipProgress } from "../redis/progress-publisher";

const execFileAsync = promisify(execFile);
const TMP_DIR = "/tmp/spikeclips-export";

interface ClipExportJobData {
  jobId: string;
  clipId: string;
  sceneIndex: number;
  videoUrl: string;
  startTime: number;
  endTime: number;
  vertical?: boolean;
  platform?: string;
  format?: string;
  quality?: string;
  captions?: CaptionOverlay[];
  music?: MusicMixConfig;
  templateId?: string;
  templateConfig?: Record<string, unknown>;
  actions?: StudioAction[];
}

const connectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function createClipWorker(
  prisma: PrismaService,
  storage: StorageService,
  ffmpeg?: FfmpegService,
  ytdlp?: YtdlpService
): Worker {
  const logger = new Logger("ClipWorker");

  const worker = new Worker(
    QueueName.EXPORT,
    async (bullJob: BullMQJob<ClipExportJobData>) => {
      const {
        jobId, clipId, sceneIndex, videoUrl, startTime, endTime,
        vertical, captions, music, templateConfig, actions,
      } = bullJob.data;
      logger.log(`Processing clip ${clipId} (scene ${sceneIndex}) for job ${jobId}`);

      await mkdir(TMP_DIR, { recursive: true });

      try {
        await prisma.clip.update({
          where: { id: clipId },
          data: { status: ClipStatus.PROCESSING, startedAt: new Date(), progress: 0 },
        });

        publishClipProgress(jobId, clipId, 5, "acquiring_source");

        const tmpInput = join(TMP_DIR, `${clipId}-source.mp4`);
        const tmpCropped = join(TMP_DIR, `${clipId}-cropped.mp4`);
        const tmpCaptions = join(TMP_DIR, `${clipId}-captions.mp4`);
        const tmpEffects = join(TMP_DIR, `${clipId}-effects.mp4`);
        const tmpOutput = join(TMP_DIR, `${clipId}-output.mp4`);

        const duration = endTime - startTime;

        // Step 1: Reuse the pre-downloaded shared source when available,
        // otherwise fall back to downloading this section directly.
        const jobRecord = await prisma.job.findUnique({
          where: { id: jobId },
          select: { sourceKey: true, sourceStart: true },
        });
        const sourceKey = jobRecord?.sourceKey ?? null;
        const sourceStart = jobRecord?.sourceStart ?? 0;

        let usedSharedSource = false;
        if (sourceKey) {
          for (let attempt = 0; attempt < 5; attempt++) {
            if (await fileExists(sourceKey)) {
              usedSharedSource = true;
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (usedSharedSource && sourceKey) {
          const offset = Math.max(0, startTime - sourceStart);
          await execFileAsync("ffmpeg", [
            "-y",
            "-ss", String(offset),
            "-i", sourceKey,
            "-t", String(duration),
            "-c:v", FfmpegCodec.VIDEO, "-c:a", FfmpegCodec.AUDIO,
            tmpInput,
          ]);
          logger.log(`Reused shared source for clip ${clipId} (offset ${offset}s)`);
        } else {
          if (sourceKey) {
            logger.warn(`Shared source not ready for clip ${clipId}, downloading section directly`);
          }
          // Use cached YtdlpService or fall back to direct execFile
          if (ytdlp) {
            await ytdlp.downloadSection(videoUrl, startTime, endTime, tmpInput);
          } else {
            await execFileAsync("yt-dlp", [
              "--js-runtimes", "node",
              "-f", YTDLP_FORMAT,
              "--download-sections", `*${startTime}-${endTime}`,
              "--force-keyframes-at-cuts",
              "-o", tmpInput,
              videoUrl,
            ]);
          }
        }

        publishClipProgress(jobId, clipId, 25, "cropping_vertical");

        // Step 2: Vertical crop or pass-through encode
        if (vertical) {
          await execFileAsync("ffmpeg", [
            "-y", "-i", tmpInput,
            "-vf", VERTICAL_CROP_FILTER,
            "-c:v", FfmpegCodec.VIDEO, "-c:a", FfmpegCodec.AUDIO,
            tmpCropped,
          ]);
        } else {
          await execFileAsync("ffmpeg", [
            "-y", "-i", tmpInput,
            "-t", String(duration),
            "-c:v", FfmpegCodec.VIDEO, "-c:a", FfmpegCodec.AUDIO,
            tmpCropped,
          ]);
        }

        let currentFile = tmpCropped;
        publishClipProgress(jobId, clipId, 40, "applying_captions");

        // Step 3: Caption overlay
        if (captions && captions.length > 0 && ffmpeg) {
          try {
            await ffmpeg.overlayCaptions(currentFile, tmpCaptions, captions, duration);
            currentFile = tmpCaptions;
            logger.log(`Applied ${captions.length} caption(s) with timing to clip ${clipId}`);
          } catch (capErr) {
            logger.warn(`Caption overlay failed for ${clipId}: ${capErr instanceof Error ? capErr.message : capErr}`);
          }
        }

        publishClipProgress(jobId, clipId, 55, "applying_effects");

        // Step 4: Template effects
        if (templateConfig && ffmpeg) {
          try {
            await ffmpeg.applyTemplateEffects(currentFile, tmpEffects, templateConfig);
            currentFile = tmpEffects;
            logger.log(`Applied template effects to clip ${clipId}`);
          } catch (fxErr) {
            logger.warn(`Template effects failed for ${clipId}: ${fxErr instanceof Error ? fxErr.message : fxErr}`);
          }
        }

        // Step 4.5: Apply StudioActions
        if (actions && actions.length > 0 && ffmpeg) {
          try {
            const actionsOutput = join(TMP_DIR, `${clipId}-actions.mp4`);
            await ffmpeg.applyStudioActions(
              currentFile,
              actionsOutput,
              actions,
              PLATFORM_CAST[bullJob.data.platform || Platform.YOUTUBE_SHORTS] || "youtube-shorts",
              (bullJob.data.quality as QualityValue) || Quality.P1080,
              (bullJob.data.format as FormatValue) || Format.MP4,
              0,
              duration
            );
            currentFile = actionsOutput;
            logger.log(`Applied ${actions.length} studio action(s) to clip ${clipId}`);
          } catch (actErr) {
            logger.warn(`Studio actions failed for ${clipId}: ${actErr instanceof Error ? actErr.message : actErr}`);
          }
        }

        publishClipProgress(jobId, clipId, 70, "mixing_music");

        // Step 5: Music mix
        if (music) {
          try {
            const musicSignedUrl = await storage.getSignedUrl(music.fileKey, MUSIC_SIGNED_URL_TTL);
            const sanitizedKey = music.fileKey.replace(/[^a-zA-Z0-9._-]/g, "_");
            const musicPath = join(TMP_DIR, `${clipId}-music-${sanitizedKey}`);
            const response = await fetch(musicSignedUrl);
            if (!response.ok) throw new Error(`Failed to download music: ${response.status}`);
            const buffer = Buffer.from(await response.arrayBuffer());
            await writeFile(musicPath, buffer);
            if (await fileExists(musicPath)) {
              await ffmpeg?.mixAudio(currentFile, musicPath, tmpOutput, music, duration);
              currentFile = tmpOutput;
              logger.log(`Mixed music into clip ${clipId}`);
            } else {
              logger.warn(`Music file not found for clip ${clipId}, skipping mix`);
            }
          } catch (musErr) {
            logger.warn(`Music mix failed for ${clipId}: ${musErr instanceof Error ? musErr.message : musErr}`);
          }
        }

        publishClipProgress(jobId, clipId, 85, "uploading");

        // Step 6: If no music mix wrote to tmpOutput, copy current state there
        if (currentFile !== tmpOutput) {
          await rename(currentFile, tmpOutput);
        }

        // Step 7: Upload to storage
        const storageKey = `${CLIPS_STORAGE_PREFIX}${jobId}/${sceneIndex}-${randomUUID().slice(0, 8)}.mp4`;
        await storage.uploadFromFile(tmpOutput, storageKey, MimeTypes.VIDEO_MP4);
        const fileUrl = storageKey;
        const fileSize = (await stat(tmpOutput)).size;

        publishClipProgress(jobId, clipId, 95, "finalizing");

        // Step 8: Update DB
        await prisma.clip.update({
          where: { id: clipId },
          data: {
            status: ClipStatus.COMPLETED,
            progress: 100,
            fileUrl,
            fileSize,
            duration,
            completedAt: new Date(),
          },
        });

        publishClipProgress(jobId, clipId, 100, "completed");

        // Step 9: Cleanup temp files
        await unlink(tmpInput).catch(() => {});
        await unlink(tmpCropped).catch(() => {});
        await unlink(tmpCaptions).catch(() => {});
        await unlink(tmpEffects).catch(() => {});
        await unlink(join(TMP_DIR, `${clipId}-actions.mp4`)).catch(() => {});
        await unlink(tmpOutput).catch(() => {});
        if (music) {
          const sanitizedKey = music.fileKey.replace(/[^a-zA-Z0-9._-]/g, "_");
          await unlink(join(TMP_DIR, `${clipId}-music-${sanitizedKey}`)).catch(() => {});
        }

        // Step 10: Cleanup shared source when all clips for this job are done
        try {
          const pendingClips = await prisma.clip.count({
            where: { jobId, status: { in: [ClipStatus.PENDING, ClipStatus.PROCESSING] } },
          });
          if (pendingClips === 0 && jobRecord?.sourceKey) {
            await unlink(jobRecord.sourceKey).catch(() => {});
            logger.log(`Cleaned up shared source for job ${jobId}`);
          }
        } catch {
          // Non-critical: source cleanup failure shouldn't fail the job
        }

        logger.log(`Completed clip ${clipId}: ${fileUrl}`);
      } catch (error) {
        const raw = error instanceof Error ? error.message : "Unknown error";
        const message = raw
          .replace(/\/[^\s:]+/g, "[path]")
          .replace(/(?:password|secret|token|key)[=:]\S+/gi, "[redacted]")
          .slice(0, 200);
        logger.error(`Clip ${clipId} failed: ${message}`);
        await prisma.clip.update({
          where: { id: clipId },
          data: { status: ClipStatus.FAILED, errorMessage: message },
        });

        publishClipProgress(jobId, clipId, 0, "failed");
      }
    },
    {
      connection: connectionOptions,
      concurrency: parseInt(process.env.CLIP_WORKER_CONCURRENCY || "3"),
    }
  );

  worker.on("failed", (job, err) => {
    logger.error(`Clip job ${job?.id} failed: ${err.message}`);
  });

  worker.on("ready", () => {
    logger.log("Clip worker ready");
  });

  return worker;
}
