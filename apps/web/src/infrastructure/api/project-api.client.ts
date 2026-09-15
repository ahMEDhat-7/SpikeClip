import type {
  ProjectApiPort,
  Project,
  ProjectSource,
  ProjectScene,
  GeneratedClip,
  ProjectWithDetails,
} from "../../domain/ports/project-api.port";

const RATE_LIMIT_MESSAGE = "Too many requests. Please wait a moment and try again.";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export class ProjectApiClient implements ProjectApiPort {
  async list(): Promise<Project[]> {
    return fetchJson("/api/projects");
  }

  async get(projectId: string): Promise<Project> {
    return fetchJson(`/api/projects/${projectId}`);
  }

  async create(data: { name: string; description?: string; youtubeConnectionId?: string }): Promise<Project> {
    return fetchJson("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async update(projectId: string, data: { name?: string; description?: string }): Promise<Project> {
    return fetchJson(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async remove(projectId: string): Promise<void> {
    await fetchJson(`/api/projects/${projectId}`, { method: "DELETE" });
  }

  async getDetails(projectId: string): Promise<ProjectWithDetails> {
    return fetchJson(`/api/projects/${projectId}/details`);
  }

  async listSources(projectId: string): Promise<ProjectSource[]> {
    return fetchJson(`/api/projects/${projectId}/sources`);
  }

  async addSource(projectId: string, videoId: string): Promise<ProjectSource> {
    return fetchJson(`/api/projects/${projectId}/sources/${videoId}`, { method: "POST" });
  }

  async addSourceByUrl(projectId: string, url: string): Promise<ProjectSource> {
    return fetchJson(`/api/projects/${projectId}/sources/by-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  }

  async removeSource(projectId: string, sourceId: string): Promise<void> {
    await fetchJson(`/api/projects/${projectId}/sources/${sourceId}`, { method: "DELETE" });
  }

  async listScenes(projectId: string): Promise<ProjectScene[]> {
    return fetchJson(`/api/projects/${projectId}/scenes`);
  }

  async generateScenes(projectId: string, sourceId: string): Promise<{ status: string; bullJobId?: string; sourceId?: string; message?: string }> {
    return fetchJson(`/api/projects/${projectId}/scenes/generate/${sourceId}`, { method: "POST" });
  }

  async updateScene(projectId: string, sceneId: string, data: { startTime?: number; endTime?: number; status?: string }): Promise<ProjectScene> {
    return fetchJson(`/api/projects/${projectId}/scenes/${sceneId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async removeScene(projectId: string, sceneId: string): Promise<void> {
    await fetchJson(`/api/projects/${projectId}/scenes/${sceneId}`, { method: "DELETE" });
  }

  async listClips(projectId: string): Promise<GeneratedClip[]> {
    return fetchJson(`/api/projects/${projectId}/clips`);
  }

  async getClip(projectId: string, clipId: string): Promise<GeneratedClip> {
    return fetchJson(`/api/projects/${projectId}/clips/${clipId}`);
  }

  async removeClip(projectId: string, clipId: string): Promise<void> {
    await fetchJson(`/api/projects/${projectId}/clips/${clipId}`, { method: "DELETE" });
  }

  async exportClips(projectId: string, sceneIds: string[], config?: { platform?: string; quality?: string; format?: string }): Promise<{ clipIds: string[]; count: number }> {
    return fetchJson(`/api/projects/${projectId}/clips/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sceneIds, ...config }),
    });
  }
}
