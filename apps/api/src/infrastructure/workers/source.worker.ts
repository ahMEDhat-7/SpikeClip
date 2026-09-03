import { Logger } from "@nestjs/common";
import { Job as BullMQJob, Worker } from "bullmq";
import { PrismaService } from "../database/prisma.service";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir } from "fs/promises";
import { getSourcePath, SOURCE_DIR } from "./source-path";
import { QueueName, JobStatus, YTDLP_FORMAT } from "@spikeclip/shared";

const execFileAsync = promisify(execFile);

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

export function createSourceWorker(prisma: PrismaService): Worker {
  const logger = new Logger("SourceWorker");

  const worker = new Worker(
    QueueName.SOURCE,
    async (bullJob: BullMQJob<SourceJobData>) => {
      const { jobId, start, end } = bullJob.data;
      logger.log(`Preparing shared source for job ${jobId} (${start}-${end}s)`);

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
        await execFileAsync("yt-dlp", [
          "--js-runtimes", "node",
          "-f",
          YTDLP_FORMAT,
          "--download-sections",
          `*${start}-${end}`,
          "--force-keyframes-at-cuts",
          "-o",
          sourcePath,
          job.url,
        ]);

        await prisma.job.update({
          where: { id: jobId },
          data: { sourceKey: sourcePath, sourceStart: start },
        });

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
