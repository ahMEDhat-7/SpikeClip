import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ProjectSource, createProjectSource } from "../../../domain/entities/project-source.entity";
import type { ProjectSourceRepository } from "../../../domain/repositories/project-source.repository";

@Injectable()
export class PrismaProjectSourceRepository implements ProjectSourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ProjectSource | null> {
    const record = await this.prisma.projectSource.findUnique({ where: { id } });
    return record ? createProjectSource(record) : null;
  }

  async findByProjectId(projectId: string): Promise<ProjectSource[]> {
    const records = await this.prisma.projectSource.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(createProjectSource);
  }

  async findByProjectIdAndVideoId(projectId: string, youtubeVideoId: string): Promise<ProjectSource | null> {
    const record = await this.prisma.projectSource.findUnique({
      where: { projectId_youtubeVideoId: { projectId, youtubeVideoId } },
    });
    return record ? createProjectSource(record) : null;
  }

  async create(data: { projectId: string; youtubeVideoId: string; youtubeUrl: string; title?: string; description?: string; thumbnailUrl?: string; duration?: number; publishedAt?: string; viewCount?: number; likeCount?: number; commentCount?: number; privacyStatus?: string; metadataJson?: unknown }): Promise<ProjectSource> {
    const record = await this.prisma.projectSource.create({
      data: {
        projectId: data.projectId,
        youtubeVideoId: data.youtubeVideoId,
        youtubeUrl: data.youtubeUrl,
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        duration: data.duration,
        publishedAt: data.publishedAt,
        viewCount: data.viewCount,
        likeCount: data.likeCount,
        commentCount: data.commentCount,
        privacyStatus: data.privacyStatus,
        metadataJson: data.metadataJson as never,
      },
    });
    return createProjectSource(record);
  }

  async update(id: string, data: Partial<{ sourceStatus: string; mediaStatus: string; storageKey: string; errorMessage: string; metadataJson: unknown; analyticsJson: unknown }>): Promise<ProjectSource> {
    const record = await this.prisma.projectSource.update({
      where: { id },
      data: {
        ...data,
        metadataJson: data.metadataJson as never,
        analyticsJson: data.analyticsJson as never,
      },
    });
    return createProjectSource(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.projectSource.delete({ where: { id } });
  }
}
