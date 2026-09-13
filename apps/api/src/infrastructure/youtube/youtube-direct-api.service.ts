import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { AuthTokenVaultService } from "./auth-token-vault.service";
import { YouTubeQuotaGuard } from "./youtube-quota-guard.service";
import type {
  YoutubeChannel,
  YoutubeVideo,
  YoutubeChannelAnalytics,
  YoutubeVideoAnalytics,
  ListVideosOptions,
} from "./types";
import type { YoutubeStudioProvider } from "../../domain/ports/youtube-studio.provider";

const YOUTUBE_DATA_API = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_ANALYTICS_API = "https://youtubeanalytics.googleapis.com/v2";
const MAX_RESULTS_PER_PAGE = 50;

interface TokenProvider {
  getAccessToken(): Promise<string | null>;
  refreshToken(): Promise<string>;
}

@Injectable()
export class YoutubeDirectApiService implements YoutubeStudioProvider {
  private readonly logger = new Logger(YoutubeDirectApiService.name);

  constructor(
    private readonly tokenVault: AuthTokenVaultService,
    private readonly quotaGuard: YouTubeQuotaGuard,
  ) {}

  private tokenProvider: TokenProvider | null = null;

  setTokenProvider(provider: TokenProvider): void {
    this.tokenProvider = provider;
  }

  private async getValidToken(): Promise<string> {
    if (!this.tokenProvider) {
      throw new UnauthorizedException("No token provider set. Connect a YouTube account first.");
    }

    let token = await this.tokenProvider.getAccessToken();
    if (token) return token;

    token = await this.tokenProvider.refreshToken();
    return token;
  }

