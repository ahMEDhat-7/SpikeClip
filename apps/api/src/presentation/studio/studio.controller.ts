import { Controller, Post, Body, Param, UseGuards, Req, HttpCode, HttpStatus } from "@nestjs/common";
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

@Controller("api/studio")
@UseGuards(JwtAuthGuard)
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  @Post("translate")
  @HttpCode(HttpStatus.OK)
  async translatePrompt(@Req() req: { user: { sub: string } }, @Body() dto: TranslatePromptDto) {
    return this.studioService.translatePrompt(req.user.sub, dto);
  }

  @Post("preview")
  @HttpCode(HttpStatus.ACCEPTED)
  async generatePreview(@Req() req: { user: { sub: string } }, @Body() dto: GeneratePreviewDto) {
    return this.studioService.generatePreview(req.user.sub, dto);
  }

  @Post("preview/:jobId/:sceneIndex")
  @HttpCode(HttpStatus.ACCEPTED)
  async generatePreviewForScene(
    @Req() req: { user: { sub: string } },
    @Param("jobId") jobId: string,
    @Param("sceneIndex") sceneIndex: string,
    @Body() dto: Omit<GeneratePreviewDto, "sceneId">
  ) {
    return this.studioService.generatePreviewForScene(req.user.sub, jobId, parseInt(sceneIndex, 10), dto);
  }
}
