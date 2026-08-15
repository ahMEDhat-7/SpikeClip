import { Injectable, Logger, Inject, BadRequestException } from "@nestjs/common";
import { Job } from "../../domain/entities/job.entity";
import { YoutubeUrl } from "../../domain/value-objects/youtube-url";
import { JobRepository, JOB_REPOSITORY } from "../../domain/repositories/job.repository";
import { VideoExtractor, VIDEO_EXTRACTOR } from "../../domain/services/video-extractor";
import { JobResponseDto } from "../dto/job-response.dto";

const MIN_VIEWS = 1000;
const MIN_AGE_DAYS = 3;
const HEATMAP_READY_DAYS = 7;

function daysSinceDate(dateStr: string): number {
  if (!dateStr || dateStr.length !== 8) return Infinity;
  const year = parseInt(dateStr.slice(0, 4), 10);
  const month = parseInt(dateStr.slice(4, 6), 10) - 1;
  const day = parseInt(dateStr.slice(6, 8), 10);
  const uploaded = new Date(year, month, day);
  const now = new Date();
  return Math.floor((now.getTime() - uploaded.getTime()) / (1000 * 60 * 60 * 24));
}

@Injectable()
export class CreateJobUseCase {
  private readonly logger = new Logger(CreateJobUseCase.name);

  constructor(
    @Inject(JOB_REPOSITORY) private readonly jobRepository: JobRepository,
    @Inject(VIDEO_EXTRACTOR) private readonly videoExtractor: VideoExtractor
  ) {}

  async execute(url: string, userId: string): Promise<JobResponseDto> {
    this.logger.log(`Creating job for URL: ${url}`);

    const youtubeUrl = YoutubeUrl.create(url);

    const metadata = await this.videoExtractor.extractMetadata(
      youtubeUrl.toString()
    );

    // Validate video age — YouTube heatmaps take 3-7 days to generate
    const ageDays = daysSinceDate(metadata.uploadDate ?? "");
    if (ageDays < MIN_AGE_DAYS) {
      throw new BadRequestException(
        `This video was uploaded less than ${MIN_AGE_DAYS} days ago. YouTube heatmap data is not yet available. Please try again in ${MIN_AGE_DAYS}\u20135 days.`
      );
    }

    // Validate view count — heatmaps need sufficient viewer engagement
    if (metadata.viewCount !== undefined && metadata.viewCount < MIN_VIEWS) {
      throw new BadRequestException(
        `This video has fewer than ${MIN_VIEWS.toLocaleString()} views. Heatmap data requires more viewer engagement to generate. Try a more popular video.`
      );
    }

    // If heatmap is empty and video is still recent, reject early
    if ((!metadata.heatmap || metadata.heatmap.length === 0) && ageDays < HEATMAP_READY_DAYS) {
      throw new BadRequestException(
        `No heatmap data found. This video may be too recent \u2014 YouTube typically generates heatmap data ${MIN_AGE_DAYS}\u20137 days after upload. Please try again later.`
      );
    }

    const job = new Job(
      crypto.randomUUID(),
      userId,
      youtubeUrl.toString(),
      metadata.title,
      metadata.thumbnail,
      metadata.duration,
      metadata.viewCount,
      metadata.uploadDate,
      metadata.channelName,
      "pending",
      undefined,
      metadata.heatmap
    );

    const saved = await this.jobRepository.create(job);

    return JobResponseDto.fromEntity(saved);
  }
}
