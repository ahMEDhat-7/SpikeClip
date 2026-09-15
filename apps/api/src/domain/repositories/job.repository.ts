import { Job } from "../entities/job.entity";
import { type JobStatusValue } from "@spikeclip/shared";

export const JOB_REPOSITORY = "JOB_REPOSITORY";

export interface JobRepository {
  findById(id: string): Promise<Job | null>;
  findByIdIncludeDeleted(id: string): Promise<Job | null>;
  findByUserId(userId: string): Promise<Job[]>;
  create(job: Job): Promise<Job>;
  update(id: string, data: Partial<Job>): Promise<Job>;
  updateStatus(id: string, status: JobStatusValue): Promise<void>;
  softDelete(id: string): Promise<void>;
  softDeleteClips(jobId: string): Promise<void>;
  findClipsByJobId(jobId: string): Promise<Array<{
    id: string;
    jobId: string;
    sceneIndex: number;
    startTime: number;
    endTime: number;
    peakIntensity: number | null;
    status: string;
    fileUrl: string | null;
    fileSize: number | null;
    duration: number | null;
    errorMessage: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }>>;
  countPendingClips(jobId: string): Promise<number>;
}
