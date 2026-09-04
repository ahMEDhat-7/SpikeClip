import type { YoutubeApiPort, YoutubeChannel, YoutubeVideo, YoutubeConnection } from "../../domain/ports/youtube-api.port";

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

export class YoutubeApiClient implements YoutubeApiPort {
  async getStatus(): Promise<{ connected: boolean; connections: YoutubeConnection[] }> {
    return fetchJson("/api/youtube/status");
  }

  async connect(): Promise<{ connectionId: string; channel: YoutubeChannel }> {
    return fetchJson("/api/youtube/connect", { method: "POST" });
  }

  async getChannel(): Promise<YoutubeChannel> {
    return fetchJson("/api/youtube/channel");
  }

  async listVideos(options?: { maxResults?: number; pageToken?: string }): Promise<{ items: YoutubeVideo[]; nextPageToken?: string }> {
    const params = new URLSearchParams();
    if (options?.maxResults) params.set("max_results", options.maxResults.toString());
    if (options?.pageToken) params.set("page_token", options.pageToken);
    const qs = params.toString();
    return fetchJson(`/api/youtube/videos${qs ? `?${qs}` : ""}`);
  }

  async getVideo(videoId: string): Promise<YoutubeVideo> {
    return fetchJson(`/api/youtube/videos/${videoId}`);
  }

  async sync(connectionId: string): Promise<{ synced: boolean }> {
    return fetchJson(`/api/youtube/sync/${connectionId}`, { method: "POST" });
  }

  async disconnect(connectionId: string): Promise<void> {
    await fetchJson(`/api/youtube/disconnect/${connectionId}`, { method: "DELETE" });
  }
}
