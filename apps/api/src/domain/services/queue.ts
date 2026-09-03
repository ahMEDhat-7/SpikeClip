import type { StudioAction } from "@spikeclip/shared";

export const QUEUE_SERVICE = "QUEUE_SERVICE";

export interface ExportJobConfig {
  clipId: string;
  sceneIndex: number;
  videoUrl: string;
  startTime: number;
  endTime: number;
  vertical?: boolean;
  platform?: string;
  format?: string;
  quality?: string;
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

export interface QueueService {
  addAnalysisJob(jobId: string, data: { url: string; userId: string }): Promise<void>;
  addExportJob(jobId: string, data: ExportJobConfig, dependsOn?: string): Promise<void>;
  addSourceJob(jobId: string, data: { userId: string; start: number; end: number }): Promise<string>;
  getJobCounts(): Promise<{
    analysis: { waiting: number; active: number; completed: number; failed: number };
    export: { waiting: number; active: number; completed: number; failed: number };
    source: { waiting: number; active: number; completed: number; failed: number };
  }>;
}
