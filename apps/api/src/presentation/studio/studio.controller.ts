import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiConsumes } from "@nestjs/swagger";
import { Response } from "express";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { StudioService } from "./studio.service";
import { AuthService } from "../../infrastructure/auth/auth.service";
import type { StudioAction } from "@spikeclip/shared";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadedFile } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Platform, TMP_PREVIEW_DIR, MimeTypes, PREVIEW_CACHE_CONTROL, UPLOAD_MAX_SIZE_BYTES } from "@spikeclip/shared";

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface TranslatePromptDto {
  prompt: string;
  sceneStart: number;
  sceneEnd: number;
  platform: string;
  currentActions?: Array<Record<string, unknown>>;
  captions?: Array<{ text: string; start?: number; end?: number }>;
  music?: { name: string; volume: number } | null;
  template?: { id: string; name: string } | null;
  availableTemplates?: Array<{ id: string; name: string }>;
  history?: Array<{ role: string; content: string }>;
}

interface GeneratePreviewDto {
  sceneId: string;
  actions: Array<Record<string, unknown>>;
  platform: string;
}

const PREVIEW_TMP = TMP_PREVIEW_DIR;

@ApiTags("studio")
@ApiBearerAuth()
@Controller("studio")
export class StudioController {
  private readonly logger = new Logger(StudioController.name);

  constructor(
    private readonly studioService: StudioService,
    private readonly authService: AuthService
  ) {}

