import { ScoredBlock, HeatmapSpike, JobStatus, ClipStatus } from "../entities/job";
import { PlatformId } from "../entities/platform";
import { OutputFormat, OutputQuality } from "../entities/export";
import type { StudioAction } from "@spikeclips/shared";

export interface StudioExportConfig {
  platform?: PlatformId;
  format?: OutputFormat;
  quality?: OutputQuality;
  captions?: Array<{
    text: string;
    font: string;
    size: number;
    color: string;
    position: string;
    textAlign?: string;
    startFrame?: number;
    endFrame?: number;
    animation: string;
    textStyle?: string;
    opacity?: number;
    backgroundColor?: string;
    backgroundEnabled?: boolean;
    strokeWidth?: number;
    shadowRadius?: number;
    x?: number;
    y?: number;
  }>;
  music?: {
    fileKey: string;
    volume: number;
    originalVolume: number;
    fadeIn: number;
    fadeOut: number;
  };
  templateId?: string;
  templateConfig?: Record<string, unknown>;
  actions?: StudioAction[];
}

export interface MusicUploadResponse {
  id: string;
  name: string;
  url: string;
  size: number;
}

export interface TranslateContext {
  currentActions?: StudioAction[];
  captions?: Array<{ text: string; start?: number; end?: number }>;
  music?: { name: string; volume: number } | null;
  template?: { id: string; name: string } | null;
  availableTemplates?: Array<{ id: string; name: string }>;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface TranslateResponse {
  actions: StudioAction[];
  ffmpegCommand: string;
  summary?: string | null;
  clarification: {
    question: string;
    suggestions: string[];
  } | null;
}

export interface PreviewResponse {
  previewUrl: string;
  cached: boolean;
}

export interface JobApiPort {
  createJob(url: string): Promise<JobResponse>;
  getJob(id: string): Promise<JobResponse>;
  getJobs(): Promise<JobResponse[]>;
  processJob(id: string): Promise<JobResponse>;
  exportClips(
    id: string,
    scenes: Array<{ start_time: number; end_time: number; peak_intensity?: number }>,
    studioConfig?: StudioExportConfig
  ): Promise<{ jobId: string; clipJobIds: string[] }>;
  getClips(jobId: string): Promise<ClipResponse[]>;
  uploadMusic(file: File): Promise<MusicUploadResponse>;
  deleteMusic(key: string): Promise<void>;
  translatePrompt(
    prompt: string,
    sceneStart: number,
    sceneEnd: number,
    platform: string,
    context?: TranslateContext,
    history?: Array<{ role: "user" | "assistant"; content: string }>
  ): Promise<TranslateResponse>;
  generatePreview(sceneId: string, actions: StudioAction[], platform: string): Promise<PreviewResponse>;
  saveActions(jobId: string, studioEdits: Record<number, StudioAction[]>): Promise<void>;
  getProject(jobId: string): Promise<{ project: Record<string, unknown> | null }>;
  saveProject(jobId: string, project: Record<string, unknown> | null): Promise<void>;
  prepareSource(jobId: string, start: number, end: number, force?: boolean): Promise<{ url: string; key: string }>;
}

export interface JobResponse {
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
  studioEdits?: Record<number, StudioAction[]> | null;
  createdAt: string;
  completedAt?: string;
}

export interface ClipResponse {
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
  createdAt: string;
  completedAt?: string;
}
