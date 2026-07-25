import { Injectable, Inject, Logger, BadRequestException } from "@nestjs/common";
import { PromptTranslationService } from "../../infrastructure/external/prompt-translation.service";
import { FilterGraphBuilder } from "../../infrastructure/external/filter-graph-builder";
import { FFMPEG_SERVICE } from "../../infrastructure/external/external.module";
import { FfmpegService } from "../../infrastructure/external/ffmpeg.service";
import { JOB_REPOSITORY, JobRepository } from "../../domain/repositories/job.repository";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { withTimeout } from "../../infrastructure/external/utils/timeout";
import type { StudioAction, PlatformId } from "@spikeclips/shared";
import { createHash } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { mkdir, unlink } from "fs/promises";
import { join } from "path";

const execFileAsync = promisify(execFile);
const PREVIEW_TMP = "/tmp/spikeclips-preview";
const YTDLP_TIMEOUT_MS = 5 * 60 * 1000;

const PLATFORM_DEFAULTS: Record<string, { aspectRatio: string; maxDuration: number }> = {
  "youtube-shorts": { aspectRatio: "9:16", maxDuration: 60 },
  "instagram-reels": { aspectRatio: "9:16", maxDuration: 90 },
  "tiktok": { aspectRatio: "9:16", maxDuration: 180 },
};

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
    @Inject(FFMPEG_SERVICE) private readonly ffmpegService: FfmpegService,
    @Inject(JOB_REPOSITORY) private readonly jobRepo: JobRepository,
    private readonly redisService: RedisService
  ) {}

  async translatePrompt(userId: string, dto: TranslatePromptDto) {
    const platformId = dto.platform as PlatformId;
    const defaults = PLATFORM_DEFAULTS[dto.platform] ?? { aspectRatio: "9:16", maxDuration: 60 };

    try {
      const result = await this.promptTranslation.translate(dto.prompt, {
        platform: platformId,
        aspectRatio: defaults.aspectRatio,
        maxDuration: defaults.maxDuration,
        sceneStart: dto.sceneStart,
        sceneEnd: dto.sceneEnd,
        sceneDuration: dto.sceneEnd - dto.sceneStart,
        availableAssets: [],
      });

      if (!result.success) {
        return {
          actions: [],
          ffmpegCommand: "",
          clarification: result.clarification ?? {
            question: result.error ?? "Could not process your request",
            suggestions: ["Try rephrasing", "Be more specific"],
          },
        };
      }

      const actions = result.actions ?? [];

      const { command: ffmpegCommand } = this.filterGraphBuilder.buildCommand({
        actions,
        platform: platformId,
        quality: "1080p",
        format: "mp4",
        inputPath: "",
        outputPath: "",
      });

      return {
        actions,
        ffmpegCommand,
        clarification: null,
      };
    } catch (error) {
      this.logger.error(`Translation failed: ${error instanceof Error ? error.message : error}`);
      return {
        actions: [],
        ffmpegCommand: "",
        clarification: {
          question: "Could you process your request. Please try again.",
          suggestions: ["Try rephrasing", "Be more specific"],
        },
      };
    }
  }

  async generatePreview(userId: string, dto: GeneratePreviewDto) {
    const actions = dto.actions as StudioAction[];
    const platformId = dto.platform as PlatformId;

    const cacheKey = this.getCacheKey(dto.sceneId, actions, dto.platform);
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return { previewUrl: cached, cached: true };
    }

    const [jobId, sceneIndexStr] = dto.sceneId.split("-");
    const sceneIndex = parseInt(sceneIndexStr, 10);
    const job = await this.jobRepo.findById(jobId);
    if (!job) throw new BadRequestException("Job not found");

    if (job.userId !== userId) {
      throw new BadRequestException("Unauthorized");
    }

    const scenes = job.scenes ?? [];
    const scene = scenes[sceneIndex];
    if (!scene) throw new BadRequestException("Scene not found");

    await mkdir(PREVIEW_TMP, { recursive: true });
    const tmpInput = join(PREVIEW_TMP, `${dto.sceneId}-source.mp4`);
    const outputPath = join(PREVIEW_TMP, `${dto.sceneId}-preview.mp4`);

    try {
      await withTimeout(
        execFileAsync("yt-dlp", [
          "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]",
          "--download-sections", `*${scene.start_time}-${scene.end_time}`,
          "--force-keyframes-at-cuts",
          "-o", tmpInput,
          job.url,
        ]),
        YTDLP_TIMEOUT_MS,
        "yt-dlp preview download"
      );

      await this.ffmpegService.applyPreviewActions(
        tmpInput,
        outputPath,
        actions,
        platformId
      );

      await this.redisService.set(cacheKey, outputPath, 3600);
      return { previewUrl: outputPath, cached: false };
    } finally {
      await unlink(tmpInput).catch(() => {});
    }
  }

  async generatePreviewForScene(userId: string, jobId: string, sceneIndex: number, dto: Omit<GeneratePreviewDto, "sceneId">) {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new BadRequestException("Job not found");
    }

    if (job.userId !== userId) {
      throw new BadRequestException("Unauthorized");
    }

    const scenes = job.scenes ?? [];
    const scene = scenes[sceneIndex];
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