  private async apiGet<T>(url: string, apiMethod: string): Promise<T> {
    this.quotaGuard.rejectIfExhausted(apiMethod);

    const token = await this.getValidToken();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      this.logger.warn("YouTube API returned 401, attempting token refresh");
      if (this.tokenProvider) {
        const newToken = await this.tokenProvider.refreshToken();
        const retryResponse = await fetch(url, {
          headers: { Authorization: `Bearer ${newToken}` },
        });
        if (!retryResponse.ok) {
          throw new Error(`YouTube API error after refresh: ${retryResponse.status}`);
        }
        this.quotaGuard.recordCall(apiMethod);
        return retryResponse.json() as Promise<T>;
      }
      throw new UnauthorizedException("YouTube access token expired. Reconnect your account.");
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`YouTube API error ${response.status}: ${body}`);
    }

    this.quotaGuard.recordCall(apiMethod);
    return response.json() as Promise<T>;
  }

  async getChannel(): Promise<YoutubeChannel> {
    const data = await this.apiGet<YouTubeDataResponse>(
      `${YOUTUBE_DATA_API}/channels?part=snippet,statistics&mine=true`,
      "youtube.channels.list",
    );

    const channel = data.items?.[0];
    if (!channel) throw new Error("No YouTube channel found for this account");

    const channelId = typeof channel.id === "string" ? channel.id : "";

    return {
      id: channelId,
      title: channel.snippet?.title ?? "",
      description: channel.snippet?.description ?? "",
      thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? "",
      viewCount: channel.statistics?.viewCount ?? "0",
      subscriberCount: channel.statistics?.subscriberCount ?? "0",
      videoCount: channel.statistics?.videoCount ?? "0",
    };
  }

  async listVideos(options?: ListVideosOptions): Promise<{ items: YoutubeVideo[]; nextPageToken?: string }> {
    const maxResults = Math.min(options?.maxResults ?? 10, MAX_RESULTS_PER_PAGE);
    const pageToken = options?.pageToken ? `&pageToken=${options.pageToken}` : "";

    const data = await this.apiGet<YouTubeDataResponse>(
      `${YOUTUBE_DATA_API}/search?part=snippet&type=video&order=date&maxResults=${maxResults}${pageToken}`,
      "youtube.search.list",
    );

    if (!data.items?.length) return { items: [], nextPageToken: data.nextPageToken };

    const videoIds = data.items
      .map((item) => {
        const id = item.id;
        if (typeof id === "string") return id;
        return id?.videoId;
      })
      .filter(Boolean)
      .join(",");

    if (!videoIds) return { items: [], nextPageToken: data.nextPageToken };

    const detailsData = await this.apiGet<YouTubeDataResponse>(
      `${YOUTUBE_DATA_API}/videos?part=snippet,statistics,contentDetails,status&id=${videoIds}`,
      "youtube.videos.list",
    );

    const items: YoutubeVideo[] = (detailsData.items ?? []).map((video) => ({
      id: typeof video.id === "string" ? video.id : video.id?.videoId ?? "",
      title: video.snippet?.title ?? "",
      description: video.snippet?.description ?? "",
      thumbnailUrl: video.snippet?.thumbnails?.medium?.url ?? video.snippet?.thumbnails?.default?.url ?? "",
      duration: video.contentDetails?.duration ?? "",
      publishedAt: video.snippet?.publishedAt ?? "",
      viewCount: video.statistics?.viewCount ?? "0",
      likeCount: video.statistics?.likeCount ?? "0",
      commentCount: video.statistics?.commentCount ?? "0",
      privacyStatus: video.status?.privacyStatus ?? "unknown",
      tags: video.snippet?.tags,
      categoryId: video.snippet?.categoryId,
      defaultLanguage: video.snippet?.defaultLanguage,
    }));

    return { items, nextPageToken: data.nextPageToken };
  }

  async getVideo(videoId: string): Promise<YoutubeVideo> {
    const data = await this.apiGet<YouTubeDataResponse>(
      `${YOUTUBE_DATA_API}/videos?part=snippet,statistics,contentDetails,status&id=${videoId}`,
      "youtube.videos.list",
    );

    const video = data.items?.[0];
    if (!video) throw new Error(`Video ${videoId} not found`);

    const videoIdStr = typeof video.id === "string" ? video.id : video.id?.videoId ?? videoId;

    return {
      id: videoIdStr,
      title: video.snippet?.title ?? "",
      description: video.snippet?.description ?? "",
      thumbnailUrl: video.snippet?.thumbnails?.medium?.url ?? video.snippet?.thumbnails?.default?.url ?? "",
      duration: video.contentDetails?.duration ?? "",
      publishedAt: video.snippet?.publishedAt ?? "",
      viewCount: video.statistics?.viewCount ?? "0",
      likeCount: video.statistics?.likeCount ?? "0",
      commentCount: video.statistics?.commentCount ?? "0",
      privacyStatus: video.status?.privacyStatus ?? "unknown",
      tags: video.snippet?.tags,
      categoryId: video.snippet?.categoryId,
      defaultLanguage: video.snippet?.defaultLanguage,
    };
  }

  async getChannelAnalytics(startDate: string, endDate: string): Promise<YoutubeChannelAnalytics> {
    const data = await this.apiGet<YouTubeAnalyticsResponse>(
      `${YOUTUBE_ANALYTICS_API}/reports?dimensions=channel&metrics=views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,likes,comments,shares,subscribersGained,subscribersLost&startDate=${startDate}&endDate=${endDate}`,
      "youtubeAnalytics.reports.query",
    );

    const row = data.rows?.[0];
    return {
      views: Number(row?.[0] ?? 0),
      estimatedMinutesWatched: Number(row?.[1] ?? 0),
      averageViewDuration: Number(row?.[2] ?? 0),
      averageViewPercentage: Number(row?.[3] ?? 0),
      likes: Number(row?.[4] ?? 0),
      comments: Number(row?.[5] ?? 0),
      shares: Number(row?.[6] ?? 0),
      subscribersGained: Number(row?.[7] ?? 0),
      subscribersLost: Number(row?.[8] ?? 0),
    };
  }

  async getVideoAnalytics(videoId: string, startDate: string, endDate: string): Promise<YoutubeVideoAnalytics[]> {
    const data = await this.apiGet<YouTubeAnalyticsResponse>(
      `${YOUTUBE_ANALYTICS_API}/reports?dimensions=day&metrics=views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained&filters=video==${videoId}&startDate=${startDate}&endDate=${endDate}`,
      "youtubeAnalytics.reports.query",
    );

    return (data.rows ?? []).map((row) => ({
      date: String(row[0] ?? ""),
      views: Number(row[1] ?? 0),
      estimatedMinutesWatched: Number(row[2] ?? 0),
      averageViewDuration: Number(row[3] ?? 0),
      likes: Number(row[4] ?? 0),
      comments: Number(row[5] ?? 0),
      shares: Number(row[6] ?? 0),
      subscribersGained: Number(row[7] ?? 0),
    }));
  }
}

interface YouTubeDataResponse {
  items?: Array<{
    id?: { videoId?: string } | string;
    snippet?: {
      title?: string;
      description?: string;
      thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
      publishedAt?: string;
      tags?: string[];
      categoryId?: string;
      defaultLanguage?: string;
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
      subscriberCount?: string;
      videoCount?: string;
    };
    status?: { privacyStatus?: string };
    contentDetails?: { duration?: string };
  }>;
  nextPageToken?: string;
}

interface YouTubeAnalyticsResponse {
  rows?: Array<(string | number)[]>;
}
