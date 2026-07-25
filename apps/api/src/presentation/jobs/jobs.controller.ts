import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Inject,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Request } from "express";
import { CreateJobUseCase } from "../../application/use-cases/create-job.use-case";
import { ProcessHeatmapUseCase } from "../../application/use-cases/process-heatmap.use-case";
import { ExportClipsUseCase } from "../../application/use-cases/export-clips.use-case";
import { CreateJobDto } from "../../application/dto/create-job.dto";
import { ExportClipsDto } from "../../application/dto/export-clips.dto";
import { JobResponseDto } from "../../application/dto/job-response.dto";
import { JobRepository, JOB_REPOSITORY } from "../../domain/repositories/job.repository";
import { JobNotFoundException } from "../../domain/exceptions/job-not-found.exception";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { ClipResponseDto } from "../clips/dto/clip-response.dto";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "../../infrastructure/auth/auth.service";
import { toClipResponse } from "../../application/mappers/clip.mapper";

@ApiTags("Jobs")
@Controller("jobs")
export class JobsController {
  constructor(
    private readonly createJobUseCase: CreateJobUseCase,
    private readonly processHeatmapUseCase: ProcessHeatmapUseCase,
    private readonly exportClipsUseCase: ExportClipsUseCase,
    @Inject(JOB_REPOSITORY) private readonly jobRepository: JobRepository,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new analysis job", description: "Submits a YouTube URL for heatmap analysis. Extracts video metadata and queues the job for processing." })
  @ApiResponse({ status: 201, description: "Job created successfully", type: JobResponseDto })
  @ApiResponse({ status: 400, description: "Invalid YouTube URL" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Analysis quota exceeded" })
  async create(@Body() dto: CreateJobDto, @Req() req: Request & { user: { userId: string } }): Promise<JobResponseDto> {
    const canAnalyze = await this.authService.checkCanAnalyze(req.user.userId);
    if (!canAnalyze) {
      throw new ForbiddenException("Analysis quota exceeded. Upgrade your plan for unlimited analyses.");
    }
    const job = await this.createJobUseCase.execute(dto.url, req.user.userId);
    const incremented = await this.authService.incrementAnalyses(req.user.userId);
    if (!incremented) {
      // Race condition: quota exceeded between check and increment — clean up
      await this.jobRepository.findById(job.id); // ensure job exists
      await this.prisma.job.delete({ where: { id: job.id } }).catch(() => {});
      throw new ForbiddenException("Analysis quota exceeded. Upgrade your plan for unlimited analyses.");
    }
    return job;
  }

  @Get(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get job by ID", description: "Returns a single job with its current status, scenes, and heatmap data." })
  @ApiParam({ name: "id", description: "Job UUID", example: "550e8400-e29b-41d4-a716-446655440000" })
  @ApiResponse({ status: 200, description: "Job found", type: JobResponseDto })
  @ApiResponse({ status: 404, description: "Job not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden — job does not belong to you" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { userId: string } }
  ): Promise<JobResponseDto> {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new JobNotFoundException(id);
    if (job.userId !== req.user.userId) {
      throw new ForbiddenException("Job does not belong to you");
    }
    return JobResponseDto.fromEntity(job);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: "List jobs for current user", description: "Returns all jobs for the authenticated user, ordered by creation date descending." })
  @ApiResponse({ status: 200, description: "List of jobs", type: [JobResponseDto] })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(@Req() req: Request & { user: { userId: string } }): Promise<JobResponseDto[]> {
    const jobs = await this.jobRepository.findByUserId(req.user.userId);
    return jobs.map(JobResponseDto.fromEntity);
  }

  @Get(":id/clips")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get clips for a job", description: "Returns all clips (scenes) for a given job." })
  @ApiParam({ name: "id", description: "Job UUID" })
  @ApiResponse({ status: 200, description: "List of clips", type: [ClipResponseDto] })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden — job does not belong to you" })
  async getClips(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { userId: string } }
  ): Promise<ClipResponseDto[]> {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    if (job.userId !== req.user.userId) {
      throw new ForbiddenException("Job does not belong to you");
    }

    const clips = await this.prisma.clip.findMany({
      where: { jobId: id },
      orderBy: { sceneIndex: "asc" },
    });

    return clips.map(toClipResponse);
  }

  @Post(":id/process")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Process job heatmap", description: "Runs the spike merging algorithm on the job's heatmap data. Generates scored scenes." })
  @ApiParam({ name: "id", description: "Job UUID" })
  @ApiResponse({ status: 200, description: "Job processed successfully", type: JobResponseDto })
  @ApiResponse({ status: 404, description: "Job not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden — job does not belong to you" })
  async process(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request & { user: { userId: string } }
  ): Promise<JobResponseDto> {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    if (job.userId !== req.user.userId) {
      throw new ForbiddenException("Job does not belong to you");
    }
    return this.processHeatmapUseCase.execute(id);
  }

  @Post(":id/export")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Export clips from job", description: "Queues export jobs for selected scenes. Returns clip job IDs for tracking." })
  @ApiParam({ name: "id", description: "Job UUID" })
  @ApiResponse({
    status: 200,
    description: "Export jobs queued",
    schema: {
      type: "object",
      properties: {
        jobId: { type: "string", example: "550e8400-e29b-41d4-a716-446655440000" },
        clipJobIds: { type: "array", items: { type: "string" }, example: ["550e8400-...-0", "550e8400-...-2"] },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Job not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden — job does not belong to you" })
  async export(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ExportClipsDto,
    @Req() req: Request & { user: { userId: string } }
  ): Promise<{ jobId: string; clipJobIds: string[] }> {
    const job = await this.jobRepository.findById(id);
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    if (job.userId !== req.user.userId) {
      throw new ForbiddenException("Job does not belong to you");
    }
    if (job.status !== "completed") {
      throw new ForbiddenException("Job has not completed processing yet");
    }

    let scenes = dto.scenes;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { plan: true },
    });

    if (dbUser?.plan === "free" && scenes.length > 3) {
      scenes = scenes.slice(0, 3);
    }

    const MAX_SCENES_PER_EXPORT = 25;
    if (scenes.length > MAX_SCENES_PER_EXPORT) {
      scenes = scenes.slice(0, MAX_SCENES_PER_EXPORT);
    }

    return this.exportClipsUseCase.execute(id, scenes, req.user.userId, {
      platform: dto.platform,
      format: dto.format,
      quality: dto.quality,
      captions: dto.captions,
      music: dto.music,
      templateId: dto.templateId,
      templateConfig: dto.templateConfig as Record<string, unknown> | undefined,
      actions: dto.actions,
    });
  }
}
