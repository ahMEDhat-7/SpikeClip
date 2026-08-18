import { Logger } from "@nestjs/common";
import { Job as BullMQJob, Worker } from "bullmq";
import { extractTopScenes } from "@spikeclip/shared";
import { PrismaService } from "../database/prisma.service";
import { AuthService } from "../auth/auth.service";
import { Prisma } from "@prisma/client";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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

export function createHeatmapWorker(prisma: PrismaService, authService: AuthService): Worker {
  const logger = new Logger("HeatmapWorker");

  const worker = new Worker(
    "analysis",
    async (bullJob: BullMQJob<HeatmapJobData>) => {
      const { jobId, url, userId } = bullJob.data;
      logger.log(`Processing heatmap for job ${jobId}`);

      try {
        await prisma.job.update({
          where: { id: jobId },
          data: { status: "processing" },
        });

        const { stdout } = await execFileAsync("yt-dlp", [
          "--js-runtimes", "node",
          "-j",
          "--no-download",
          url,
        ]);
        const metadata = JSON.parse(stdout);
        const heatmap = (metadata.heatmap ?? []) as Array<{
          start_time: number;
          end_time: number;
          value: number;
        }>;

        if (!heatmap.length) {
          // Refund analysis credit — video has no heatmap data
          await authService.decrementAnalyses(userId).catch(() => {});

          await prisma.job.update({
            where: { id: jobId },
            data: { status: "failed", errorMessage: "No heatmap data found for this video" },
          });
          return;
        }

        const scenes = extractTopScenes(heatmap);

        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: "completed",
            heatmapData: heatmap as unknown as Prisma.InputJsonValue,
            scenes: scenes as unknown as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        });

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
          data: { status: "failed", errorMessage: message },
        });
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
