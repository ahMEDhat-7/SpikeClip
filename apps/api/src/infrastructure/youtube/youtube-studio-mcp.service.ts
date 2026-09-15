import { Injectable, Logger } from "@nestjs/common";
import { McpClient } from "./mcp-client";
import type {
  YoutubeChannel,
  YoutubeVideo,
  YoutubeChannelAnalytics,
  YoutubeVideoAnalytics,
  ListVideosOptions,
} from "./types";
import type { YoutubeStudioProvider } from "../../domain/ports/youtube-studio.provider";

interface McpChannelResponse {
  items?: Array<{
    id?: string;
    snippet?: { title?: string; description?: string; thumbnails?: { default?: { url?: string } } };
    statistics?: { viewCount?: string; subscriberCount?: string; videoCount?: string };
  }>;
}

interface McpVideoListResponse {
  items?: Array<{
    playlistItem?: {
      contentDetails?: { videoId?: string };
    };
    details?: {
      id?: string;
      snippet?: {
        title?: string;
        description?: string;
        thumbnails?: { medium?: { url?: string } };
        publishedAt?: string;
        tags?: string[];
        categoryId?: string;
        defaultLanguage?: string;
      };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
      status?: { privacyStatus?: string };
      contentDetails?: { duration?: string };
    };
  }>;
  nextPageToken?: string;
}

interface McpVideoResponse {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    thumbnails?: { medium?: { url?: string } };
    publishedAt?: string;
    tags?: string[];
    categoryId?: string;
    defaultLanguage?: string;
  };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  status?: { privacyStatus?: string };
  contentDetails?: { duration?: string };
}

interface McpAnalyticsRow {
  rows?: Array<{ dimensions?: string[]; values?: number[] }>;
}

@Injectable()
export class YoutubeStudioMcpService implements YoutubeStudioProvider {
  private readonly logger = new Logger(YoutubeStudioMcpService.name);

  constructor(private readonly mcpClient: McpClient) {}

  async getChannel(): Promise<YoutubeChannel> {
    try {
      const result = (await this.mcpClient.callTool("youtube_channel_overview")) as McpChannelResponse;
      const channel = result?.items?.[0];
      if (!channel) throw new Error("No channel found");

      return {
        id: channel.id ?? "",
        title: channel.snippet?.title ?? "",
        description: channel.snippet?.description ?? "",
        thumbnailUrl: channel.snippet?.thumbnails?.default?.url ?? "",
        viewCount: channel.statistics?.viewCount ?? "0",
        subscriberCount: channel.statistics?.subscriberCount ?? "0",
        videoCount: channel.statistics?.videoCount ?? "0",
      };
    } catch (error) {
      this.logger.error(`Failed to get channel: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async listVideos(options?: ListVideosOptions): Promise<{ items: YoutubeVideo[]; nextPageToken?: string }> {
    try {
      const result = (await this.mcpClient.callTool("youtube_list_videos", {
        max_results: options?.maxResults ?? 10,
        page_token: options?.pageToken,
      })) as McpVideoListResponse;

      const items: YoutubeVideo[] = (result?.items ?? [])
        .filter((item) => item.details)
        .map((item) => {
          const details = item.details!;
          return {
            id: details.id ?? item.playlistItem?.contentDetails?.videoId ?? "",
            title: details.snippet?.title ?? "",
            description: details.snippet?.description ?? "",
            thumbnailUrl: details.snippet?.thumbnails?.medium?.url ?? "",
            duration: details.contentDetails?.duration ?? "",
            publishedAt: details.snippet?.publishedAt ?? "",
            viewCount: details.statistics?.viewCount ?? "0",
            likeCount: details.statistics?.likeCount ?? "0",
            commentCount: details.statistics?.commentCount ?? "0",
            privacyStatus: details.status?.privacyStatus ?? "unknown",
            tags: details.snippet?.tags,
            categoryId: details.snippet?.categoryId,
            defaultLanguage: details.snippet?.defaultLanguage,
          };
        });

      return { items, nextPageToken: result?.nextPageToken };
    } catch (error) {
      this.logger.error(`Failed to list videos: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async getVideo(videoId: string): Promise<YoutubeVideo> {
    try {
      const result = (await this.mcpClient.callTool("youtube_get_video", { video_id: videoId })) as McpVideoResponse;
      if (!result?.id) throw new Error(`Video ${videoId} not found`);

      return {
        id: result.id,
        title: result.snippet?.title ?? "",
        description: result.snippet?.description ?? "",
        thumbnailUrl: result.snippet?.thumbnails?.medium?.url ?? "",
        duration: result.contentDetails?.duration ?? "",
        publishedAt: result.snippet?.publishedAt ?? "",
        viewCount: result.statistics?.viewCount ?? "0",
        likeCount: result.statistics?.likeCount ?? "0",
        commentCount: result.statistics?.commentCount ?? "0",
        privacyStatus: result.status?.privacyStatus ?? "unknown",
        tags: result.snippet?.tags,
        categoryId: result.snippet?.categoryId,
        defaultLanguage: result.snippet?.defaultLanguage,
      };
    } catch (error) {
      this.logger.error(`Failed to get video ${videoId}: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async getChannelAnalytics(startDate: string, endDate: string): Promise<YoutubeChannelAnalytics> {
    try {
      const result = (await this.mcpClient.callTool("youtube_channel_analytics", {
        start_date: startDate,
        end_date: endDate,
      })) as McpAnalyticsRow;

      const row = result?.rows?.[0];
      return {
        views: row?.values?.[0] ?? 0,
        estimatedMinutesWatched: row?.values?.[1] ?? 0,
        averageViewDuration: row?.values?.[2] ?? 0,
        averageViewPercentage: row?.values?.[3] ?? 0,
        likes: row?.values?.[4] ?? 0,
        comments: row?.values?.[5] ?? 0,
        shares: row?.values?.[6] ?? 0,
        subscribersGained: row?.values?.[7] ?? 0,
        subscribersLost: row?.values?.[8] ?? 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get channel analytics: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  async getVideoAnalytics(videoId: string, startDate: string, endDate: string): Promise<YoutubeVideoAnalytics[]> {
    try {
      const result = (await this.mcpClient.callTool("youtube_video_analytics", {
        video_id: videoId,
        start_date: startDate,
        end_date: endDate,
      })) as McpAnalyticsRow;

      return (result?.rows ?? []).map((row) => ({
        date: row.dimensions?.[0] ?? "",
        views: row.values?.[0] ?? 0,
        estimatedMinutesWatched: row.values?.[1] ?? 0,
        averageViewDuration: row.values?.[2] ?? 0,
        likes: row.values?.[3] ?? 0,
        comments: row.values?.[4] ?? 0,
        shares: row.values?.[5] ?? 0,
        subscribersGained: row.values?.[6] ?? 0,
      }));
    } catch (error) {
      this.logger.error(`Failed to get video analytics: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }
}
