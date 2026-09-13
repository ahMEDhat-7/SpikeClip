import { Injectable, Logger, Inject } from "@nestjs/common";
import { execFile } from "child_process";
import { promisify } from "util";
import { access, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { YtdlpService } from "../../infrastructure/external/ytdlp.service";
import { PROJECT_SOURCE_REPOSITORY, type ProjectSourceRepository } from "../../domain/repositories/project-source.repository";
import { STORAGE_SERVICE, type StorageService } from "../../infrastructure/storage/storage.interface";

const execFileAsync = promisify(execFile);
const YTDLP_TIMEOUT_MS = 5 * 60 * 1000;
const TEMP_DIR = "/tmp/spikeclips-source";
const FULL_SOURCE_THRESHOLD_MINUTES = 20;

@Injectable()
export class YoutubeMediaService {
  private readonly logger = new Logger(YoutubeMediaService.name);

  constructor(
    private readonly ytdlpService: YtdlpService,
    @Inject(PROJECT_SOURCE_REPOSITORY) private readonly sourceRepo: ProjectSourceRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  private shouldDownloadFullSource(durationMinutes: number): boolean {
    return durationMinutes < FULL_SOURCE_THRESHOLD_MINUTES;
  }

  async downloadSource(sourceId: string): Promise<{ storageKey: string; duration: number }> {
    const source = await this.sourceRepo.findById(sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);

    if (source.mediaStatus === "available" && source.storageKey) {
      this.logger.log(`Source ${sourceId} already downloaded`);
      return { storageKey: source.storageKey, duration: source.duration ?? 0 };
    }

    await this.sourceRepo.update(sourceId, { mediaStatus: "downloading" });

    try {
      await mkdir(TEMP_DIR, { recursive: true });
      const durationMinutes = (source.duration ?? 0) / 60;

      if (this.shouldDownloadFullSource(durationMinutes)) {
        return await this.downloadFullSource(sourceId, source);
      } else {
        this.logger.log(`Source ${sourceId} is ${durationMinutes.toFixed(1)}min (>= ${FULL_SOURCE_THRESHOLD_MINUTES}min), using scoped acquisition`);
        return await this.markReadyForScopedDownload(sourceId, source);
      }
    } catch (error) {
      await this.sourceRepo.update(sourceId, {
        mediaStatus: "error",
        errorMessage: error instanceof Error ? error.message : "Download failed",
      });
      throw error;
    }
  }

  private async downloadFullSource(
    sourceId: string,
    source: { youtubeUrl: string; projectId: string; duration: number | null },
  ): Promise<{ storageKey: string; duration: number }> {
    const outputPath = join(TEMP_DIR, `${sourceId}.mp4`);

    await this.ytdlpService.downloadSection(
      source.youtubeUrl,
      0,
      source.duration ?? 0,
      outputPath,
    );

    const storageKey = `sources/${source.projectId}/${sourceId}/full.mp4`;

    try {
      await this.storage.uploadFromFile(outputPath, storageKey, "video/mp4");
      this.logger.log(`Uploaded full source ${sourceId} to storage: ${storageKey}`);
    } catch (uploadErr) {
      this.logger.warn(`Failed to upload source ${sourceId} to storage: ${uploadErr}`);
    }

    await this.sourceRepo.update(sourceId, {
      mediaStatus: "available",
      storageKey,
    });

    await this.cleanupTempFile(outputPath);

    return { storageKey, duration: source.duration ?? 0 };
  }

  private async markReadyForScopedDownload(
    sourceId: string,
    source: { duration: number | null },
  ): Promise<{ storageKey: string; duration: number }> {
    await this.sourceRepo.update(sourceId, {
      mediaStatus: "available",
      storageKey: `sources/scoped/${sourceId}`,
    });

    return { storageKey: `sources/scoped/${sourceId}`, duration: source.duration ?? 0 };
  }

  async downloadSceneSection(
    sourceId: string,
    sceneId: string,
    startTime: number,
    endTime: number,
  ): Promise<{ localPath: string; storageKey: string }> {
    const source = await this.sourceRepo.findById(sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);

    await mkdir(TEMP_DIR, { recursive: true });
    const outputPath = join(TEMP_DIR, `${sceneId}.mp4`);

    this.logger.log(`Downloading scene section ${startTime}-${endTime} for source ${sourceId}`);

    await this.ytdlpService.downloadSection(
      source.youtubeUrl,
      startTime,
      endTime,
      outputPath,
    );

    const storageKey = `scenes/${source.projectId}/${sceneId}.mp4`;

    try {
      await this.storage.uploadFromFile(outputPath, storageKey, "video/mp4");
      this.logger.log(`Uploaded scene ${sceneId} to storage: ${storageKey}`);
    } catch (uploadErr) {
      this.logger.warn(`Failed to upload scene ${sceneId}: ${uploadErr}`);
    }

    return { localPath: outputPath, storageKey };
  }

  async downloadSection(
    sourceId: string,
    startTime: number,
    endTime: number,
  ): Promise<string> {
    const source = await this.sourceRepo.findById(sourceId);
    if (!source) throw new Error(`Source ${sourceId} not found`);

    await mkdir(TEMP_DIR, { recursive: true });
    const outputPath = join(TEMP_DIR, `${sourceId}-${startTime}-${endTime}.mp4`);

    await this.ytdlpService.downloadSection(
      source.youtubeUrl,
      startTime,
      endTime,
      outputPath,
    );

    return outputPath;
  }

  async extractMetadata(url: string) {
    return this.ytdlpService.extractMetadata(url);
  }

  async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
