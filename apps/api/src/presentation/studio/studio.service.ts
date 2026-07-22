import { Injectable, Inject, Logger, BadRequestException } from "@nestjs/common";
import { PromptTranslationService } from "../../infrastructure/external/prompt-translation.service";
import { FilterGraphBuilder } from "../../infrastructure/external/filter-graph-builder";
import { FFmpegService } from "../../infrastructure/external/ffmpeg.service";
import { JOB_REPOSITORY, JobRepository } from "../../domain/repositories/job.repository";
import { CLIP_REPOSITORY, ClipRepository } from "../../domain/repositories/clip.repository";
import { RedisService } from "../../infrastructure/redis/redis.service";
import type { StudioAction } from "@spikeclips/shared";
import { createHash } from "crypto";

interface TranslatePromptDto {
  prompt: string;
  sceneStart: number;
  sceneEnd: number;
  platform: string;
}

interface GeneratePreviewDto {
  sceneId: string;
  actions: Array<Record<string, unknown>>;
  platform: string;
}

@Injectable()
export class StudioService {
  private readonly logger = new Logger(StudioService.name);

  constructor(
    private readonly promptTranslation: PromptTranslationService,
    private readonly filterGraphBuilder: FilterGraphBuilder,
    private readonly ffmpegService: FFmpegService,
    @Inject(JOB_REPOSITORY) private readonly jobRepo: JobRepository,
    @Inject(CLIP_REPOSITORY) private readonly clipRepo: ClipRepository,
    private readonly redisService: RedisService
  ) {}

  async translatePrompt(userId: string, dto: TranslatePromptDto) {
    try {
      const actions = await this.promptTranslation.translate(dto.prompt, {
        start: dto.sceneStart,
        end: dto.sceneEnd,
        platform: dto.platform as "youtube_shorts" | "instagram_reels" | "tiktok",
      });

      const ffmpegCommand = this.filterGraphBuilder.buildFilterGraph(actions, {
        width: 1080,
        height: 1920,
        fps: 30,
      });

      return {
        actions,
        ffmpegCommand,
        clarification: null,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("clarification")) {
        return {
          actions: [],
          ffmpegCommand: "",
          clarification: {
            question: "Could you clarify what you mean?",
            suggestions: ["Try rephrasing", "Be more specific"],
          },
        };
      }
      throw error;
    }
  }

  async generatePreview(userId: string, dto: GeneratePreviewDto) {
    const actions = dto.actions as StudioAction[];
    
    const cacheKey = this.getCacheKey(dto.sceneId, actions, dto.platform);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return { previewUrl: cached, cached: true };
    }

    const previewUrl = await this.ffmpegService.applyPreviewActions(
      dto.sceneId,
      actions,
      dto.platform as "youtube_shorts" | "instagram_reels" | "tiktok"
    );

    await this.redisService.set(cacheKey, previewUrl, 3600);

    return { previewUrl, cached: false };
  }

  async generatePreviewForScene(userId: string, jobId: string, sceneIndex: number, dto: Omit<GeneratePreviewDto, "sceneId">) {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new BadRequestException("Job not found");
    }

    if (job.userId !== userId) {
      throw new BadRequestException("Unauthorized");
    }

    const scene = job.scenes[sceneIndex];
    if (!scene) {
      throw new BadRequestException("Scene not found");
    }

    const sceneId = `${jobId}-${sceneIndex}`;
    return this.generatePreview(userId, { ...dto, sceneId });
  }

  private getCacheKey(sceneId: string, actions: StudioAction[], platform: string): string {
    const hash = createHash("sha256")
      .update(JSON.stringify({ sceneId, actions, platform }))
      .digest("hex")
      .slice(0, 16);
    return `preview:${hash}`;
  }
}
