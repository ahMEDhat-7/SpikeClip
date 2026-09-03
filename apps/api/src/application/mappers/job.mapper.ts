import { Job } from "../../domain/entities/job.entity";
import { type JobStatusValue, ScoredBlock, HeatmapSpike } from "@spikeclip/shared";

interface PrismaJob {
  id: string;
  userId: string;
  url: string;
  videoTitle?: string | null;
  videoThumbnail?: string | null;
  videoDuration?: number | null;
  videoViewCount?: number | null;
  videoUploadDate?: string | null;
  videoChannelName?: string | null;
  status: string;
  scenes?: unknown;
  heatmapData?: unknown;
  studioEdits?: unknown;
  project?: unknown;
  errorMessage?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
}

export class JobMapper {
  static toEntity(prismaJob: PrismaJob): Job {
    return new Job(
      prismaJob.id,
      prismaJob.userId,
      prismaJob.url,
      prismaJob.videoTitle ?? undefined,
      prismaJob.videoThumbnail ?? undefined,
      prismaJob.videoDuration ?? undefined,
      prismaJob.videoViewCount ?? undefined,
      prismaJob.videoUploadDate ?? undefined,
      prismaJob.videoChannelName ?? undefined,
      prismaJob.status as JobStatusValue,
      (prismaJob.scenes as ScoredBlock[]) ?? undefined,
      (prismaJob.heatmapData as HeatmapSpike[]) ?? undefined,
      prismaJob.errorMessage ?? undefined,
      prismaJob.createdAt,
      prismaJob.completedAt ?? undefined,
      (prismaJob.studioEdits as Record<number, import("@spikeclip/shared").StudioAction[]> | null) ?? undefined,
      (prismaJob.project as Record<string, unknown> | null) ?? undefined
    );
  }

  static toPersistence(job: Job): Record<string, unknown> {
    return {
      id: job.id,
      userId: job.userId,
      url: job.url,
      videoTitle: job.videoTitle,
      videoThumbnail: job.videoThumbnail,
      videoDuration: job.videoDuration,
      videoViewCount: job.videoViewCount,
      videoUploadDate: job.videoUploadDate,
      videoChannelName: job.videoChannelName,
      status: job.status,
      scenes: job.scenes,
      heatmapData: job.heatmapData,
      studioEdits: job.studioEdits,
      project: job.project,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }
}
