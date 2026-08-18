import { Injectable, Logger, Inject } from "@nestjs/common";
import {
  mergeHeatmapSpikes,
  capAndScoreBlocks,
  selectTopScenes,
  padScenes,
  DEFAULT_ALGORITHM_CONFIG,
} from "@spikeclip/shared";
import { JobRepository, JOB_REPOSITORY } from "../../domain/repositories/job.repository";
import { JobNotFoundException } from "../../domain/exceptions/job-not-found.exception";
import { JobResponseDto } from "../dto/job-response.dto";

@Injectable()
export class ProcessHeatmapUseCase {
  private readonly logger = new Logger(ProcessHeatmapUseCase.name);

  constructor(@Inject(JOB_REPOSITORY) private readonly jobRepository: JobRepository) {}

  async execute(jobId: string): Promise<JobResponseDto> {
    this.logger.log(`Processing heatmap for job ${jobId}`);

    const job = await this.jobRepository.findById(jobId);
    if (!job) throw new JobNotFoundException(jobId);

    job.markProcessing();
    await this.jobRepository.update(jobId, { status: "processing" });

    try {
      const config = DEFAULT_ALGORITHM_CONFIG;

      const merged = mergeHeatmapSpikes(
        job.heatmapData ?? [],
        config.gap_tolerance,
        config.intensity_tolerance
      );

      const scored = capAndScoreBlocks(
        merged,
        config.min_clip_duration,
        config.max_clip_duration,
        config.target_duration_range,
        config.weight_peak,
        config.weight_avg,
        config.weight_duration_fit
      );

      const selected = selectTopScenes(
        scored,
        config.top_n,
        config.min_spacing
      );

      const padded = padScenes(selected, 5, job.videoDuration);

      job.markCompleted(padded);
      await this.jobRepository.update(jobId, {
        status: "completed",
        scenes: padded,
        completedAt: job.completedAt,
      });

      return JobResponseDto.fromEntity(job);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      job.markFailed(message);
      await this.jobRepository.update(jobId, {
        status: "failed",
        errorMessage: message,
      });
      throw error;
    }
  }
}
