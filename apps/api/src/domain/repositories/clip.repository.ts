import { Clip } from "../entities/clip.entity";

export const CLIP_REPOSITORY = "CLIP_REPOSITORY";

export interface ClipRepository {
  findById(id: string): Promise<Clip | null>;
  findByJobId(jobId: string): Promise<Clip[]>;
  create(clip: Clip): Promise<Clip>;
  update(id: string, data: Partial<Clip>): Promise<Clip>;
  countPendingByJob(jobId: string): Promise<number>;
  softDelete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
}
