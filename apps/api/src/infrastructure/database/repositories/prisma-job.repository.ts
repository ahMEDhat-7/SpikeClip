import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { JobRepository } from "../../../domain/repositories/job.repository";
import { Job } from "../../../domain/entities/job.entity";
import { JobMapper } from "../../../application/mappers/job.mapper";
import { type JobStatusValue } from "@spikeclip/shared";
import { Prisma } from "@prisma/client";

@Injectable()
export class PrismaJobRepository implements JobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Job | null> {
    const job = await this.prisma.job.findFirst({ where: { id, deletedAt: null } });
    return job ? JobMapper.toEntity(job) : null;
  }

  async findByIdIncludeDeleted(id: string): Promise<Job | null> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    return job ? JobMapper.toEntity(job) : null;
  }

  async findByUserId(userId: string): Promise<Job[]> {
    const jobs = await this.prisma.job.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return jobs.map(JobMapper.toEntity);
  }

  async create(job: Job): Promise<Job> {
    const data = JobMapper.toPersistence(job);
    const created = await this.prisma.job.create({ data: data as Prisma.JobCreateInput });
    return JobMapper.toEntity(created);
  }

  async update(id: string, data: Partial<Job>): Promise<Job> {
    const updated = await (this.prisma.job as unknown as {
      update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
    }).update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.scenes !== undefined && { scenes: data.scenes as unknown as Prisma.InputJsonValue }),
        ...(data.studioEdits !== undefined && {
          studioEdits: data.studioEdits as unknown as Prisma.InputJsonValue,
        }),
        ...(data.project !== undefined && {
          project: data.project as unknown as Prisma.InputJsonValue,
        }),
        ...(data.errorMessage !== undefined && { errorMessage: data.errorMessage }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
      },
    });
    return JobMapper.toEntity(updated as Parameters<typeof JobMapper.toEntity>[0]);
  }

  async updateStatus(id: string, status: JobStatusValue): Promise<void> {
    await this.prisma.job.update({
      where: { id },
      data: { status },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async softDeleteClips(jobId: string): Promise<void> {
    await this.prisma.clip.updateMany({
      where: { jobId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async findClipsByJobId(jobId: string): Promise<Array<{
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
  }>> {
    return this.prisma.clip.findMany({
      where: { jobId, deletedAt: null },
      orderBy: { sceneIndex: "asc" },
    });
  }

  async countPendingClips(jobId: string): Promise<number> {
    return this.prisma.clip.count({
      where: { jobId, deletedAt: null, status: { in: ["pending", "processing"] } },
    });
  }
}
