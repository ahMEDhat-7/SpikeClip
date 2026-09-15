import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { GeneratedClip, createGeneratedClip } from "../../../domain/entities/generated-clip.entity";
import type { GeneratedClipRepository } from "../../../domain/repositories/generated-clip.repository";

@Injectable()
export class PrismaGeneratedClipRepository implements GeneratedClipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<GeneratedClip | null> {
    const record = await this.prisma.generatedClip.findUnique({ where: { id } });
    return record ? createGeneratedClip(record) : null;
  }

  async findByProjectId(projectId: string): Promise<GeneratedClip[]> {
    const records = await this.prisma.generatedClip.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(createGeneratedClip);
  }

  async findBySceneId(sceneId: string): Promise<GeneratedClip[]> {
    const records = await this.prisma.generatedClip.findMany({
      where: { sceneId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(createGeneratedClip);
  }

  async create(data: { projectId: string; sceneId: string; sourceId: string; platform?: string; aspectRatio?: string; duration?: number; editorConfigJson?: unknown }): Promise<GeneratedClip> {
    const record = await this.prisma.generatedClip.create({
      data: {
        projectId: data.projectId,
        sceneId: data.sceneId,
        sourceId: data.sourceId,
        platform: data.platform,
        aspectRatio: data.aspectRatio,
        duration: data.duration,
        editorConfigJson: data.editorConfigJson as never,
      },
    });
    return createGeneratedClip(record);
  }

  async update(id: string, data: Partial<{ status: string; platform: string; aspectRatio: string; duration: number; editorConfigJson: unknown; outputStorageKey: string; fileUrl: string; size: number; progress: number; errorMessage: string; startedAt: Date; completedAt: Date }>): Promise<GeneratedClip> {
    const record = await this.prisma.generatedClip.update({
      where: { id },
      data: {
        ...data,
        editorConfigJson: data.editorConfigJson as never,
      },
    });
    return createGeneratedClip(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.generatedClip.delete({ where: { id } });
  }
}
