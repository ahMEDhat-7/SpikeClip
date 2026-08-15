import { Injectable, Inject, Logger, BadRequestException } from "@nestjs/common";
import { PromptTranslationService } from "../../infrastructure/external/prompt-translation.service";
import { FilterGraphBuilder } from "../../infrastructure/external/filter-graph-builder";
import { FFMPEG_SERVICE } from "../../infrastructure/external/external.module";
import { FfmpegService } from "../../infrastructure/external/ffmpeg.service";
import { JOB_REPOSITORY, JobRepository } from "../../domain/repositories/job.repository";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { STORAGE_SERVICE, StorageService } from "../../infrastructure/storage/storage.interface";
import { withTimeout } from "../../infrastructure/external/utils/timeout";
import {
  type StudioAction,
  type PlatformId,
  type StudioEditContext,
} from "@spikeclips/shared";
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
  currentActions?: Array<Record<string, unknown>>;
  captions?: Array<{ text: string; start?: number; end?: number }>;
  music?: { name: string; volume: number } | null;
  template?: { id: string; name: string } | null;
  availableTemplates?: Array<{ id: string; name: string }>;
  history?: Array<{ role: string; content: string }>;
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
    private readonly redisService: RedisService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly prisma: PrismaService
  ) {}

  async translatePrompt(userId: string, dto: TranslatePromptDto) {
    const platformId = dto.platform as PlatformId;
    const defaults = PLATFORM_DEFAULTS[dto.platform] ?? { aspectRatio: "9:16", maxDuration: 60 };

    try {
      const context: StudioEditContext = {
        platform: platformId,
        aspectRatio: defaults.aspectRatio,
        maxDuration: defaults.maxDuration,
        sceneStart: dto.sceneStart,
        sceneEnd: dto.sceneEnd,
        sceneDuration: dto.sceneEnd - dto.sceneStart,
        availableAssets: [],
        currentActions: (dto.currentActions ?? []) as StudioAction[],
        captions: dto.captions ?? [],
        music: dto.music ?? null,
        template: dto.template ?? null,
        availableTemplates: dto.availableTemplates ?? [],
      };

      const history = (dto.history ?? []).map((h) => ({
        role: (h.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        content: h.content,
      }));

      const result = await this.promptTranslation.translate(dto.prompt, context, history);

      if (!result.success) {
        return {
          actions: [],
          ffmpegCommand: "",
          summary: undefined,
          clarification: result.clarification ?? {
            question: result.error ?? "Could not process your request",
            suggestions: ["Try rephrasing", "Be more specific"],
          },
        };
      }

      if (result.clarification) {
        return {
          actions: [],
          ffmpegCommand: "",
          summary: undefined,
          clarification: result.clarification,
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
        summary: result.summary,
        clarification: null,
      };
    } catch (error) {
      this.logger.error(`Translation failed: ${error instanceof Error ? error.message : error}`);
      return {
        actions: [],
        ffmpegCommand: "",
        summary: undefined,
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
      try {
        const url = await this.storage.getSignedUrl(cached, 3600);
        return { previewUrl: url, cached: true };
      } catch {
        await this.redisService.del(cacheKey);
      }
    }

    const lastSep = dto.sceneId.lastIndexOf("::");
    if (lastSep === -1) throw new BadRequestException("Invalid sceneId format. Expected 'jobId::sceneIndex'");
    const jobId = dto.sceneId.slice(0, lastSep);
    const sceneIndexStr = dto.sceneId.slice(lastSep + 2);
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
          "--js-runtimes", "node",
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

      const storageKey = `previews/${dto.sceneId.replace(/::/g, "-")}-${Date.now()}.mp4`;
      await this.storage.uploadFromFile(outputPath, storageKey, "video/mp4");
      await this.redisService.set(cacheKey, storageKey, 3600);

      const url = await this.storage.getSignedUrl(storageKey, 3600);
      return { previewUrl: url, cached: false };
    } finally {
      await unlink(tmpInput).catch(() => {});
      await unlink(outputPath).catch(() => {});
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

    const sceneId = `${jobId}::${sceneIndex}`;
    return this.generatePreview(userId, { ...dto, sceneId });
  }

  private getCacheKey(sceneId: string, actions: StudioAction[], platform: string): string {
    const hash = createHash("sha256")
      .update(JSON.stringify({ sceneId, actions, platform }))
      .digest("hex")
      .slice(0, 16);
    return `preview:${hash}`;
  }

  async saveActions(userId: string, jobId: string, studioEdits: Record<number, StudioAction[]> | null) {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new BadRequestException("Job not found");
    }
    if (job.userId !== userId) {
      throw new BadRequestException("Unauthorized");
    }

    return this.jobRepo.update(jobId, { studioEdits });
  }

  async getProject(userId: string, jobId: string): Promise<Record<string, unknown> | null> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new BadRequestException("Job not found");
    }
    if (job.userId !== userId) {
      throw new BadRequestException("Unauthorized");
    }
    return job.project ?? null;
  }

  async saveProject(
    userId: string,
    jobId: string,
    project: Record<string, unknown> | null
  ): Promise<void> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new BadRequestException("Job not found");
    }
    if (job.userId !== userId) {
      throw new BadRequestException("Unauthorized");
    }
    await this.jobRepo.update(jobId, { project });
  }

  /**
   * Download the requested source section once, cache it in storage, and return
   * a signed URL the OpenReel editor can import directly.
   */
  async prepareSource(
    userId: string,
    jobId: string,
    start: number,
    end: number,
    force = false
  ): Promise<{ url: string; key: string }> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new BadRequestException("Job not found");
    }
    if (job.userId !== userId) {
      throw new BadRequestException("Unauthorized");
    }

    const safeStart = Math.max(0, Math.min(start, end - 0.1));
    const safeEnd = Math.max(end, start + 0.1);
    const storageKey = `sources/${jobId}/${Math.round(safeStart * 1000)}-${Math.round(safeEnd * 1000)}.mp4`;

    if (!force) {
      try {
        await this.storage.createReadStream(storageKey);
        return { url: await this.storage.getSignedUrl(storageKey, 3600), key: storageKey };
      } catch {
        // Not cached yet — fall through to download.
      }
    }

    const tmpInput = join(PREVIEW_TMP, `${jobId}-${Date.now()}-source.mp4`);
    await mkdir(PREVIEW_TMP, { recursive: true });
    try {
      await withTimeout(
        execFileAsync("yt-dlp", [
          "--js-runtimes", "node",
          job.url,
          "--no-warnings",
          "--force-keyframes-at-cuts",
          "-f",
          "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
          "--download-sections",
          `*${safeStart}-${safeEnd}`,
          "-o",
          tmpInput,
          "--no-playlist",
        ]),
        YTDLP_TIMEOUT_MS,
        "prepareSource yt-dlp"
      );
      await this.storage.uploadFromFile(tmpInput, storageKey, "video/mp4");
    } finally {
      await unlink(tmpInput).catch(() => {});
    }

    return { url: await this.storage.getSignedUrl(storageKey, 3600), key: storageKey };
  }

  /**
   * Store an exported clip produced by the OpenReel editor and register a Clip
   * record. The file bytes are uploaded to storage under a generated key.
   */
  async saveExportedClip(
    userId: string,
    jobId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
    meta: {
      sceneIndex?: number;
      startTime?: number;
      endTime?: number;
      duration?: number;
      fileSize?: number;
      peakIntensity?: number;
    }
  ): Promise<{ id: string; fileUrl: string }> {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      throw new BadRequestException("Job not found");
    }
    if (job.userId !== userId) {
      throw new BadRequestException("Unauthorized");
    }

    const ext = file.originalname.split(".").pop()?.toLowerCase() || "mp4";
    const contentType = file.mimetype || (ext === "webm" ? "video/webm" : "video/mp4");
    const storageKey = `clips/${jobId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    await this.storage.upload(file.buffer, storageKey, contentType);

    const created = await this.prisma.clip.create({
      data: {
        jobId,
        sceneIndex: meta.sceneIndex ?? 0,
        startTime: meta.startTime ?? 0,
        endTime: meta.endTime ?? meta.duration ?? 0,
        peakIntensity: meta.peakIntensity,
        status: "completed",
        fileUrl: storageKey,
        fileSize: file.buffer.length,
        duration: meta.duration,
        completedAt: new Date(),
      },
    });

    return { id: created.id, fileUrl: storageKey };
  }
}
