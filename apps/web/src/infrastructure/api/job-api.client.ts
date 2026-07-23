import { JobApiPort, JobResponse, ClipResponse, StudioExportConfig, MusicUploadResponse } from "../../domain/ports/job-api.port";
import type { StudioAction } from "@spikeclips/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

interface ApiResponseError {
  message: string;
  statusCode?: number;
  timestamp?: string;
  path?: string;
}

interface TranslateResponse {
  actions: StudioAction[];
  ffmpegCommand: string;
  clarification: {
    question: string;
    suggestions: string[];
  } | null;
}

interface PreviewResponse {
  previewUrl: string;
  cached: boolean;
}

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

export class JobApiClient implements JobApiPort {
  async createJob(url: string): Promise<JobResponse> {
    const res = await fetch(`${API_BASE}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      const error = await parseJson<ApiResponseError>(res).catch(() => ({ message: "Failed to create job" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return parseJson<JobResponse>(res);
  }

  async getJob(id: string): Promise<JobResponse> {
    const res = await fetch(`${API_BASE}/jobs/${id}`, {
      credentials: "include",
    });

    if (!res.ok) {
      const error = await parseJson<ApiResponseError>(res).catch(() => ({ message: "Failed to get job" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return parseJson<JobResponse>(res);
  }

  async getJobs(): Promise<JobResponse[]> {
    const res = await fetch(`${API_BASE}/jobs`, {
      credentials: "include",
    });

    if (!res.ok) {
      const error = await parseJson<ApiResponseError>(res).catch(() => ({ message: "Failed to get jobs" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return parseJson<JobResponse[]>(res);
  }

  async processJob(id: string): Promise<JobResponse> {
    const res = await fetch(`${API_BASE}/jobs/${id}/process`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      const error = await parseJson<ApiResponseError>(res).catch(() => ({ message: "Failed to process job" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return parseJson<JobResponse>(res);
  }

  async exportClips(
    id: string,
    scenes: Array<{ start_time: number; end_time: number; peak_intensity?: number }>,
    studioConfig?: StudioExportConfig
  ): Promise<{ jobId: string; clipJobIds: string[] }> {
    const res = await fetch(`${API_BASE}/jobs/${id}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ scenes, ...studioConfig }),
    });

    if (!res.ok) {
      const error = await parseJson<ApiResponseError>(res).catch(() => ({ message: "Failed to export clips" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return parseJson<{ jobId: string; clipJobIds: string[] }>(res);
  }

  async getClips(jobId: string): Promise<ClipResponse[]> {
    const res = await fetch(`${API_BASE}/clips/job/${jobId}`, {
      credentials: "include",
    });

    if (!res.ok) {
      const error = await parseJson<ApiResponseError>(res).catch(() => ({ message: "Failed to get clips" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return parseJson<ClipResponse[]>(res);
  }

  async uploadMusic(file: File): Promise<MusicUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}/music/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!res.ok) {
      const error = await parseJson<ApiResponseError>(res).catch(() => ({ message: "Failed to upload music" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return parseJson<MusicUploadResponse>(res);
  }

  async deleteMusic(key: string): Promise<void> {
    const res = await fetch(`${API_BASE}/music/${encodeURIComponent(key)}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const error = await parseJson<ApiResponseError>(res).catch(() => ({ message: "Failed to delete music" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }
  }

  async translatePrompt(prompt: string, sceneStart: number, sceneEnd: number, platform: string): Promise<TranslateResponse> {
    const res = await fetch(`${API_BASE}/studio/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ prompt, sceneStart, sceneEnd, platform }),
    });

    if (!res.ok) {
      const error = await parseJson<ApiResponseError>(res).catch(() => ({ message: "Failed to translate prompt" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return parseJson<TranslateResponse>(res);
  }

  async generatePreview(sceneId: string, actions: StudioAction[], platform: string): Promise<PreviewResponse> {
    const res = await fetch(`${API_BASE}/studio/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sceneId, actions, platform }),
    });

    if (!res.ok) {
      const error = await parseJson<ApiResponseError>(res).catch(() => ({ message: "Failed to generate preview" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return parseJson<PreviewResponse>(res);
  }

  async generatePreviewForScene(jobId: string, sceneIndex: number, actions: StudioAction[], platform: string): Promise<PreviewResponse> {
    const res = await fetch(`${API_BASE}/studio/preview/${jobId}/${sceneIndex}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ actions, platform }),
    });

    if (!res.ok) {
      const error = await parseJson<ApiResponseError>(res).catch(() => ({ message: "Failed to generate preview" }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return parseJson<PreviewResponse>(res);
  }
}

export const jobApi = new JobApiClient();
