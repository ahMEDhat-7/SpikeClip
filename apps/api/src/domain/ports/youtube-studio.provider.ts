import type {
  YoutubeChannel,
  YoutubeVideo,
  YoutubeChannelAnalytics,
  YoutubeVideoAnalytics,
  ListVideosOptions,
} from "../../infrastructure/youtube/types";

export const YOUTUBE_STUDIO_PROVIDER = "YOUTUBE_STUDIO_PROVIDER";

export interface YoutubeStudioProvider {
  getChannel(): Promise<YoutubeChannel>;
  listVideos(options?: ListVideosOptions): Promise<{ items: YoutubeVideo[]; nextPageToken?: string }>;
  getVideo(videoId: string): Promise<YoutubeVideo>;
  getChannelAnalytics(startDate: string, endDate: string): Promise<YoutubeChannelAnalytics>;
  getVideoAnalytics(videoId: string, startDate: string, endDate: string): Promise<YoutubeVideoAnalytics[]>;
}
