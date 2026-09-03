export type { ScoredBlock, HeatmapSpike, JobStatusValue, ClipStatusValue } from "@spikeclip/shared";

import type { JobStatusValue, ScoredBlock, HeatmapSpike } from "@spikeclip/shared";

export const JOB_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const CLIP_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export interface Job {
  id: string;
  userId: string;
  url: string;
  videoTitle?: string;
  videoThumbnail?: string;
  videoDuration?: number;
  videoViewCount?: number;
  videoUploadDate?: string;
  videoChannelName?: string;
  status: JobStatusValue;
  scenes?: ScoredBlock[];
  heatmapData?: HeatmapSpike[];
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}
