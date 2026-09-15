import type { ProjectScene } from "../entities/project-scene.entity";

export const PROJECT_SCENE_REPOSITORY = "PROJECT_SCENE_REPOSITORY";

export interface ProjectSceneRepository {
  findById(id: string): Promise<ProjectScene | null>;
  findByProjectId(projectId: string): Promise<ProjectScene[]>;
  findBySourceId(sourceId: string): Promise<ProjectScene[]>;
  create(data: { projectId: string; sourceId: string; startTime: number; endTime: number; duration: number; score?: number; rank?: number; analysisJson?: unknown }): Promise<ProjectScene>;
  update(id: string, data: Partial<{ startTime: number; endTime: number; duration: number; score: number; rank: number; status: string; analysisJson: unknown }>): Promise<ProjectScene>;
  delete(id: string): Promise<void>;
  countByProjectId(projectId: string): Promise<number>;
}
