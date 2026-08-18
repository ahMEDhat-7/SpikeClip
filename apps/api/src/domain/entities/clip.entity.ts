import { ClipStatus } from "@spikeclip/shared";

export class Clip {
  constructor(
    public readonly id: string,
    public readonly jobId: string,
    public readonly sceneIndex: number,
    public readonly startTime: number,
    public readonly endTime: number,
    public peakIntensity?: number,
    public status: ClipStatus = "pending",
    public fileUrl?: string,
    public fileSize?: number,
    public duration?: number,
    public errorMessage?: string,
    public readonly createdAt: Date = new Date(),
    public completedAt?: Date
  ) {}

  getDuration(): number {
    return this.endTime - this.startTime;
  }

  markCompleted(fileUrl: string, fileSize: number): void {
    this.status = "completed";
    this.fileUrl = fileUrl;
    this.fileSize = fileSize;
    this.duration = this.getDuration();
    this.completedAt = new Date();
  }

  markFailed(error: string): void {
    this.status = "failed";
    this.errorMessage = error;
  }
}
