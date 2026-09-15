import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { readFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { GENERATED_CLIP_REPOSITORY, type GeneratedClipRepository } from "../../domain/repositories/generated-clip.repository";
import { PROJECT_SCENE_REPOSITORY, type ProjectSceneRepository } from "../../domain/repositories/project-scene.repository";
import { PROJECT_SOURCE_REPOSITORY, type ProjectSourceRepository } from "../../domain/repositories/project-source.repository";
import { PROJECT_REPOSITORY, type ProjectRepository } from "../../domain/repositories/project.repository";
import { USER_REPOSITORY, type UserRepository } from "../../domain/repositories/user.repository";
import { STORAGE_SERVICE, type StorageService } from "../../infrastructure/storage/storage.interface";
import { YtdlpService } from "../../infrastructure/external/ytdlp.service";
import { UNLIMITED, MimeTypes } from "@spikeclip/shared";

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class ClipService {
  private readonly logger = new Logger(ClipService.name);

  constructor(
    @Inject(GENERATED_CLIP_REPOSITORY) private readonly clipRepo: GeneratedClipRepository,
    @Inject(PROJECT_SCENE_REPOSITORY) private readonly sceneRepo: ProjectSceneRepository,
    @Inject(PROJECT_SOURCE_REPOSITORY) private readonly sourceRepo: ProjectSourceRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepo: ProjectRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly ytdlpService: YtdlpService,
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

  async getSignedDownloadUrl(fileUrl: string): Promise<string> {
    return this.storage.getSignedUrl(fileUrl);
  }

  async prepareEditorSource(
    userId: string,
    projectId: string,
    body: { sourceId: string; startTime: number; endTime: number },
  ): Promise<{ url: string }> {
    await this.ensureOwnership(userId, projectId);

    const source = await this.sourceRepo.findById(body.sourceId);
    if (!source || source.projectId !== projectId) {
      throw new NotFoundException("Source not found");
    }

    if (Number.isNaN(body.startTime) || Number.isNaN(body.endTime) || body.endTime <= body.startTime) {
      throw new BadRequestException("Invalid time range");
    }

    let tmpDir: string | null = null;
    let tmpFile: string | null = null;

    try {
      tmpDir = await mkdtemp(join(tmpdir(), "editor-src-"));
      tmpFile = join(tmpDir, "section.mp4");

      await this.ytdlpService.downloadSection(
        source.youtubeUrl,
        body.startTime,
        body.endTime,
        tmpFile,
      );

      const fileBuffer = await readFile(tmpFile);
      const storageKey = `editor-sources/${projectId}/${body.sourceId}-${body.startTime}-${body.endTime}.mp4`;
      await this.storage.upload(fileBuffer, storageKey, MimeTypes.VIDEO_MP4);

      const signedUrl = await this.storage.getSignedUrl(storageKey, 3600);
      return { url: signedUrl };
    } finally {
      if (tmpFile) await unlink(tmpFile).catch(() => {});
      if (tmpDir) await unlink(tmpDir).catch(() => {});
    }
  }

  async exportEditorClip(
    userId: string,
    projectId: string,
    file: MulterFile,
    body: { startTime?: string; endTime?: string; platform?: string; duration?: string; peakIntensity?: string },
  ): Promise<{ clipId: string; status: string }> {
    await this.ensureOwnership(userId, projectId);

    if (!file) {
      throw new BadRequestException("No file provided");
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.clipsLimit !== UNLIMITED && user.clipsUsed >= user.clipsLimit) {
      throw new BadRequestException(
        `Clip export limit reached. You have ${user.clipsLimit - user.clipsUsed} clips remaining on your current plan.`,
      );
    }

    const storageKey = `clips/${projectId}/${Date.now()}-${file.originalname}`;
    await this.storage.upload(file.buffer, storageKey, file.mimetype);

    const clip = await this.clipRepo.create({
      projectId,
      sceneId: "",
      sourceId: "",
      platform: body.platform,
      aspectRatio: "9:16",
      duration: body.duration ? parseFloat(body.duration) : undefined,
    });

    await this.clipRepo.update(clip.id, {
      status: "completed",
      fileUrl: storageKey,
      size: file.size,
      completedAt: new Date(),
    });

    await this.userRepo.incrementClips(userId, 1);

    this.logger.log(`Editor clip saved: ${clip.id} for project ${projectId}`);

    return { clipId: clip.id, status: "completed" };
  }

  private async ensureOwnership(userId: string, projectId: string) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new NotFoundException("Project not found");
    }
  }
}
