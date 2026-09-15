import { Logger } from "@nestjs/common";
import { Job as BullMQJob, Worker } from "bullmq";
import { extractTopScenes } from "@spikeclip/shared";
import { PrismaService } from "../database/prisma.service";
import { AuthService } from "../auth/auth.service";
import { YtdlpService } from "../external/ytdlp.service";
import { Prisma } from "@prisma/client";
import { QueueName, JobStatus } from "@spikeclip/shared";
import { publishJobProgress } from "../redis/progress-publisher";

interface HeatmapJobData {
  jobId: string;
  url: string;
  userId: string;
}

const connectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

export function createHeatmapWorker(
  prisma: PrismaService,
  authService: AuthService,
  ytdlp?: YtdlpService
): Worker {
  const logger = new Logger("HeatmapWorker");

  const worker = new Worker(
    QueueName.ANALYSIS,
    async (bullJob: BullMQJob<HeatmapJobData>) => {
      const { jobId, url, userId } = bullJob.data;
      logger.log(`Processing heatmap for job ${jobId}`);

      try {
        await prisma.job.update({
          where: { id: jobId },
          data: { status: JobStatus.PROCESSING, startedAt: new Date(), progress: 0 },
        });

        publishJobProgress(jobId, 5, "fetching_metadata");

        // Use cached YtdlpService instead of inline execFileAsync
        const metadata = ytdlp
          ? await ytdlp.extractMetadata(url)
          : await fallbackExtractMetadata(url);

        publishJobProgress(jobId, 50, "parsing_heatmap");

        const heatmap = metadata.heatmap ?? [];

        if (!heatmap.length) {
          await authService.decrementAnalyses(userId).catch(() => {});

          await prisma.job.update({
            where: { id: jobId },
            data: { status: JobStatus.FAILED, errorMessage: "No heatmap data found for this video" },
          });

          publishJobProgress(jobId, 0, "failed");
          return;
        }

        publishJobProgress(jobId, 70, "extracting_scenes");

        const scenes = extractTopScenes(heatmap);

        publishJobProgress(jobId, 90, "saving_results");

        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: JobStatus.COMPLETED,
            progress: 100,
            heatmapData: heatmap as unknown as Prisma.InputJsonValue,
            scenes: scenes as unknown as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        });

        publishJobProgress(jobId, 100, "completed");

        logger.log(`Completed heatmap for job ${jobId}: ${scenes.length} scenes`);
      } catch (error) {
        const raw = error instanceof Error ? error.message : "Unknown error";
        const message = raw
          .replace(/\/[^\s:]+/g, "[path]")
          .replace(/(?:password|secret|token|key)[=:]\S+/gi, "[redacted]")
          .slice(0, 200);
        logger.error(`Heatmap job ${jobId} failed: ${message}`);

        await prisma.job.update({
          where: { id: jobId },
          data: { status: JobStatus.FAILED, errorMessage: message },
        });

        publishJobProgress(jobId, 0, "failed");
      }
    },
    {
      connection: connectionOptions,
      concurrency: parseInt(process.env.HEATMAP_WORKER_CONCURRENCY || "5"),
    }
  );

  worker.on("failed", (job, err) => {
    logger.error(`Job ${job?.id} failed: ${err.message}`);
  });

  worker.on("ready", () => {
    logger.log("Heatmap worker ready");
  });

  return worker;
}

async function fallbackExtractMetadata(url: string) {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);

  const { stdout } = await execFileAsync("yt-dlp", [
    "--js-runtimes", "node",
    "-j",
    "--no-download",
    url,
  ]);
  const metadata = JSON.parse(stdout);
  return {
    heatmap: (metadata.heatmap ?? []) as Array<{
      start_time: number;
      end_time: number;
      value: number;
    }>,
  };
}