  @Post("translate")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Translate a natural language prompt into StudioActions" })
  @ApiResponse({ status: 200, description: "Actions and FFmpeg command generated" })
  @ApiResponse({ status: 400, description: "Invalid prompt or clarification needed" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["prompt", "sceneStart", "sceneEnd", "platform"],
      properties: {
        prompt: { type: "string", example: "Add bold white captions saying 'Highlight' from 0-3s" },
        sceneStart: { type: "number", example: 0 },
        sceneEnd: { type: "number", example: 15 },
        platform: { type: "string", enum: Object.values(Platform), example: Platform.YOUTUBE_SHORTS },
      },
    },
  })
  async translatePrompt(@Req() req: { user: { userId: string } }, @Body() dto: TranslatePromptDto) {
    return this.studioService.translatePrompt(req.user.userId, dto);
  }

  @Post("preview")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Generate a preview video with applied actions" })
  @ApiResponse({ status: 202, description: "Preview generation started" })
  @ApiResponse({ status: 400, description: "Invalid actions or scene" })
  async generatePreview(@Req() req: { user: { userId: string } }, @Body() dto: GeneratePreviewDto) {
    return this.studioService.generatePreview(req.user.userId, dto);
  }

  @Post("preview/:jobId/:sceneIndex")
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: "Generate preview for a specific job scene" })
  @ApiResponse({ status: 202, description: "Preview generation started" })
  @ApiResponse({ status: 404, description: "Job or scene not found" })
  async generatePreviewForScene(
    @Req() req: { user: { userId: string } },
    @Param("jobId") jobId: string,
    @Param("sceneIndex") sceneIndex: string,
    @Body() dto: Omit<GeneratePreviewDto, "sceneId">
  ) {
    return this.studioService.generatePreviewForScene(req.user.userId, jobId, parseInt(sceneIndex, 10), dto);
  }

  @Get("preview/:jobId/:sceneIndex/file")
  @ApiOperation({ summary: "Serve a generated preview video file" })
  @ApiResponse({ status: 200, description: "Serves the preview video" })
  @ApiResponse({ status: 404, description: "Preview file not found" })
  async servePreview(
    @Req() req: { user: { userId: string } },
    @Param("jobId") jobId: string,
    @Param("sceneIndex") sceneIndex: string,
    @Res() res: Response
  ) {
    const job = await this.studioService.getProject(req.user.userId, jobId);
    if (!job) {
      throw new NotFoundException("Job not found or unauthorized");
    }

    const safeSceneIndex = parseInt(sceneIndex, 10);
    if (isNaN(safeSceneIndex) || safeSceneIndex < 0) {
      throw new NotFoundException("Invalid scene index");
    }

    const previewFile = join(PREVIEW_TMP, `${jobId}-${safeSceneIndex}-preview.mp4`);

    if (!existsSync(previewFile)) {
      throw new NotFoundException("Preview file not found. Generate a preview first.");
    }

    res.set({
      "Content-Type": MimeTypes.VIDEO_MP4,
      "Cache-Control": PREVIEW_CACHE_CONTROL,
    });

    const stream = createReadStream(previewFile);
    stream.on("error", (err) => {
      this.logger.error(`Error serving preview: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to serve preview" });
      }
    });
    stream.pipe(res);
  }

  @Patch(":jobId/actions")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Persist studio action revisions for a job" })
  @ApiResponse({ status: 200, description: "Revisions saved" })
  @ApiResponse({ status: 400, description: "Invalid job or unauthorized" })
  async saveActions(
    @Req() req: { user: { userId: string } },
    @Param("jobId") jobId: string,
    @Body() dto: { studioEdits: Record<number, Array<Record<string, unknown>>> | null }
  ) {
    await this.studioService.saveActions(req.user.userId, jobId, dto.studioEdits as Record<number, StudioAction[]> | null);
    return { ok: true };
  }

  @Get(":jobId/project")
  @ApiOperation({ summary: "Get the persisted OpenReel project for a job" })
  @ApiResponse({ status: 200, description: "OpenReel project JSON (or null)" })
  @ApiResponse({ status: 400, description: "Invalid job or unauthorized" })
  async getProject(@Req() req: { user: { userId: string } }, @Param("jobId") jobId: string) {
    const project = await this.studioService.getProject(req.user.userId, jobId);
    return { project };
  }

  @Patch(":jobId/project")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Persist the OpenReel project for a job" })
  @ApiResponse({ status: 200, description: "Project saved" })
  @ApiResponse({ status: 400, description: "Invalid job or unauthorized" })
  async saveProject(
    @Req() req: { user: { userId: string } },
    @Param("jobId") jobId: string,
    @Body() dto: { project: Record<string, unknown> | null }
  ) {
    await this.studioService.saveProject(req.user.userId, jobId, dto.project ?? null);
    return { ok: true };
  }

  @Post(":jobId/source")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Prepare a downloadable source video for the OpenReel editor",
    description: "Downloads (and caches) the requested section of the source video and returns a signed URL the editor can import.",
  })
  @ApiResponse({ status: 200, description: "Signed source URL" })
  @ApiResponse({ status: 400, description: "Invalid job, range, or unauthorized" })
  async prepareSource(
    @Req() req: { user: { userId: string } },
    @Param("jobId") jobId: string,
    @Body() dto: { start: number; end: number; force?: boolean }
  ) {
    if (typeof dto.start !== "number" || typeof dto.end !== "number" || dto.end <= dto.start) {
      throw new BadRequestException("Valid start/end range required");
    }
    return this.studioService.prepareSource(req.user.userId, jobId, dto.start, dto.end, dto.force === true);
  }

  @Post(":jobId/clips")
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes("multipart/form-data")
  @ApiOperation({
    summary: "Upload an exported clip from the OpenReel editor",
    description: "Receives the exported video file and registers a Clip for the job.",
  })
  @ApiResponse({ status: 201, description: "Clip created" })
  @ApiResponse({ status: 400, description: "Invalid job, file, or unauthorized" })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: UPLOAD_MAX_SIZE_BYTES },
    })
  )
  async uploadClip(
    @Req() req: { user: { userId: string } },
    @Param("jobId") jobId: string,
    @UploadedFile() file: MulterFile | undefined,
    @Body() dto: { sceneIndex?: number; startTime?: number; endTime?: number; duration?: number; peakIntensity?: number }
  ) {
    if (!file) {
      throw new BadRequestException("No file provided");
    }
    const userId = req.user.userId;
    const canExport = await this.authService.checkCanExportClips(userId, 1);
    if (!canExport) {
      throw new ForbiddenException("Clip export limit reached. Upgrade your plan for more clips.");
    }
    const result = await this.studioService.saveExportedClip(userId, jobId, file, {
      sceneIndex: dto.sceneIndex,
      startTime: dto.startTime,
      endTime: dto.endTime,
      duration: dto.duration,
      fileSize: file.size,
      peakIntensity: dto.peakIntensity,
    });
    await this.authService.incrementClips(userId, 1);
    return result;
  }
}
