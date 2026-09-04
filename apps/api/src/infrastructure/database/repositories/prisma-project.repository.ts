import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Project, createProject } from "../../../domain/entities/project.entity";
import type { ProjectRepository } from "../../../domain/repositories/project.repository";

@Injectable()
export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Project | null> {
    const record = await this.prisma.project.findUnique({ where: { id } });
    return record ? createProject(record) : null;
  }

  async findByUserId(userId: string): Promise<Project[]> {
    const records = await this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(createProject);
  }

  async create(data: { userId: string; name: string; description?: string; youtubeConnectionId?: string }): Promise<Project> {
    const record = await this.prisma.project.create({
      data: {
        userId: data.userId,
        name: data.name,
        description: data.description,
        youtubeConnectionId: data.youtubeConnectionId,
      },
    });
    return createProject(record);
  }

  async update(id: string, data: Partial<{ name: string; description: string; status: string }>): Promise<Project> {
    const record = await this.prisma.project.update({ where: { id }, data });
    return createProject(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }
}
