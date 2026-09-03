import { Injectable, Logger, Inject } from "@nestjs/common";
import { randomUUID } from "crypto";
import { QueueService, QUEUE_SERVICE, ExportJobConfig } from "../../domain/services/queue";
import { JobNotFoundException } from "../../domain/exceptions/job-not-found.exception";
import { JobRepository, JOB_REPOSITORY } from "../../domain/repositories/job.repository";
import { UserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { ClipRepository, CLIP_REPOSITORY } from "../../domain/repositories/clip.repository";
import { getSourcePath } from "../../infrastructure/workers/source-path";
import { ClipStatus } from "@spikeclip/shared";
import type { StudioAction } from "@spikeclip/shared";

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
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(CLIP_REPOSITORY) private readonly clipRepository: ClipRepository,
    @Inject(QUEUE_SERVICE) private readonly queueService: QueueService
  ) {}

  async execute(
    jobId: string,
    scenes: ExportScene[],
    userId: string,
    studioConfig?: StudioConfig
  ): Promise<{ jobId: string; clipJobIds: string[] }> {
    this.logger.log(`Exporting ${scenes.length} clips for job ${jobId}`);

    const job = await this.jobRepository.findById(jobId);
    if (!job) throw new JobNotFoundException(jobId);

    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error("User not found");

    if (!user.canExportClips(scenes.length)) {
      const remaining = user.getClipsRemaining();
      throw new Error(
        remaining === 0
          ? "Clip export limit reached. Upgrade your plan for more clips."
          : `Not enough clips remaining. You have ${remaining} clip(s) left.`
      );
    }

    const clipJobIds: string[] = [];
    const createdClipIds: string[] = [];

    try {
      if (scenes.length > 0) {
        const sourceStart = Math.max(0, Math.min(...scenes.map((s) => s.start_time)));
        const sourceEnd = Math.max(...scenes.map((s) => s.end_time));
        const sourceKey = getSourcePath(jobId);

        await this.jobRepository.update(jobId, { sourceKey } as any);

        const sourceBullJobId = await this.queueService.addSourceJob(jobId, {
          userId,
          start: sourceStart,
          end: sourceEnd,
        });
        this.logger.log(`Enqueued shared source job for ${jobId} (${sourceStart}-${sourceEnd}s)`);

        for (let idx = 0; idx < scenes.length; idx++) {
          const scene = scenes[idx];

          const clipId = randomUUID();

          const clip = await this.clipRepository.create({
            id: clipId,
            jobId,
            sceneIndex: idx,
            startTime: scene.start_time,
            endTime: scene.end_time,
            peakIntensity: scene.peak_intensity ?? undefined,
            status: ClipStatus.PENDING,
          } as any);
          createdClipIds.push(clipId);

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

          await this.queueService.addExportJob(jobId, exportConfig, sourceBullJobId);

          clipJobIds.push(clipId);
        }
      }

      user.incrementClipUsage(scenes.length);
      await this.userRepository.save(user);
    } catch (error) {
      if (createdClipIds.length > 0) {
        await this.clipRepository.deleteMany(createdClipIds).catch(() => {});
      }
      throw error;
    }

    return { jobId, clipJobIds };
  }
}
