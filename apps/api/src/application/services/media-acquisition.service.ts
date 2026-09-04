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

@Injectable()
export class YoutubeMediaService {
  private readonly logger = new Logger(YoutubeMediaService.name);

  constructor(
    private readonly ytdlpService: YtdlpService,
    @Inject(PROJECT_SOURCE_REPOSITORY) private readonly sourceRepo: ProjectSourceRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

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
        this.logger.log(`Uploaded source ${sourceId} to storage: ${storageKey}`);
      } catch (uploadErr) {
        this.logger.warn(`Failed to upload source ${sourceId} to storage: ${uploadErr}`);
      }

      await this.sourceRepo.update(sourceId, {
        mediaStatus: "available",
        storageKey,
      });

      // Cleanup temp file after upload
      await this.cleanupTempFile(outputPath);

      return { storageKey, duration: source.duration ?? 0 };
    } catch (error) {
      await this.sourceRepo.update(sourceId, {
        mediaStatus: "error",
        errorMessage: error instanceof Error ? error.message : "Download failed",
      });
      throw error;
    }
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
