import {
  JobStatus,
  ScoredBlock,
  HeatmapSpike,
} from "@spikeclips/shared";

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
    public status: JobStatus = "pending",
    public scenes?: ScoredBlock[],
    public heatmapData?: HeatmapSpike[],
    public errorMessage?: string,
    public readonly createdAt: Date = new Date(),
    public completedAt?: Date
  ) {}

  markProcessing(): void {
    this.status = "processing";
  }

  markCompleted(scenes: ScoredBlock[]): void {
    this.status = "completed";
    this.scenes = scenes;
    this.completedAt = new Date();
  }

  markFailed(error: string): void {
    this.status = "failed";
    this.errorMessage = error;
    this.completedAt = new Date();
  }
}
