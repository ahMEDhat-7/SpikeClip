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

export interface YoutubeChannelAnalytics {
  views: number;
  estimatedMinutesWatched: number;
  averageViewDuration: number;
  averageViewPercentage: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  subscribersLost: number;
}

export interface YoutubeVideoAnalytics {
  date: string;
  views: number;
  estimatedMinutesWatched: number;
  averageViewDuration: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
}

export interface ListVideosOptions {
  maxResults?: number;
  pageToken?: string;
}
