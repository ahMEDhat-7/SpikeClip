import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  Sse,
  Inject,
  Logger,
  NotFoundException,
  ForbiddenException,
  ParseUUIDPipe,
} from "@nestjs/common";
import { Request } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Response } from "express";
import { Observable } from "rxjs";
import { JobRepository, JOB_REPOSITORY } from "../../domain/repositories/job.repository";
import { ClipRepository, CLIP_REPOSITORY } from "../../domain/repositories/clip.repository";
import { UserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { ClipResponseDto } from "./dto/clip-response.dto";
import { STORAGE_SERVICE, StorageService } from "../../infrastructure/storage/storage.interface";
import { LocalStorageService } from "../../infrastructure/storage/local-storage.service";
import { toClipResponse } from "../../application/mappers/clip.mapper";
import { Public } from "../../infrastructure/auth/jwt-auth.guard";
import { subscribeToJobProgress } from "../../infrastructure/redis/progress-subscriber";
import { PlanTier, ClipStatus, EXTENSION_TO_MIME, AUDIO_EXTENSIONS, MimeTypes } from "@spikeclip/shared";

@ApiTags("Clips")
@Controller("clips")
export class ClipsController {
  private readonly logger = new Logger(ClipsController.name);

  constructor(
    @Inject(JOB_REPOSITORY) private readonly jobRepository: JobRepository,
    @Inject(CLIP_REPOSITORY) private readonly clipRepository: ClipRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService
  ) {}

  @Get("job/:jobId")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "List clips for a job",
    description: "Returns all clips (scenes) for a given job, ordered by scene index.",
  })
  @ApiParam({ name: "jobId", description: "Job UUID" })
  @ApiResponse({ status: 200, description: "List of clips", type: [ClipResponseDto] })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden — job does not belong to you" })
  async findByJobId(
    @Param("jobId", ParseUUIDPipe) jobId: string,
    @Req() req: Request & { user?: { userId?: string } }
  ): Promise<ClipResponseDto[]> {
    const job = await this.jobRepository.findById(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    if (job.userId !== req.user?.userId) throw new ForbiddenException("Job does not belong to you");

    const clips = await this.clipRepository.findByJobId(jobId);
    return clips.map((clip) => toClipResponse({
      id: clip.id,
      jobId: clip.jobId,
      sceneIndex: clip.sceneIndex,
      startTime: clip.startTime,
      endTime: clip.endTime,
      peakIntensity: clip.peakIntensity ?? null,
      status: clip.status,
      fileUrl: clip.fileUrl ?? null,
      fileSize: clip.fileSize ?? null,
      duration: clip.duration ?? null,
      errorMessage: clip.errorMessage ?? null,
      createdAt: clip.createdAt,
      completedAt: clip.completedAt ?? null,
    }));
  }

  @Get("job/:jobId/progress")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Subscribe to clip export progress via SSE", description: "Returns a server-sent event stream with real-time progress updates for all clips in a job." })
  @ApiParam({ name: "jobId", description: "Job UUID" })
  @ApiResponse({ status: 200, description: "SSE stream of clip progress events" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden — job does not belong to you" })
  clipProgress(
    @Param("jobId", ParseUUIDPipe) jobId: string,
    @Req() req: Request & { user?: { userId?: string } }
  ): Observable<{ data: any }> {
    const clip$ = new Observable<{ data: any }>((observer) => {
      this.jobRepository.findById(jobId).then((job) => {
        if (!job || job.userId !== req.user?.userId) {
          observer.error(new ForbiddenException("Job not found or unauthorized"));
          return;
        }

        // Send initial state
        observer.next({ data: { jobId, progress: 0, step: "subscribed" } });
      }).catch(() => {
        observer.error(new NotFoundException("Job not found"));
      });

      const { unsubscribe } = subscribeToJobProgress(jobId, (event) => {
        observer.next({ data: event });
        if (event.step === "completed" || event.step === "failed") {
          observer.complete();
        }
      }, (err) => {
        observer.error(err);
      });

      return () => {
        unsubscribe();
      };
    });

    return clip$;
  }

  @Get(":id/download")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Download a clip",
    description: "Returns a signed URL for downloading the clip file. Requires Pro or Team plan.",
  })
  @ApiParam({ name: "id", description: "Clip UUID" })
  @ApiResponse({ status: 200, description: "Redirects to signed download URL" })
  @ApiResponse({ status: 404, description: "Clip not found or not ready" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Pro or Team plan required" })
  async download(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() req: Request & { user?: { userId?: string } },
    @Res() res: Response
  ): Promise<void> {
    const clip = await this.clipRepository.findById(id);
    if (!clip) {
      throw new NotFoundException(`Clip ${id} not found`);
    }

    const job = await this.jobRepository.findById(clip.jobId);
    if (!job || job.userId !== req.user?.userId) {
      throw new ForbiddenException("Clip does not belong to you");
    }

    const user = await this.userRepository.findById(req.user?.userId);
    if (!user || user.plan === PlanTier.FREE) {
      throw new ForbiddenException("Pro or Team plan required to download clips");
    }

    if (clip.status !== ClipStatus.COMPLETED || !clip.fileUrl) {
      throw new NotFoundException(`Clip ${id} is not ready for download (status: ${clip.status})`);
    }

    const signedUrl = await this.storage.getSignedUrl(clip.fileUrl);
    res.redirect(signedUrl);
  }

  @Get("download/:key")
  @Public()
  @ApiOperation({
    summary: "Serve a clip file via signed URL",
    description: "Downloads a clip file from storage after verifying the signed URL.",
  })
  @ApiParam({ name: "key", description: "Storage key" })
  @ApiResponse({ status: 200, description: "Serves the file" })
  @ApiResponse({ status: 403, description: "Invalid or expired signature" })
  @ApiResponse({ status: 404, description: "File not found" })
  async downloadFile(
    @Param("key") key: string,
    @Query("expires") expires: string,
    @Query("sig") sig: string,
    @Res() res: Response
  ): Promise<void> {
    const expiresNum = parseInt(expires, 10);
    if (!expiresNum || !sig) {
      throw new ForbiddenException("Missing signature parameters");
    }

    if (!LocalStorageService.verifySignature(key, expiresNum, sig)) {
      throw new ForbiddenException("Invalid or expired signature");
    }

    try {
      const stream = await this.storage.createReadStream(key);
      const ext = key.split(".").pop()?.toLowerCase() || "mp4";
      const contentType = EXTENSION_TO_MIME[ext] || MimeTypes.OCTET_STREAM;
      const isAudio = AUDIO_EXTENSIONS.includes(ext);
      const filename = key.split("/").pop()?.replace(/[^a-zA-Z0-9._-]/g, "_") || `clip.${ext}`;

      res.set({
        "Content-Type": contentType,
        "Content-Disposition": isAudio ? "inline" : `attachment; filename="${filename}"`,
      });

      stream.on("error", (err) => {
        this.logger.error(`Stream error reading ${key}: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to read clip file" });
        }
      });

      stream.pipe(res);
    } catch {
      throw new NotFoundException("File not found");
    }
  }
}
