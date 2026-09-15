import { Injectable, Inject, Logger, NotFoundException } from "@nestjs/common";
import { PROJECT_SCENE_REPOSITORY, type ProjectSceneRepository } from "../../domain/repositories/project-scene.repository";
import { PROJECT_SOURCE_REPOSITORY, type ProjectSourceRepository } from "../../domain/repositories/project-source.repository";
import { PROJECT_REPOSITORY, type ProjectRepository } from "../../domain/repositories/project.repository";
import { QUEUE_SERVICE, type QueueService } from "../../domain/services/queue";

@Injectable()
export class SceneService {
  private readonly logger = new Logger(SceneService.name);

  constructor(
    @Inject(PROJECT_SCENE_REPOSITORY) private readonly sceneRepo: ProjectSceneRepository,
    @Inject(PROJECT_SOURCE_REPOSITORY) private readonly sourceRepo: ProjectSourceRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepo: ProjectRepository,
    @Inject(QUEUE_SERVICE) private readonly queueService: QueueService,
  ) {}

  async list(userId: string, projectId: string) {
    await this.ensureOwnership(userId, projectId);
    const scenes = await this.sceneRepo.findByProjectId(projectId);
    return scenes.map((s) => s.toRaw());
  }

  async listBySource(userId: string, projectId: string, sourceId: string) {
    await this.ensureOwnership(userId, projectId);
    const scenes = await this.sceneRepo.findBySourceId(sourceId);
    return scenes.map((s) => s.toRaw());
  }

  async generateScenes(userId: string, projectId: string, sourceId: string) {
    await this.ensureOwnership(userId, projectId);

    const source = await this.sourceRepo.findById(sourceId);
    if (!source || source.projectId !== projectId) {
      throw new NotFoundException("Source not found");
    }

    if (source.sourceStatus === "analyzing") {
      return { status: "already_running" as const, message: "Scene generation already in progress" };
    }

    const bullJobId = await this.queueService.addSceneGenerationJob({
      sourceId,
      projectId,
      userId,
    });

    this.logger.log(`Enqueued scene generation for source ${sourceId} (job ${bullJobId})`);
    return { status: "pending" as const, bullJobId, sourceId };
  }

  async update(userId: string, projectId: string, sceneId: string, data: { startTime?: number; endTime?: number; status?: string }) {
    await this.ensureOwnership(userId, projectId);
    const scene = await this.sceneRepo.findById(sceneId);
    if (!scene || scene.projectId !== projectId) {
      throw new NotFoundException("Scene not found");
    }
    const updateData: { startTime?: number; endTime?: number; status?: string; duration?: number } = { ...data };
    if (data.startTime !== undefined && data.endTime !== undefined) {
      updateData.duration = data.endTime - data.startTime;
    }
    const updated = await this.sceneRepo.update(sceneId, updateData);
    return updated.toRaw();
  }

  async remove(userId: string, projectId: string, sceneId: string) {
    await this.ensureOwnership(userId, projectId);
    return this.sceneRepo.delete(sceneId);
  }

  private async ensureOwnership(userId: string, projectId: string) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new NotFoundException("Project not found");
    }
  }
}
