import { Injectable, Logger, RequestTimeoutException } from "@nestjs/common";
import { execFile } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";
import {
  VideoExtractor,
  VideoMetadata,
} from "../../domain/services/video-extractor";
import { HeatmapSpike } from "@spikeclip/shared";
import { withTimeout } from "./utils/timeout";
import Redis from "ioredis";

const execFileAsync = promisify(execFile);
const YTDLP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const METADATA_CACHE_TTL = 3600; // 1 hour

@Injectable()
export class YtdlpService implements VideoExtractor {
  private readonly logger = new Logger(YtdlpService.name);
  private readonly redis: Redis | null;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });
      this.redis.on("error", (err) => {
        this.logger.warn(`Redis cache error: ${err.message}`);
      });
    } else {
      this.redis = null;
    }
  }

  private cacheKey(url: string, type: "meta" | "heatmap"): string {
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
    return `ytdlp:${type}:${hash}`;
  }

  async extractMetadata(url: string): Promise<VideoMetadata> {
    // Check Redis cache first
    const cacheKey = this.cacheKey(url, "meta");
    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.logger.log(`Cache hit for metadata: ${url}`);
          return JSON.parse(cached) as VideoMetadata;
        }
      } catch {
        // Cache read failure — fall through to yt-dlp
      }
    }

    this.logger.log(`Extracting metadata for: ${url}`);

    const { stdout } = await withTimeout(
      execFileAsync("yt-dlp", ["--js-runtimes", "node", "-j", "--write-info-json", "--no-download", url]),
      YTDLP_TIMEOUT_MS,
      "yt-dlp metadata extraction"
    );

    const metadata = JSON.parse(stdout);

    const result: VideoMetadata = {
      id: metadata.id,
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      viewCount: metadata.view_count ?? undefined,
      uploadDate: metadata.upload_date ?? undefined,
      channelName: metadata.channel ?? undefined,
      heatmap: (metadata.heatmap ?? []) as HeatmapSpike[],
    };

    // Cache result
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, METADATA_CACHE_TTL, JSON.stringify(result));
      } catch {
        // Cache write failure — non-critical
      }
    }

    return result;
  }

  async extractHeatmap(url: string): Promise<HeatmapSpike[]> {
    const meta = await this.extractMetadata(url);
    return meta.heatmap ?? [];
  }

  async downloadSection(
    url: string,
    startTime: number,
    endTime: number,
    outputPath: string
  ): Promise<void> {
    // Skip download if file already exists
    try {
      await access(outputPath);
      this.logger.log(`Source already exists, skipping download: ${outputPath}`);
      return;
    } catch {
      // File doesn't exist — proceed with download
    }

    this.logger.log(
      `Downloading section ${startTime}-${endTime} from: ${url}`
    );

    await withTimeout(
      execFileAsync("yt-dlp", [
        "--js-runtimes", "node",
        "-f",
        "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]",
        `--download-sections`,
        `*${startTime}-${endTime}`,
        "--force-keyframes-at-cuts",
        "-o",
        outputPath,
        url,
      ]),
      YTDLP_TIMEOUT_MS,
      "yt-dlp section download"
    );
  }

  async destroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => {});
    }
  }
}
