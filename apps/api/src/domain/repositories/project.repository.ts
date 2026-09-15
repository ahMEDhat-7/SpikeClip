import type { Project } from "../entities/project.entity";

export const PROJECT_REPOSITORY = "PROJECT_REPOSITORY";

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByUserId(userId: string): Promise<Project[]>;
  create(data: { userId: string; name: string; description?: string; youtubeConnectionId?: string }): Promise<Project>;
  update(id: string, data: Partial<{ name: string; description: string; status: string }>): Promise<Project>;
  delete(id: string): Promise<void>;
}
