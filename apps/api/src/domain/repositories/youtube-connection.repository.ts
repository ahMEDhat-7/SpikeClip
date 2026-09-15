import type { YoutubeConnection } from "../entities/youtube-connection.entity";

export const YOUTUBE_CONNECTION_REPOSITORY = "YOUTUBE_CONNECTION_REPOSITORY";

export interface YoutubeConnectionRepository {
  findById(id: string): Promise<YoutubeConnection | null>;
  findByUserIdAndChannelId(userId: string, channelId: string): Promise<YoutubeConnection | null>;
  findByUserId(userId: string): Promise<YoutubeConnection[]>;
  create(data: { userId: string; channelId: string; channelTitle?: string; channelThumbnail?: string }): Promise<YoutubeConnection>;
  update(id: string, data: Partial<{ channelTitle: string; channelThumbnail: string; status: string; lastSyncedAt: Date }>): Promise<YoutubeConnection>;
  delete(id: string): Promise<void>;
}
