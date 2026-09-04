import { Injectable, Inject, Logger, NotFoundException } from "@nestjs/common";
import { GENERATED_CLIP_REPOSITORY, type GeneratedClipRepository } from "../../domain/repositories/generated-clip.repository";
import { PROJECT_SCENE_REPOSITORY, type ProjectSceneRepository } from "../../domain/repositories/project-scene.repository";
import { PROJECT_REPOSITORY, type ProjectRepository } from "../../domain/repositories/project.repository";

@Injectable()
export class ClipService {
  private readonly logger = new Logger(ClipService.name);

  constructor(
    @Inject(GENERATED_CLIP_REPOSITORY) private readonly clipRepo: GeneratedClipRepository,
    @Inject(PROJECT_SCENE_REPOSITORY) private readonly sceneRepo: ProjectSceneRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepo: ProjectRepository,
  ) {}

  async list(userId: string, projectId: string) {
    await this.ensureOwnership(userId, projectId);
    const clips = await this.clipRepo.findByProjectId(projectId);
    return clips.map((c) => c.toRaw());
  }

  async listByScene(userId: string, projectId: string, sceneId: string) {
    await this.ensureOwnership(userId, projectId);
    const clips = await this.clipRepo.findBySceneId(sceneId);
    return clips.map((c) => c.toRaw());
  }

  async get(userId: string, projectId: string, clipId: string) {
    await this.ensureOwnership(userId, projectId);
    const clip = await this.clipRepo.findById(clipId);
    if (!clip || clip.projectId !== projectId) {
      throw new NotFoundException("Clip not found");
    }
    return clip.toRaw();
  }

  async remove(userId: string, projectId: string, clipId: string) {
    await this.ensureOwnership(userId, projectId);
    return this.clipRepo.delete(clipId);
  }

  private async ensureOwnership(userId: string, projectId: string) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new NotFoundException("Project not found");
    }
  }
}
