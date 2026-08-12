import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Job } from "../../domain/entities/job.entity";
import { ScoredBlock, HeatmapSpike } from "@spikeclips/shared";

export class JobResponseDto {
  @ApiProperty({ description: "Job ID", example: "550e8400-e29b-41d4-a716-446655440000" })
  id!: string;

  @ApiProperty({ description: "User ID who created the job", example: "user-123" })
  userId!: string;

  @ApiProperty({ description: "YouTube video URL", example: "https://youtube.com/watch?v=dQw4w9WgXcQ" })
  url!: string;

  @ApiPropertyOptional({ description: "Video title", example: "Rick Astley - Never Gonna Give You Up" })
  videoTitle?: string;

  @ApiPropertyOptional({ description: "Video thumbnail URL" })
  videoThumbnail?: string;

  @ApiPropertyOptional({ description: "Video duration in seconds", example: 212 })
  videoDuration?: number;

  @ApiPropertyOptional({ description: "Video view count", example: 1500000 })
  videoViewCount?: number;

  @ApiPropertyOptional({ description: "Video upload date (YYYYMMDD)", example: "20091025" })
  videoUploadDate?: string;

  @ApiPropertyOptional({ description: "Channel name", example: "Rick Astley" })
  videoChannelName?: string;

  @ApiProperty({ description: "Job status", example: "completed", enum: ["pending", "processing", "completed", "failed"] })
  status!: string;

  @ApiPropertyOptional({ description: "Detected scenes with scores" })
  scenes?: ScoredBlock[];

  @ApiPropertyOptional({ description: "Raw heatmap engagement data" })
  heatmapData?: HeatmapSpike[];

  @ApiPropertyOptional({ description: "Error message if job failed" })
  errorMessage?: string;

  @ApiPropertyOptional({ description: "Persisted Studio action revisions keyed by scene index" })
  studioEdits?: Record<number, import("@spikeclips/shared").StudioAction[]> | null;

  @ApiProperty({ description: "Job creation timestamp" })
  createdAt!: Date;

  @ApiPropertyOptional({ description: "Job completion timestamp" })
  completedAt?: Date;

  static fromEntity(job: Job): JobResponseDto {
    const dto = new JobResponseDto();
    dto.id = job.id;
    dto.userId = job.userId;
    dto.url = job.url;
    dto.videoTitle = job.videoTitle;
    dto.videoThumbnail = job.videoThumbnail;
    dto.videoDuration = job.videoDuration;
    dto.videoViewCount = job.videoViewCount;
    dto.videoUploadDate = job.videoUploadDate;
    dto.videoChannelName = job.videoChannelName;
    dto.status = job.status;
    dto.scenes = job.scenes;
    dto.heatmapData = job.heatmapData;
    dto.errorMessage = job.errorMessage;
    dto.studioEdits = job.studioEdits ?? null;
    dto.createdAt = job.createdAt;
    dto.completedAt = job.completedAt;
    return dto;
  }
}
