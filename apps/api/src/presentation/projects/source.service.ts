import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { PROJECT_SOURCE_REPOSITORY, type ProjectSourceRepository } from "../../domain/repositories/project-source.repository";
import { PROJECT_REPOSITORY, type ProjectRepository } from "../../domain/repositories/project.repository";
import { YOUTUBE_STUDIO_PROVIDER, type YoutubeStudioProvider } from "../../domain/ports/youtube-studio.provider";
import { YtdlpService } from "../../infrastructure/external/ytdlp.service";

@Injectable()
export class SourceService {
  private readonly logger = new Logger(SourceService.name);

  constructor(
    @Inject(PROJECT_SOURCE_REPOSITORY) private readonly sourceRepo: ProjectSourceRepository,
    @Inject(PROJECT_REPOSITORY) private readonly projectRepo: ProjectRepository,
    @Inject(YOUTUBE_STUDIO_PROVIDER) private readonly youtubeProvider: YoutubeStudioProvider,
    private readonly ytdlpService: YtdlpService,
  ) {}

  async list(userId: string, projectId: string) {
    await this.ensureOwnership(userId, projectId);
    const sources = await this.sourceRepo.findByProjectId(projectId);
    return sources.map((s) => s.toRaw());
  }

  async add(userId: string, projectId: string, videoId: string) {
    await this.ensureOwnership(userId, projectId);
    const existing = await this.sourceRepo.findByProjectIdAndVideoId(projectId, videoId);
    if (existing) {
      return existing.toRaw();
    }

    const video = await this.youtubeProvider.getVideo(videoId);
    const source = await this.sourceRepo.create({
      projectId,
      youtubeVideoId: videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      duration: parseFloat(video.duration) || 0,
      publishedAt: video.publishedAt,
      viewCount: parseInt(video.viewCount) || 0,
      likeCount: parseInt(video.likeCount) || 0,
      commentCount: parseInt(video.commentCount) || 0,
      privacyStatus: video.privacyStatus,
      metadataJson: { tags: video.tags, categoryId: video.categoryId, defaultLanguage: video.defaultLanguage },
    });
    return source.toRaw();
  }

  async addByUrl(userId: string, projectId: string, url: string) {
    await this.ensureOwnership(userId, projectId);

    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new BadRequestException("Invalid YouTube URL. Must be a youtube.com or youtu.be link.");
    }

    const existing = await this.sourceRepo.findByProjectIdAndVideoId(projectId, videoId);
    if (existing) {
      return existing.toRaw();
    }

    const metadata = await this.ytdlpService.extractMetadata(url);

    const source = await this.sourceRepo.create({
      projectId,
      youtubeVideoId: videoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      title: metadata.title,
      thumbnailUrl: metadata.thumbnail,
      duration: metadata.duration,
      publishedAt: metadata.uploadDate,
      viewCount: metadata.viewCount ?? 0,
      metadataJson: { channelName: metadata.channelName },
    });
    return source.toRaw();
  }

  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?.*?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  }

  async remove(userId: string, projectId: string, sourceId: string) {
    await this.ensureOwnership(userId, projectId);
    return this.sourceRepo.delete(sourceId);
  }

  async updateMediaStatus(userId: string, projectId: string, sourceId: string, status: string, storageKey?: string, errorMessage?: string) {
    await this.ensureOwnership(userId, projectId);
    return this.sourceRepo.update(sourceId, { mediaStatus: status, storageKey, errorMessage });
  }

  private async ensureOwnership(userId: string, projectId: string) {
    const project = await this.projectRepo.findById(projectId);
    if (!project || project.userId !== userId) {
      throw new NotFoundException("Project not found");
    }
  }
}
