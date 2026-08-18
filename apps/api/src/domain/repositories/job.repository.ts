import { Job } from "../entities/job.entity";
import { JobStatus } from "@spikeclip/shared";

export const JOB_REPOSITORY = "JOB_REPOSITORY";

export interface JobRepository {
  findById(id: string): Promise<Job | null>;
  findByUserId(userId: string): Promise<Job[]>;
  create(job: Job): Promise<Job>;
  update(id: string, data: Partial<Job>): Promise<Job>;
  updateStatus(id: string, status: JobStatus): Promise<void>;
}
