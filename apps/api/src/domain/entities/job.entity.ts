import {
  JobStatus,
  type JobStatusValue,
  ScoredBlock,
  HeatmapSpike,
  StudioAction,
} from "@spikeclip/shared";

export class Job {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly url: string,
    public videoTitle?: string,
    public videoThumbnail?: string,
    public videoDuration?: number,
    public videoViewCount?: number,
    public videoUploadDate?: string,
    public videoChannelName?: string,
    public status: JobStatusValue = JobStatus.PENDING,
    public scenes?: ScoredBlock[],
    public heatmapData?: HeatmapSpike[],
    public errorMessage?: string,
    public readonly createdAt: Date = new Date(),
    public completedAt?: Date,
    public studioEdits?: Record<number, StudioAction[]> | null,
    public project?: Record<string, unknown> | null
  ) {}

  markProcessing(): void {
    this.status = JobStatus.PROCESSING;
  }

  markCompleted(scenes: ScoredBlock[]): void {
    this.status = JobStatus.COMPLETED;
    this.scenes = scenes;
    this.completedAt = new Date();
  }

  markFailed(error: string): void {
    this.status = JobStatus.FAILED;
    this.errorMessage = error;
    this.completedAt = new Date();
  }
}
