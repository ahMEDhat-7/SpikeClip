import { Injectable, Inject, Logger, NotFoundException, ForbiddenException } from "@nestjs/common";
import { PROJECT_REPOSITORY, type ProjectRepository } from "../../domain/repositories/project.repository";
import { PROJECT_SOURCE_REPOSITORY, type ProjectSourceRepository } from "../../domain/repositories/project-source.repository";
import { PROJECT_SCENE_REPOSITORY, type ProjectSceneRepository } from "../../domain/repositories/project-scene.repository";
import { GENERATED_CLIP_REPOSITORY, type GeneratedClipRepository } from "../../domain/repositories/generated-clip.repository";
import { YOUTUBE_CONNECTION_REPOSITORY, type YoutubeConnectionRepository } from "../../domain/repositories/youtube-connection.repository";

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @Inject(PROJECT_REPOSITORY) private readonly projectRepo: ProjectRepository,
    @Inject(PROJECT_SOURCE_REPOSITORY) private readonly sourceRepo: ProjectSourceRepository,
    @Inject(PROJECT_SCENE_REPOSITORY) private readonly sceneRepo: ProjectSceneRepository,
    @Inject(GENERATED_CLIP_REPOSITORY) private readonly clipRepo: GeneratedClipRepository,
    @Inject(YOUTUBE_CONNECTION_REPOSITORY) private readonly connectionRepo: YoutubeConnectionRepository,
  ) {}

  async list(userId: string) {
    const projects = await this.projectRepo.findByUserId(userId);
    return projects.map((p) => p.toRaw());
  }

  async get(userId: string, projectId: string) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new NotFoundException("Project not found");
    }
    return project.toRaw();
  }

  async create(userId: string, data: { name: string; description?: string; youtubeConnectionId?: string }) {
    if (data.youtubeConnectionId) {
      const connection = await this.connectionRepo.findById(data.youtubeConnectionId);
      if (!connection || connection.userId !== userId) {
        throw new NotFoundException("YouTube connection not found");
      }
    }
    const project = await this.projectRepo.create({ userId, ...data });
    return project.toRaw();
  }

  async update(userId: string, projectId: string, data: { name?: string; description?: string }) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new NotFoundException("Project not found");
    }
    const updated = await this.projectRepo.update(projectId, data);
    return updated.toRaw();
  }

  async remove(userId: string, projectId: string) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new NotFoundException("Project not found");
    }
    return this.projectRepo.delete(projectId);
  }

  async getWithDetails(userId: string, projectId: string) {
    const project = await this.get(userId, projectId);
    const sources = (await this.sourceRepo.findByProjectId(projectId)).map((s) => s.toRaw());
    const scenes = (await this.sceneRepo.findByProjectId(projectId)).map((s) => s.toRaw());
    const clips = (await this.clipRepo.findByProjectId(projectId)).map((c) => c.toRaw());
    return { project, sources, scenes, clips };
  }
}
