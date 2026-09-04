import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { YoutubeConnection, createYoutubeConnection } from "../../../domain/entities/youtube-connection.entity";
import type { YoutubeConnectionRepository } from "../../../domain/repositories/youtube-connection.repository";

@Injectable()
export class PrismaYoutubeConnectionRepository implements YoutubeConnectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<YoutubeConnection | null> {
    const record = await this.prisma.youtubeConnection.findUnique({ where: { id } });
    return record ? createYoutubeConnection(record) : null;
  }

  async findByUserIdAndChannelId(userId: string, channelId: string): Promise<YoutubeConnection | null> {
    const record = await this.prisma.youtubeConnection.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });
    return record ? createYoutubeConnection(record) : null;
  }

  async findByUserId(userId: string): Promise<YoutubeConnection[]> {
    const records = await this.prisma.youtubeConnection.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(createYoutubeConnection);
  }

  async create(data: { userId: string; channelId: string; channelTitle?: string; channelThumbnail?: string }): Promise<YoutubeConnection> {
    const record = await this.prisma.youtubeConnection.create({
      data: {
        userId: data.userId,
        channelId: data.channelId,
        channelTitle: data.channelTitle,
        channelThumbnail: data.channelThumbnail,
      },
    });
    return createYoutubeConnection(record);
  }

  async update(id: string, data: Partial<{ channelTitle: string; channelThumbnail: string; status: string; lastSyncedAt: Date }>): Promise<YoutubeConnection> {
    const record = await this.prisma.youtubeConnection.update({
      where: { id },
      data,
    });
    return createYoutubeConnection(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.youtubeConnection.delete({ where: { id } });
  }
}
