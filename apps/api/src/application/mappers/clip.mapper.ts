export interface ClipResponse {
  id: string;
  jobId: string;
  sceneIndex: number;
  startTime: number;
  endTime: number;
  peakIntensity?: number;
  status: string;
  fileUrl?: string;
  fileSize?: number;
  duration?: number;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export function toClipResponse(clip: {
  id: string;
  jobId: string;
  sceneIndex: number;
  startTime: number;
  endTime: number;
  peakIntensity: number | null;
  status: string;
  fileUrl: string | null;
  fileSize: number | null;
  duration: number | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
}): ClipResponse {
  return {
    id: clip.id,
    jobId: clip.jobId,
    sceneIndex: clip.sceneIndex,
    startTime: clip.startTime,
    endTime: clip.endTime,
    peakIntensity: clip.peakIntensity ?? undefined,
    status: clip.status,
    fileUrl: clip.fileUrl ?? undefined,
    fileSize: clip.fileSize ?? undefined,
    duration: clip.duration ?? undefined,
    errorMessage: clip.errorMessage ?? undefined,
    createdAt: clip.createdAt,
    completedAt: clip.completedAt ?? undefined,
  };
}
