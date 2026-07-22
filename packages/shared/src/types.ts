// Algorithm types (snake_case — matches Python source of truth)

export interface HeatmapSpike {
  start_time: number;
  end_time: number;
  value: number;
}

export interface MergedBlock {
  start_time: number;
  end_time: number;
  peak_intensity: number;
  last_value: number;
  weighted_sum: number;
  total_duration: number;
  used_floor_override: boolean;
  segments: HeatmapSpike[];
}

export interface ScoredBlock {
  start_time: number;
  end_time: number;
  duration: number;
  peak_intensity: number;
  avg_intensity: number;
  score: number;
  confidence: "high" | "floor_override";
  capped: boolean;
}

export interface AlgorithmConfig {
  gap_tolerance: number;
  intensity_tolerance: number;
  min_intensity_cutoff: number;
  min_clip_duration: number;
  max_clip_duration: number;
  target_duration_range: [number, number];
  top_n: number;
  min_spacing: number;
  weight_peak: number;
  weight_avg: number;
  weight_duration_fit: number;
}

export const DEFAULT_ALGORITHM_CONFIG: AlgorithmConfig = {
  gap_tolerance: 5.0,
  intensity_tolerance: 0.25,
  min_intensity_cutoff: 0.40,
  min_clip_duration: 3.0,
  max_clip_duration: 60.0,
  target_duration_range: [15.0, 60.0],
  top_n: 3,
  min_spacing: 5.0,
  weight_peak: 0.4,
  weight_avg: 0.4,
  weight_duration_fit: 0.2,
};

// Job types (camelCase — matches Prisma/database schema)

export type JobStatus = "pending" | "processing" | "completed" | "failed";

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
  status: JobStatus;
  scenes?: ScoredBlock[];
  heatmapData?: HeatmapSpike[];
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Clip types

export type ClipStatus = "pending" | "processing" | "completed" | "failed";

export interface Clip {
  id: string;
  jobId: string;
  sceneIndex: number;
  startTime: number;
  endTime: number;
  peakIntensity?: number;
  status: ClipStatus;
  fileUrl?: string;
  fileSize?: number;
  duration?: number;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

// User types

export type PlanTier = "free" | "pro" | "team";

export interface User {
  id: string;
  email: string;
  name?: string;
  plan: PlanTier;
  stripeCustomerId?: string;
  analysesUsed: number;
  analysesLimit: number;
  scenesLimit: number;
  clipsUsed: number;
  clipsLimit: number;
  createdAt: Date;
  updatedAt: Date;
}
