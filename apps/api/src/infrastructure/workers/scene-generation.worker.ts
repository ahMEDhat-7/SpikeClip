import { Logger } from "@nestjs/common";
import { Job as BullMQJob, Worker } from "bullmq";
import { extractTopScenes } from "@spikeclip/shared";
import { PrismaService } from "../database/prisma.service";
import { YtdlpService } from "../external/ytdlp.service";
import { publishProgress } from "../redis/progress-publisher";

interface SceneGenerationJobData {
  sourceId: string;
  projectId: string;
  userId: string;
}

const connectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

export function createSceneGenerationWorker(
  prisma: PrismaService,
  ytdlp?: YtdlpService
): Worker {
  const logger = new Logger("SceneGenerationWorker");

  const worker = new Worker(
    "scene-generation",
    async (bullJob: BullMQJob<SceneGenerationJobData>) => {
      const { sourceId, projectId } = bullJob.data;
      const progressChannel = `progress:scene:${sourceId}`;
      logger.log(`Processing scene generation for source ${sourceId}`);

      try {
        await prisma.projectSource.update({
          where: { id: sourceId },
          data: { sourceStatus: "analyzing" },
        });

        publishProgress(progressChannel, { jobId: sourceId, progress: 5, step: "fetching_metadata" });

        const source = await prisma.projectSource.findUnique({
          where: { id: sourceId },
          select: { youtubeUrl: true },
        });
        if (!source?.youtubeUrl) {
          throw new Error("Source not found or missing URL");
        }

        const metadata = ytdlp
          ? await ytdlp.extractMetadata(source.youtubeUrl)
          : await fallbackExtractMetadata(source.youtubeUrl);

        publishProgress(progressChannel, { jobId: sourceId, progress: 50, step: "parsing_heatmap" });

        const heatmap = metadata.heatmap ?? [];

        if (!heatmap.length) {
          await prisma.projectSource.update({
            where: { id: sourceId },
            data: {
              sourceStatus: "error",
              errorMessage: "No heatmap data available for this video",
            },
          });
          publishProgress(progressChannel, { jobId: sourceId, progress: 0, step: "failed" });
          return;
        }

        await prisma.projectSource.update({
          where: { id: sourceId },
          data: {
            sourceStatus: "completed",
            analyticsJson: {
              viewCount: metadata.viewCount,
              uploadDate: metadata.uploadDate,
              channelName: metadata.channelName,
            },
          },
        });

        publishProgress(progressChannel, { jobId: sourceId, progress: 70, step: "extracting_scenes" });

        const scenes = extractTopScenes(heatmap);

        publishProgress(progressChannel, { jobId: sourceId, progress: 90, step: "saving_results" });

        let rank = 0;
        for (const scene of scenes) {
          rank++;
          await prisma.projectScene.create({
            data: {
              projectId,
              sourceId,
              startTime: scene.start_time,
              endTime: scene.end_time,
              duration: scene.duration,
              score: scene.score,
              rank,
              analysisJson: {
                peakIntensity: scene.peak_intensity,
                avgIntensity: scene.avg_intensity,
                confidence: scene.confidence,
                capped: scene.capped,
              },
            },
          });
        }

        publishProgress(progressChannel, { jobId: sourceId, progress: 100, step: "completed" });
        logger.log(`Generated ${scenes.length} scenes for source ${sourceId}`);
      } catch (error) {
        const raw = error instanceof Error ? error.message : "Unknown error";
        const message = raw
          .replace(/\/[^\s:]+/g, "[path]")
          .replace(/(?:password|secret|token|key)[=:]\S+/gi, "[redacted]")
          .slice(0, 200);
        logger.error(`Scene generation for source ${sourceId} failed: ${message}`);

        await prisma.projectSource.update({
          where: { id: sourceId },
          data: {
            sourceStatus: "error",
            errorMessage: message,
          },
        }).catch(() => {});

        publishProgress(progressChannel, { jobId: sourceId, progress: 0, step: "failed" });
      }
    },
    {
      connection: connectionOptions,
      concurrency: parseInt(process.env.SCENE_WORKER_CONCURRENCY || "3"),
    }
  );

  worker.on("failed", (job, err) => {
    logger.error(`Scene generation job ${job?.id} failed: ${err.message}`);
  });

  worker.on("ready", () => {
    logger.log("Scene generation worker ready");
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
    viewCount: metadata.view_count as number | undefined,
    uploadDate: metadata.upload_date as string | undefined,
    channelName: metadata.channel as string | undefined,
  };
}
