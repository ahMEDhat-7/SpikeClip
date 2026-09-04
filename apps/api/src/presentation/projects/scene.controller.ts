import { Controller, Get, Post, Put, Delete, Param, Body, Req, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { SceneService } from "./scene.service";

@ApiTags("Scenes")
@ApiBearerAuth()
@Controller("projects/:projectId/scenes")
export class SceneController {
  constructor(private readonly sceneService: SceneService) {}

  @Get()
  @ApiOperation({ summary: "List scenes for a project" })
  async list(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
  ) {
    return this.sceneService.list(req.user.userId, projectId);
  }

  @Get("source/:sourceId")
  @ApiOperation({ summary: "List scenes for a source" })
  async listBySource(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Param("sourceId") sourceId: string,
  ) {
    return this.sceneService.listBySource(req.user.userId, projectId, sourceId);
  }

  @Post("generate/:sourceId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Generate scenes from heatmap for a source", description: "Enqueues an async scene generation job. Poll GET /scenes/source/:sourceId to check status. SSE progress available at progress:scene:{sourceId}." })
  async generate(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Param("sourceId") sourceId: string,
  ) {
    return this.sceneService.generateScenes(req.user.userId, projectId, sourceId);
  }

  @Put(":sceneId")
  @ApiOperation({ summary: "Update scene (adjust times, change status)" })
  async update(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Param("sceneId") sceneId: string,
    @Body() body: { startTime?: number; endTime?: number; status?: string },
  ) {
    return this.sceneService.update(req.user.userId, projectId, sceneId, body);
  }

  @Delete(":sceneId")
  @ApiOperation({ summary: "Remove a scene" })
  async remove(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Param("sceneId") sceneId: string,
  ) {
    await this.sceneService.remove(req.user.userId, projectId, sceneId);
    return { message: "Scene removed" };
  }
}
