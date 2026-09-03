import { Logger } from "@nestjs/common";
import { Job as BullMQJob, Worker } from "bullmq";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../storage/storage.interface";
import { YtdlpService } from "../external/ytdlp.service";
import { getSourcePath, SOURCE_DIR } from "./source-path";
import { mkdir } from "fs/promises";
import { QueueName, JobStatus, YTDLP_FORMAT, MimeTypes } from "@spikeclip/shared";
import { publishJobProgress } from "../redis/progress-publisher";

interface SourceJobData {
  jobId: string;
  userId: string;
  start: number;
  end: number;
}

const connectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

export function createSourceWorker(
  prisma: PrismaService,
  ytdlp?: YtdlpService,
  storage?: StorageService
): Worker {
  const logger = new Logger("SourceWorker");

  const worker = new Worker(
    QueueName.SOURCE,
    async (bullJob: BullMQJob<SourceJobData>) => {
      const { jobId, start, end } = bullJob.data;
      logger.log(`Preparing shared source for job ${jobId} (${start}-${end}s)`);

      publishJobProgress(jobId, 5, "downloading_source");

      const job = await prisma.job.findUnique({
        where: { id: jobId },
        select: { url: true },
      });
      if (!job?.url) {
        logger.error(`Source job ${jobId}: no URL found, skipping`);
        return;
      }

      await mkdir(SOURCE_DIR, { recursive: true });
      const sourcePath = getSourcePath(jobId);

      try {
        // Use cached YtdlpService which checks file existence before downloading
        if (ytdlp) {
          await ytdlp.downloadSection(job.url, start, end, sourcePath);
        } else {
          const { execFile } = await import("child_process");
          const { promisify } = await import("util");
          const execFileAsync = promisify(execFile);
          await execFileAsync("yt-dlp", [
            "--js-runtimes", "node",
            "-f", YTDLP_FORMAT,
            "--download-sections", `*${start}-${end}`,
            "--force-keyframes-at-cuts",
            "-o", sourcePath,
            job.url,
          ]);
        }

        publishJobProgress(jobId, 80, "uploading_source");

        // Upload to storage for cross-worker access
        const storageKey = `sources/${jobId}/full.mp4`;
        if (storage) {
          try {
            await storage.uploadFromFile(sourcePath, storageKey, MimeTypes.VIDEO_MP4);
          } catch (err) {
            logger.warn(`Failed to upload source to storage for ${jobId}: ${err}`);
          }
        }

        await prisma.job.update({
          where: { id: jobId },
          data: { sourceKey: sourcePath, sourceStart: start, progress: 100 },
        });

        publishJobProgress(jobId, 100, "source_ready");

        logger.log(`Shared source ready for job ${jobId}: ${sourcePath}`);
      } catch (error) {
        const raw = error instanceof Error ? error.message : "Unknown error";
        const message = raw
          .replace(/\/[^\s:]+/g, "[path]")
          .replace(/(?:password|secret|token|key)[=:]\S+/gi, "[redacted]")
          .slice(0, 200);
        logger.error(`Source job ${jobId} failed: ${message}`);
        await prisma.job.update({
          where: { id: jobId },
          data: { status: JobStatus.FAILED, errorMessage: message },
        }).catch(() => {});

        publishJobProgress(jobId, 0, "failed");
      }
    },
    {
      connection: connectionOptions,
      concurrency: parseInt(process.env.SOURCE_WORKER_CONCURRENCY || "2"),
    }
  );

  worker.on("failed", (job, err) => {
    logger.error(`Source job ${job?.id} failed: ${err.message}`);
  });

  worker.on("ready", () => {
    logger.log("Source worker ready");
  });

  return worker;
}
