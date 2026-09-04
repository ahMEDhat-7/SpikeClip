import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { PROJECT_SOURCE_REPOSITORY, type ProjectSourceRepository } from "../../domain/repositories/project-source.repository";
import { PROJECT_SCENE_REPOSITORY, type ProjectSceneRepository } from "../../domain/repositories/project-scene.repository";
import { GENERATED_CLIP_REPOSITORY, type GeneratedClipRepository } from "../../domain/repositories/generated-clip.repository";
import { PROJECT_REPOSITORY, type ProjectRepository } from "../../domain/repositories/project.repository";
import { USER_REPOSITORY, type UserRepository } from "../../domain/repositories/user.repository";
import { QUEUE_SERVICE, type QueueService } from "../../domain/services/queue";
import { UNLIMITED } from "@spikeclip/shared";

@Injectable()
export class ProjectExportService {
  private readonly logger = new Logger(ProjectExportService.name);

  constructor(
    @Inject(PROJECT_SOURCE_REPOSITORY) private readonly sourceRepo: ProjectSourceRepository,
    @Inject(PROJECT_SCENE_REPOSITORY) private readonly sceneRepo: ProjectSceneRepository,
    @Inject(GENERATED_CLIP_REPOSITORY) private readonly clipRepo: GeneratedClipRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepo: ProjectRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(QUEUE_SERVICE) private readonly queueService: QueueService,
  ) {}

  async exportClips(
    userId: string,
    projectId: string,
    sceneIds: string[],
    config?: { platform?: string; quality?: string; format?: string },
  ) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new NotFoundException("Project not found");
    }

    if (!sceneIds.length) {
      throw new BadRequestException("At least one scene ID is required");
    }

    // Fetch scenes and verify they belong to the project
    const scenes = await Promise.all(
      sceneIds.map((id) => this.sceneRepo.findById(id)),
    );
    const invalidScene = scenes.find(
      (s) => !s || s.projectId !== projectId,
    );
    if (invalidScene) {
      throw new BadRequestException("One or more scenes do not belong to this project");
    }

    // Check free-tier clip quota
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.clipsLimit !== UNLIMITED && user.clipsUsed + sceneIds.length > user.clipsLimit) {
      throw new BadRequestException(
        `Clip export limit reached. You have ${user.clipsLimit - user.clipsUsed} clips remaining on your current plan.`,
      );
    }

    const clipIds: string[] = [];

    for (const scene of scenes) {
      // Get the source for this scene to get the video URL
      const source = await this.sourceRepo.findById(scene!.sourceId);
      if (!source || source.projectId !== projectId) {
        throw new BadRequestException(`Source not found for scene ${scene!.id}`);
      }

      const clip = await this.clipRepo.create({
        projectId,
        sceneId: scene!.id,
        sourceId: source.id,
        platform: config?.platform,
        aspectRatio: "9:16",
        duration: scene!.duration,
      });

      await this.queueService.addProjectExportJob({
        clipId: clip.id,
        projectId,
        sourceId: source.id,
        sceneId: scene!.id,
        videoUrl: source.youtubeUrl,
        startTime: scene!.startTime,
        endTime: scene!.endTime,
        platform: config?.platform,
        quality: config?.quality,
        format: config?.format,
      });

      clipIds.push(clip.id);
    }

    // Increment clip usage
    await this.userRepo.incrementClips(userId, sceneIds.length);

    this.logger.log(`Enqueued ${clipIds.length} clip export(s) for project ${projectId}`);

    return { clipIds, count: clipIds.length };
  }
}
