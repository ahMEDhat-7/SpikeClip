export interface YoutubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  viewCount: string;
  subscriberCount: string;
  videoCount: string;
}

export interface YoutubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
  privacyStatus: string;
  tags?: string[];
  categoryId?: string;
  defaultLanguage?: string;
}

export interface YoutubeConnection {
  id: string;
  channelId: string;
  channelTitle: string | null;
  status: string;
  lastSyncedAt: string | null;
}

export interface YoutubeApiPort {
  getStatus(): Promise<{ connected: boolean; connections: YoutubeConnection[] }>;
  connect(): Promise<{ connectionId: string; channel: YoutubeChannel }>;
  getChannel(): Promise<YoutubeChannel>;
  listVideos(options?: { maxResults?: number; pageToken?: string }): Promise<{ items: YoutubeVideo[]; nextPageToken?: string }>;
  getVideo(videoId: string): Promise<YoutubeVideo>;
  sync(connectionId: string): Promise<{ synced: boolean }>;
  disconnect(connectionId: string): Promise<void>;
}
