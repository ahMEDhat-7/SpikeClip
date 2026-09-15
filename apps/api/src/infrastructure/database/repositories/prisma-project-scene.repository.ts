import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ProjectScene, createProjectScene } from "../../../domain/entities/project-scene.entity";
import type { ProjectSceneRepository } from "../../../domain/repositories/project-scene.repository";

@Injectable()
export class PrismaProjectSceneRepository implements ProjectSceneRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<ProjectScene | null> {
    const record = await this.prisma.projectScene.findUnique({ where: { id } });
    return record ? createProjectScene(record) : null;
  }

  async findByProjectId(projectId: string): Promise<ProjectScene[]> {
    const records = await this.prisma.projectScene.findMany({
      where: { projectId },
      orderBy: { score: "desc" },
    });
    return records.map(createProjectScene);
  }

  async findBySourceId(sourceId: string): Promise<ProjectScene[]> {
    const records = await this.prisma.projectScene.findMany({
      where: { sourceId },
      orderBy: { score: "desc" },
    });
    return records.map(createProjectScene);
  }

  async create(data: { projectId: string; sourceId: string; startTime: number; endTime: number; duration: number; score?: number; rank?: number; analysisJson?: unknown }): Promise<ProjectScene> {
    const record = await this.prisma.projectScene.create({
      data: {
        projectId: data.projectId,
        sourceId: data.sourceId,
        startTime: data.startTime,
        endTime: data.endTime,
        duration: data.duration,
        score: data.score,
        rank: data.rank,
        analysisJson: data.analysisJson as never,
      },
    });
    return createProjectScene(record);
  }

  async update(id: string, data: Partial<{ startTime: number; endTime: number; duration: number; score: number; rank: number; status: string; analysisJson: unknown }>): Promise<ProjectScene> {
    const record = await this.prisma.projectScene.update({
      where: { id },
      data: {
        ...data,
        analysisJson: data.analysisJson as never,
      },
    });
    return createProjectScene(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.projectScene.delete({ where: { id } });
  }

  async countByProjectId(projectId: string): Promise<number> {
    return this.prisma.projectScene.count({ where: { projectId } });
  }
}
