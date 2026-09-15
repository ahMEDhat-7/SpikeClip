import { Logger } from "@nestjs/common";
import { Job as BullMQJob, Worker } from "bullmq";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../storage/storage.interface";
import { YtdlpService } from "../external/ytdlp.service";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { unlink, mkdir, stat, rename } from "fs/promises";
import { join } from "path";
import { ProjectExportJobData } from "../../domain/services/queue";
import {
  ClipStatus,
  FfmpegCodec,
  VERTICAL_CROP_FILTER,
  YTDLP_FORMAT,
  CLIPS_STORAGE_PREFIX,
  MimeTypes,
} from "@spikeclip/shared";

const execFileAsync = promisify(execFile);
const TMP_DIR = "/tmp/spikeclips-project-export";

const connectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

export function createProjectExportWorker(
  prisma: PrismaService,
  storage: StorageService,
  ytdlp?: YtdlpService
): Worker {
  const logger = new Logger("ProjectExportWorker");

  const worker = new Worker(
    "project-export",
    async (bullJob: BullMQJob<ProjectExportJobData>) => {
      const { clipId, projectId, sourceId, videoUrl, startTime, endTime } = bullJob.data;
      logger.log(`Processing project export clip ${clipId}`);

      await mkdir(TMP_DIR, { recursive: true });

      try {
        await prisma.generatedClip.update({
          where: { id: clipId },
          data: { status: ClipStatus.PROCESSING, startedAt: new Date(), progress: 10 },
        });

        const duration = endTime - startTime;
        const tmpInput = join(TMP_DIR, `${clipId}-source.mp4`);
        const tmpCropped = join(TMP_DIR, `${clipId}-cropped.mp4`);
        const tmpOutput = join(TMP_DIR, `${clipId}-output.mp4`);

        // Step 1: Download section
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

        await prisma.generatedClip.update({
          where: { id: clipId },
          data: { progress: 40 },
        });

        // Step 2: Vertical crop
        await execFileAsync("ffmpeg", [
          "-y", "-i", tmpInput,
          "-vf", VERTICAL_CROP_FILTER,
          "-c:v", FfmpegCodec.VIDEO, "-c:a", FfmpegCodec.AUDIO,
          tmpCropped,
        ]);

        await prisma.generatedClip.update({
          where: { id: clipId },
          data: { progress: 70 },
        });

        // Step 3: Final encode
        await execFileAsync("ffmpeg", [
          "-y", "-i", tmpCropped,
          "-t", String(duration),
          "-c:v", FfmpegCodec.VIDEO, "-c:a", FfmpegCodec.AUDIO,
          tmpOutput,
        ]);

        await prisma.generatedClip.update({
          where: { id: clipId },
          data: { progress: 85 },
        });

        // Step 4: Upload to storage
        const storageKey = `${CLIPS_STORAGE_PREFIX}${projectId}/${clipId}-${randomUUID().slice(0, 8)}.mp4`;
        await storage.uploadFromFile(tmpOutput, storageKey, MimeTypes.VIDEO_MP4);
        const fileSize = (await stat(tmpOutput)).size;

        // Step 5: Update DB
        await prisma.generatedClip.update({
          where: { id: clipId },
          data: {
            status: ClipStatus.COMPLETED,
            progress: 100,
            outputStorageKey: storageKey,
            fileUrl: storageKey,
            size: fileSize,
            duration,
            completedAt: new Date(),
          },
        });

        // Step 6: Cleanup
        await unlink(tmpInput).catch(() => {});
        await unlink(tmpCropped).catch(() => {});
        await unlink(tmpOutput).catch(() => {});

        logger.log(`Completed project export clip ${clipId}: ${storageKey}`);
      } catch (error) {
        const raw = error instanceof Error ? error.message : "Unknown error";
        const message = raw
          .replace(/\/[^\s:]+/g, "[path]")
          .replace(/(?:password|secret|token|key)[=:]\S+/gi, "[redacted]")
          .slice(0, 200);
        logger.error(`Project export clip ${clipId} failed: ${message}`);

        await prisma.generatedClip.update({
          where: { id: clipId },
          data: { status: ClipStatus.FAILED, errorMessage: message },
        }).catch(() => {});
      }
    },
    {
      connection: connectionOptions,
      concurrency: parseInt(process.env.PROJECT_EXPORT_WORKER_CONCURRENCY || "3"),
    }
  );

  worker.on("failed", (job, err) => {
    logger.error(`Project export job ${job?.id} failed: ${err.message}`);
  });

  worker.on("ready", () => {
    logger.log("Project export worker ready");
  });

  return worker;
}
