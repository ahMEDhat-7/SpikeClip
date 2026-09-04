import { Controller, Get, Delete, Param, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { ClipService } from "./clip.service";

@ApiTags("Clips")
@ApiBearerAuth()
@Controller("projects/:projectId/clips")
export class ClipController {
  constructor(private readonly clipService: ClipService) {}

  @Get()
  @ApiOperation({ summary: "List clips for a project" })
  async list(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
  ) {
    return this.clipService.list(req.user.userId, projectId);
  }

  @Get("scene/:sceneId")
  @ApiOperation({ summary: "List clips for a scene" })
  async listByScene(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Param("sceneId") sceneId: string,
  ) {
    return this.clipService.listByScene(req.user.userId, projectId, sceneId);
  }

  @Get(":clipId")
  @ApiOperation({ summary: "Get clip details" })
  async get(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Param("clipId") clipId: string,
  ) {
    return this.clipService.get(req.user.userId, projectId, clipId);
  }

  @Delete(":clipId")
  @ApiOperation({ summary: "Remove a clip" })
  async remove(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Param("clipId") clipId: string,
  ) {
    await this.clipService.remove(req.user.userId, projectId, clipId);
    return { message: "Clip removed" };
  }
}
