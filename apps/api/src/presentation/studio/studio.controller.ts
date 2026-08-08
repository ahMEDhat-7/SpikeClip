import {
  Controller,
  Post,
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
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { Response } from "express";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { StudioService } from "./studio.service";

interface TranslatePromptDto {
  prompt: string;
  sceneStart: number;
  sceneEnd: number;
  platform: string;
}

interface GeneratePreviewDto {
  sceneId: string;
  actions: Array<Record<string, unknown>>;
  platform: string;
}

const PREVIEW_TMP = "/tmp/spikeclips-preview";

@ApiTags("studio")
@ApiBearerAuth()
@Controller("studio")
export class StudioController {
  private readonly logger = new Logger(StudioController.name);

  constructor(private readonly studioService: StudioService) {}

  @Post("translate")
  @HttpCode(HttpStatus.OK)
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
        platform: { type: "string", enum: ["youtube_shorts", "instagram_reels", "tiktok"], example: "youtube_shorts" },
      },
    },
  })
  async translatePrompt(@Req() req: { user: { userId: string } }, @Body() dto: TranslatePromptDto) {
    return this.studioService.translatePrompt(req.user.userId, dto);
  }

  @Post("preview")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Generate a preview video with applied actions" })
  @ApiResponse({ status: 202, description: "Preview generation started" })
  @ApiResponse({ status: 400, description: "Invalid actions or scene" })
  async generatePreview(@Req() req: { user: { userId: string } }, @Body() dto: GeneratePreviewDto) {
    return this.studioService.generatePreview(req.user.userId, dto);
  }

  @Post("preview/:jobId/:sceneIndex")
  @HttpCode(HttpStatus.ACCEPTED)
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
    @Req() req: { user?: { userId?: string } },
    @Param("jobId") jobId: string,
    @Param("sceneIndex") sceneIndex: string,
    @Res() res: Response
  ) {
    const previewFile = join(PREVIEW_TMP, `${jobId}-${sceneIndex}-preview.mp4`);

    if (!existsSync(previewFile)) {
      throw new NotFoundException("Preview file not found. Generate a preview first.");
    }

    res.set({
      "Content-Type": "video/mp4",
      "Cache-Control": "private, max-age=3600",
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
}
