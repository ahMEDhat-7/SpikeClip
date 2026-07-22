import { Controller, Post, Body, Param, UseGuards, Req, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../infrastructure/auth/jwt-auth.guard";
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

@ApiTags("studio")
@ApiBearerAuth()
@Controller("api/studio")
@UseGuards(JwtAuthGuard)
export class StudioController {
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
  async translatePrompt(@Req() req: { user: { sub: string } }, @Body() dto: TranslatePromptDto) {
    return this.studioService.translatePrompt(req.user.sub, dto);
  }

  @Post("preview")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Generate a preview video with applied actions" })
  @ApiResponse({ status: 202, description: "Preview generation started" })
  @ApiResponse({ status: 400, description: "Invalid actions or scene" })
  async generatePreview(@Req() req: { user: { sub: string } }, @Body() dto: GeneratePreviewDto) {
    return this.studioService.generatePreview(req.user.sub, dto);
  }

  @Post("preview/:jobId/:sceneIndex")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Generate preview for a specific job scene" })
  @ApiResponse({ status: 202, description: "Preview generation started" })
  @ApiResponse({ status: 404, description: "Job or scene not found" })
  async generatePreviewForScene(
    @Req() req: { user: { sub: string } },
    @Param("jobId") jobId: string,
    @Param("sceneIndex") sceneIndex: string,
    @Body() dto: Omit<GeneratePreviewDto, "sceneId">
  ) {
    return this.studioService.generatePreviewForScene(req.user.sub, jobId, parseInt(sceneIndex, 10), dto);
  }
}
