import { Injectable, Logger, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import { QueueService, QUEUE_SERVICE, ExportJobConfig } from "../../domain/services/queue";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { JobNotFoundException } from "../../domain/exceptions/job-not-found.exception";
import { JobRepository, JOB_REPOSITORY } from "../../domain/repositories/job.repository";
import type { StudioAction } from "@spikeclips/shared";

interface ExportScene {
  start_time: number;
  end_time: number;
  peak_intensity?: number;
}

interface StudioConfig {
  platform?: string;
  format?: string;
  quality?: string;
  captions?: Array<{
    text: string;
    font: string;
    size: number;
    color: string;
    position: string;
    textAlign?: string;
    startFrame?: number;
    endFrame?: number;
    animation: string;
    textStyle?: string;
    opacity?: number;
    backgroundColor?: string;
    backgroundEnabled?: boolean;
    strokeWidth?: number;
    shadowRadius?: number;
    x?: number;
    y?: number;
  }>;
  music?: {
    fileKey: string;
    volume: number;
    originalVolume: number;
    fadeIn: number;
    fadeOut: number;
  };
  templateId?: string;
  templateConfig?: Record<string, unknown>;
  actions?: StudioAction[];
}

@Injectable()
export class ExportClipsUseCase {
  private readonly logger = new Logger(ExportClipsUseCase.name);

  constructor(
    @Inject(JOB_REPOSITORY) private readonly jobRepository: JobRepository,
    @Inject(QUEUE_SERVICE) private readonly queueService: QueueService,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    jobId: string,
    scenes: ExportScene[],
    studioConfig?: StudioConfig
  ): Promise<{ jobId: string; clipJobIds: string[] }> {
    this.logger.log(`Exporting ${scenes.length} clips for job ${jobId}`);

    const job = await this.jobRepository.findById(jobId);
    if (!job) throw new JobNotFoundException(jobId);

    const clipJobIds: string[] = [];

    for (let idx = 0; idx < scenes.length; idx++) {
      const scene = scenes[idx];

      const clipId = randomUUID();

      await this.prisma.clip.create({
        data: {
          id: clipId,
          jobId,
          sceneIndex: idx,
          startTime: scene.start_time,
          endTime: scene.end_time,
          peakIntensity: scene.peak_intensity ?? null,
          status: "pending",
        },
      });

      const exportConfig: ExportJobConfig = {
        clipId,
        sceneIndex: idx,
        videoUrl: job.url,
        startTime: scene.start_time,
        endTime: scene.end_time,
        vertical: true,
        platform: studioConfig?.platform,
        format: studioConfig?.format,
        quality: studioConfig?.quality,
        captions: studioConfig?.captions,
        music: studioConfig?.music,
        templateId: studioConfig?.templateId,
        templateConfig: studioConfig?.templateConfig,
        actions: studioConfig?.actions,
      };

      await this.queueService.addExportJob(jobId, exportConfig);

      clipJobIds.push(clipId);
    }

    return { jobId, clipJobIds };
  }
}
