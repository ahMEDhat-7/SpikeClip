import { Injectable, Logger, RequestTimeoutException } from "@nestjs/common";
import { execFile } from "child_process";
import { promisify } from "util";
import {
  VideoExtractor,
  VideoMetadata,
} from "../../domain/services/video-extractor";
import { HeatmapSpike } from "@spikeclips/shared";
import { withTimeout } from "./utils/timeout";

const execFileAsync = promisify(execFile);
const YTDLP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class YtdlpService implements VideoExtractor {
  private readonly logger = new Logger(YtdlpService.name);

  async extractMetadata(url: string): Promise<VideoMetadata> {
    this.logger.log(`Extracting metadata for: ${url}`);

    const { stdout } = await withTimeout(
      execFileAsync("yt-dlp", ["--js-runtimes", "node", "-j", "--write-info-json", "--no-download", url]),
      YTDLP_TIMEOUT_MS,
      "yt-dlp metadata extraction"
    );

    const metadata = JSON.parse(stdout);

    return {
      id: metadata.id,
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      viewCount: metadata.view_count ?? undefined,
      uploadDate: metadata.upload_date ?? undefined,
      channelName: metadata.channel ?? undefined,
      heatmap: (metadata.heatmap ?? []) as HeatmapSpike[],
    };
  }

  async extractHeatmap(url: string): Promise<HeatmapSpike[]> {
    this.logger.log(`Extracting heatmap for: ${url}`);

    const { stdout } = await withTimeout(
      execFileAsync("yt-dlp", ["--js-runtimes", "node", "-j", "--no-download", url]),
      YTDLP_TIMEOUT_MS,
      "yt-dlp heatmap extraction"
    );

    const metadata = JSON.parse(stdout);
    return (metadata.heatmap ?? []) as HeatmapSpike[];
  }

  async downloadSection(
    url: string,
    startTime: number,
    endTime: number,
    outputPath: string
  ): Promise<void> {
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
}
