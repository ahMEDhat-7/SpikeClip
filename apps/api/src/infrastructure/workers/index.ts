import { Logger } from "@nestjs/common";
import { Worker } from "bullmq";
import { PrismaService } from "../database/prisma.service";
import { AuthService } from "../auth/auth.service";
import { StorageService } from "../storage/storage.interface";
import { FfmpegService } from "../external/ffmpeg.service";
import { YtdlpService } from "../external/ytdlp.service";
import { createHeatmapWorker } from "./heatmap.worker";
import { createClipWorker } from "./clip.worker";
import { createSourceWorker } from "./source.worker";
import { createSceneGenerationWorker } from "./scene-generation.worker";
import { createProjectExportWorker } from "./project-export.worker";
import { closeProgressPublisher } from "../redis/progress-publisher";

const logger = new Logger("Workers");

let heatmapWorker: Worker | null = null;
let clipWorker: Worker | null = null;
let sourceWorker: Worker | null = null;
let sceneGenerationWorker: Worker | null = null;
let projectExportWorker: Worker | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let isShuttingDown = false;

function tryStartWorkers(
  prisma: PrismaService,
  authService: AuthService,
  storage: StorageService,
  ffmpeg?: FfmpegService,
  ytdlp?: YtdlpService
): boolean {
  try {
    heatmapWorker = createHeatmapWorker(prisma, authService, ytdlp);
    clipWorker = createClipWorker(prisma, storage, ffmpeg, ytdlp);
    sourceWorker = createSourceWorker(prisma, ytdlp, storage);
    sceneGenerationWorker = createSceneGenerationWorker(prisma, ytdlp);
    projectExportWorker = createProjectExportWorker(prisma, storage, ytdlp);
    logger.log("All workers started");
    return true;
  } catch (error) {
    logger.error("Failed to start workers:", error);
    return false;
  }
}

export function startWorkers(
  prisma: PrismaService,
  authService: AuthService,
  storage: StorageService,
  ffmpeg?: FfmpegService,
  ytdlp?: YtdlpService
): void {
  isShuttingDown = false;

  if (!tryStartWorkers(prisma, authService, storage, ffmpeg, ytdlp)) {
    // Retry every 10 seconds until Redis is available
    scheduleReconnect(prisma, authService, storage, ffmpeg, ytdlp);
  }
}

function scheduleReconnect(
  prisma: PrismaService,
  authService: AuthService,
  storage: StorageService,
  ffmpeg?: FfmpegService,
  ytdlp?: YtdlpService
): void {
  if (isShuttingDown) return;

  reconnectTimer = setTimeout(() => {
    if (isShuttingDown) return;
    logger.warn("Attempting worker reconnect...");
    if (tryStartWorkers(prisma, authService, storage, ffmpeg, ytdlp)) {
      logger.log("Workers reconnected successfully");
    } else {
      scheduleReconnect(prisma, authService, storage, ffmpeg, ytdlp);
    }
  }, 10_000);
}

export async function stopWorkers(): Promise<void> {
  isShuttingDown = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (heatmapWorker) {
    await heatmapWorker.close();
    heatmapWorker = null;
  }
  if (clipWorker) {
    await clipWorker.close();
    clipWorker = null;
  }
  if (sourceWorker) {
    await sourceWorker.close();
    sourceWorker = null;
  }
  if (sceneGenerationWorker) {
    await sceneGenerationWorker.close();
    sceneGenerationWorker = null;
  }
  if (projectExportWorker) {
    await projectExportWorker.close();
    projectExportWorker = null;
  }
  await closeProgressPublisher();
  logger.log("All workers stopped");
}
