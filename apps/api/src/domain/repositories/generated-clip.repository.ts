import type { GeneratedClip } from "../entities/generated-clip.entity";

export const GENERATED_CLIP_REPOSITORY = "GENERATED_CLIP_REPOSITORY";

export interface GeneratedClipRepository {
  findById(id: string): Promise<GeneratedClip | null>;
  findByProjectId(projectId: string): Promise<GeneratedClip[]>;
  findBySceneId(sceneId: string): Promise<GeneratedClip[]>;
  create(data: { projectId: string; sceneId: string; sourceId: string; platform?: string; aspectRatio?: string; duration?: number; editorConfigJson?: unknown }): Promise<GeneratedClip>;
  update(id: string, data: Partial<{ status: string; platform: string; aspectRatio: string; duration: number; editorConfigJson: unknown; outputStorageKey: string; fileUrl: string; size: number; progress: number; errorMessage: string; startedAt: Date; completedAt: Date }>): Promise<GeneratedClip>;
  delete(id: string): Promise<void>;
}
