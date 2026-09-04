import type { ProjectSource } from "../entities/project-source.entity";

export const PROJECT_SOURCE_REPOSITORY = "PROJECT_SOURCE_REPOSITORY";

export interface ProjectSourceRepository {
  findById(id: string): Promise<ProjectSource | null>;
  findByProjectId(projectId: string): Promise<ProjectSource[]>;
  findByProjectIdAndVideoId(projectId: string, youtubeVideoId: string): Promise<ProjectSource | null>;
  create(data: { projectId: string; youtubeVideoId: string; youtubeUrl: string; title?: string; description?: string; thumbnailUrl?: string; duration?: number; publishedAt?: string; viewCount?: number; likeCount?: number; commentCount?: number; privacyStatus?: string; metadataJson?: unknown }): Promise<ProjectSource>;
  update(id: string, data: Partial<{ sourceStatus: string; mediaStatus: string; storageKey: string; errorMessage: string; metadataJson: unknown; analyticsJson: unknown }>): Promise<ProjectSource>;
  delete(id: string): Promise<void>;
}
