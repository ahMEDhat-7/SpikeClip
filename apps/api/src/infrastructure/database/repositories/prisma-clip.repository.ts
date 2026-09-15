import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ClipRepository } from "../../../domain/repositories/clip.repository";
import { Clip } from "../../../domain/entities/clip.entity";
import { type ClipStatusValue } from "@spikeclip/shared";

@Injectable()
export class PrismaClipRepository implements ClipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Clip | null> {
    const clip = await this.prisma.clip.findFirst({ where: { id, deletedAt: null } });
    if (!clip) return null;

    return new Clip(
      clip.id,
      clip.jobId,
      clip.sceneIndex,
      clip.startTime,
      clip.endTime,
      clip.peakIntensity ?? undefined,
      clip.status as ClipStatusValue,
      clip.fileUrl ?? undefined,
      clip.fileSize ?? undefined,
      clip.duration ?? undefined,
      clip.errorMessage ?? undefined,
      clip.createdAt,
      clip.completedAt ?? undefined
    );
  }

  async findByJobId(jobId: string): Promise<Clip[]> {
    const clips = await this.prisma.clip.findMany({
      where: { jobId, deletedAt: null },
      orderBy: { sceneIndex: "asc" },
    });

    return clips.map(
      (clip) =>
        new Clip(
          clip.id,
          clip.jobId,
          clip.sceneIndex,
          clip.startTime,
          clip.endTime,
          clip.peakIntensity ?? undefined,
      clip.status as ClipStatusValue,
          clip.fileUrl ?? undefined,
          clip.fileSize ?? undefined,
          clip.duration ?? undefined,
          clip.errorMessage ?? undefined,
          clip.createdAt,
          clip.completedAt ?? undefined
        )
    );
  }

  async create(clip: Clip): Promise<Clip> {
    const created = await this.prisma.clip.create({
      data: {
        id: clip.id,
        jobId: clip.jobId,
        sceneIndex: clip.sceneIndex,
        startTime: clip.startTime,
        endTime: clip.endTime,
        peakIntensity: clip.peakIntensity,
        status: clip.status,
        fileUrl: clip.fileUrl,
        fileSize: clip.fileSize,
        duration: clip.duration,
        errorMessage: clip.errorMessage,
      },
    });

    return new Clip(
      created.id,
      created.jobId,
      created.sceneIndex,
      created.startTime,
      created.endTime,
      created.peakIntensity ?? undefined,
      created.status as ClipStatusValue,
      created.fileUrl ?? undefined,
      created.fileSize ?? undefined,
      created.duration ?? undefined,
      created.errorMessage ?? undefined,
      created.createdAt,
      created.completedAt ?? undefined
    );
  }

  async update(id: string, data: Partial<Clip>): Promise<Clip> {
    const updated = await this.prisma.clip.update({
      where: { id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.fileUrl !== undefined && { fileUrl: data.fileUrl }),
        ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.errorMessage !== undefined && { errorMessage: data.errorMessage }),
        ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
      },
    });

    return new Clip(
      updated.id,
      updated.jobId,
      updated.sceneIndex,
      updated.startTime,
      updated.endTime,
      updated.peakIntensity ?? undefined,
      updated.status as ClipStatusValue,
      updated.fileUrl ?? undefined,
      updated.fileSize ?? undefined,
      updated.duration ?? undefined,
      updated.errorMessage ?? undefined,
      updated.createdAt,
      updated.completedAt ?? undefined
    );
  }

  async countPendingByJob(jobId: string): Promise<number> {
    return this.prisma.clip.count({
      where: { jobId, deletedAt: null, status: { in: ["pending", "processing"] } },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.clip.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async deleteMany(ids: string[]): Promise<void> {
    await this.prisma.clip.deleteMany({
      where: { id: { in: ids } },
    });
  }
}
