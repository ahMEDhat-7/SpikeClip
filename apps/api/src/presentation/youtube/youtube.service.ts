import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { YOUTUBE_STUDIO_PROVIDER, type YoutubeStudioProvider } from "../../domain/ports/youtube-studio.provider";
import { YOUTUBE_CONNECTION_REPOSITORY, type YoutubeConnectionRepository } from "../../domain/repositories/youtube-connection.repository";
import type { YoutubeChannel, YoutubeVideo, ListVideosOptions } from "../../infrastructure/youtube/types";

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);

  constructor(
    @Inject(YOUTUBE_STUDIO_PROVIDER) private readonly youtubeProvider: YoutubeStudioProvider,
    @Inject(YOUTUBE_CONNECTION_REPOSITORY) private readonly connectionRepo: YoutubeConnectionRepository,
  ) {}

  async getStatus(userId: string): Promise<{ connected: boolean; connections: Array<{ id: string; channelId: string; channelTitle: string | null; status: string; lastSyncedAt: Date | null }> }> {
    const connections = await this.connectionRepo.findByUserId(userId);
    return {
      connected: connections.some((c) => c.isActive()),
      connections: connections.map((c) => ({
        id: c.id,
        channelId: c.channelId,
        channelTitle: c.channelTitle,
        status: c.status,
        lastSyncedAt: c.lastSyncedAt,
      })),
    };
  }

  async connect(userId: string): Promise<{ connectionId: string; channel: YoutubeChannel }> {
    try {
      const channel = await this.youtubeProvider.getChannel();

      const existing = await this.connectionRepo.findByUserIdAndChannelId(userId, channel.id);
      if (existing) {
        if (existing.isActive()) {
          return { connectionId: existing.id, channel };
        }
        const updated = await this.connectionRepo.update(existing.id, {
          status: "active",
          channelTitle: channel.title,
          channelThumbnail: channel.thumbnailUrl,
        });
        return { connectionId: updated.id, channel };
      }

      const connection = await this.connectionRepo.create({
        userId,
        channelId: channel.id,
        channelTitle: channel.title,
        channelThumbnail: channel.thumbnailUrl,
      });

      return { connectionId: connection.id, channel };
    } catch (error) {
      this.logger.error(`YouTube connection failed: ${error instanceof Error ? error.message : error}`);
      throw new BadRequestException("Failed to connect YouTube account. Ensure MCP server is configured.");
    }
  }

  async getChannel(userId: string, connectionId?: string): Promise<YoutubeChannel> {
    const connection = await this.resolveConnection(userId, connectionId);
    return this.youtubeProvider.getChannel();
  }

  async listVideos(userId: string, options?: ListVideosOptions, connectionId?: string): Promise<{ items: YoutubeVideo[]; nextPageToken?: string }> {
    await this.resolveConnection(userId, connectionId);
    return this.youtubeProvider.listVideos(options);
  }

  async getVideo(userId: string, videoId: string, connectionId?: string): Promise<YoutubeVideo> {
    await this.resolveConnection(userId, connectionId);
    return this.youtubeProvider.getVideo(videoId);
  }

  async sync(userId: string, connectionId: string): Promise<{ synced: boolean }> {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection || connection.userId !== userId) {
      throw new NotFoundException("Connection not found");
    }

    try {
      const channel = await this.youtubeProvider.getChannel();
      await this.connectionRepo.update(connectionId, {
        channelTitle: channel.title,
        channelThumbnail: channel.thumbnailUrl,
        lastSyncedAt: new Date(),
      });
      return { synced: true };
    } catch (error) {
      this.logger.error(`YouTube sync failed: ${error instanceof Error ? error.message : error}`);
      throw new BadRequestException("Failed to sync YouTube data");
    }
  }

  async disconnect(userId: string, connectionId: string): Promise<void> {
    const connection = await this.connectionRepo.findById(connectionId);
    if (!connection || connection.userId !== userId) {
      throw new NotFoundException("Connection not found");
    }
    await this.connectionRepo.update(connectionId, { status: "revoked" });
  }

  private async resolveConnection(userId: string, connectionId?: string) {
    if (connectionId) {
      const connection = await this.connectionRepo.findById(connectionId);
      if (!connection || connection.userId !== userId) {
        throw new NotFoundException("Connection not found");
      }
      return connection;
    }
    const connections = await this.connectionRepo.findByUserId(userId);
    const active = connections.find((c) => c.isActive());
    if (!active) {
      throw new NotFoundException("No active YouTube connection. Please connect your YouTube account first.");
    }
    return active;
  }
}
