import { Logger } from "@nestjs/common";
import { Job as BullMQJob, Worker } from "bullmq";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../storage/storage.interface";
import { FfmpegService } from "../external/ffmpeg.service";
import { CaptionOverlay, MusicMixConfig } from "../../domain/services/video-processor";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { unlink, mkdir, stat, access } from "fs/promises";
import { join } from "path";
import type { StudioAction } from "@spikeclips/shared";

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
  ffmpeg?: FfmpegService
): Worker {
  const logger = new Logger("ClipWorker");

  const worker = new Worker(
    "export",
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
          data: { status: "processing" },
        });

        const tmpInput = join(TMP_DIR, `${clipId}-source.mp4`);
        const tmpCropped = join(TMP_DIR, `${clipId}-cropped.mp4`);
        const tmpCaptions = join(TMP_DIR, `${clipId}-captions.mp4`);
        const tmpEffects = join(TMP_DIR, `${clipId}-effects.mp4`);
        const tmpOutput = join(TMP_DIR, `${clipId}-output.mp4`);

        const duration = endTime - startTime;

        // Step 1: Download the specific section via yt-dlp
        await execFileAsync("yt-dlp", [
          "-f",
          "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]",
          "--download-sections",
          `*${startTime}-${endTime}`,
          "--force-keyframes-at-cuts",
          "-o",
          tmpInput,
          videoUrl,
        ]);

        // Step 2: Vertical crop or pass-through encode
        if (vertical) {
          await execFileAsync("ffmpeg", [
            "-y", "-i", tmpInput,
            "-vf", "crop=ih*9/16:ih,scale=1080:1920",
            "-c:v", "libx264", "-c:a", "aac",
            tmpCropped,
          ]);
        } else {
          await execFileAsync("ffmpeg", [
            "-y", "-i", tmpInput,
            "-t", String(duration),
            "-c:v", "libx264", "-c:a", "aac",
            tmpCropped,
          ]);
        }

        let currentFile = tmpCropped;

        // Step 3: Caption overlay (with timing from startFrame/endFrame)
        if (captions && captions.length > 0 && ffmpeg) {
          try {
            await ffmpeg.overlayCaptions(currentFile, tmpCaptions, captions, duration);
            currentFile = tmpCaptions;
            logger.log(`Applied ${captions.length} caption(s) with timing to clip ${clipId}`);
          } catch (capErr) {
            logger.warn(`Caption overlay failed for ${clipId}: ${capErr instanceof Error ? capErr.message : capErr}`);
          }
        }

        // Step 4: Template effects (vignette, layout)
        if (templateConfig && ffmpeg) {
          try {
            await ffmpeg.applyTemplateEffects(currentFile, tmpEffects, templateConfig);
            currentFile = tmpEffects;
            logger.log(`Applied template effects to clip ${clipId}`);
          } catch (fxErr) {
            logger.warn(`Template effects failed for ${clipId}: ${fxErr instanceof Error ? fxErr.message : fxErr}`);
          }
        }

        // Step 4.5: Apply StudioActions (effects, speed, overlays, etc.)
        if (actions && actions.length > 0 && ffmpeg) {
          try {
            const actionsOutput = join(TMP_DIR, `${clipId}-actions.mp4`);
            await ffmpeg.applyStudioActions(
              currentFile,
              actionsOutput,
              actions,
              (bullJob.data.platform as "youtube-shorts" | "instagram-reels" | "tiktok") || "youtube-shorts"
            );
            currentFile = actionsOutput;
            logger.log(`Applied ${actions.length} studio action(s) to clip ${clipId}`);
          } catch (actErr) {
            logger.warn(`Studio actions failed for ${clipId}: ${actErr instanceof Error ? actErr.message : actErr}`);
          }
        }

        // Step 5: Music mix (with correct fade-out and -shortest)
        if (music) {
          try {
            const musicSignedUrl = await storage.getSignedUrl(music.fileKey, 300);
            const sanitizedKey = music.fileKey.replace(/[^a-zA-Z0-9._-]/g, "_");
            const musicPath = join(TMP_DIR, `${clipId}-music-${sanitizedKey}`);
            const response = await fetch(musicSignedUrl);
            if (!response.ok) throw new Error(`Failed to download music: ${response.status}`);
            const buffer = Buffer.from(await response.arrayBuffer());
            const { writeFile } = await import("fs/promises");
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

        // Step 6: If no music mix wrote to tmpOutput, copy current state there
        if (currentFile !== tmpOutput) {
          await execFileAsync("cp", [currentFile, tmpOutput]);
        }

        // Step 7: Upload to storage
        const storageKey = `clips/${jobId}/${sceneIndex}-${randomUUID().slice(0, 8)}.mp4`;
        await storage.uploadFromFile(tmpOutput, storageKey, "video/mp4");
        const fileUrl = storageKey;
        const fileSize = (await stat(tmpOutput)).size;

        // Step 8: Update DB
        await prisma.clip.update({
          where: { id: clipId },
          data: {
            status: "completed",
            fileUrl,
            fileSize,
            duration,
            completedAt: new Date(),
          },
        });

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
          data: { status: "failed", errorMessage: message },
        });
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
