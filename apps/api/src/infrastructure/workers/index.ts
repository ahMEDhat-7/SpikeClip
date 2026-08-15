import { Logger } from "@nestjs/common";
import { Worker } from "bullmq";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../storage/storage.interface";
import { FfmpegService } from "../external/ffmpeg.service";
import { createHeatmapWorker } from "./heatmap.worker";
import { createClipWorker } from "./clip.worker";
import { createSourceWorker } from "./source.worker";

let heatmapWorker: Worker | null = null;
let clipWorker: Worker | null = null;
let sourceWorker: Worker | null = null;

export function startWorkers(
  prisma: PrismaService,
  storage: StorageService,
  ffmpeg?: FfmpegService
): void {
  const logger = new Logger("Workers");

  try {
    heatmapWorker = createHeatmapWorker(prisma);
    clipWorker = createClipWorker(prisma, storage, ffmpeg);
    sourceWorker = createSourceWorker(prisma);
    logger.log("All workers started");
  } catch (error) {
    logger.error("Failed to start workers:", error);
  }
}

export async function stopWorkers(): Promise<void> {
  const logger = new Logger("Workers");
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
  logger.log("All workers stopped");
}
