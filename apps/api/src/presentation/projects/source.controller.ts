import { Controller, Get, Post, Delete, Param, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { SourceService } from "./source.service";

@ApiTags("Sources")
@ApiBearerAuth()
@Controller("projects/:projectId/sources")
export class SourceController {
  constructor(private readonly sourceService: SourceService) {}

  @Get()
  @ApiOperation({ summary: "List sources for a project" })
  async list(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
  ) {
    return this.sourceService.list(req.user.userId, projectId);
  }

  @Post(":videoId")
  @ApiOperation({ summary: "Add a YouTube video as a source" })
  async add(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Param("videoId") videoId: string,
  ) {
    return this.sourceService.add(req.user.userId, projectId, videoId);
  }

  @Delete(":sourceId")
  @ApiOperation({ summary: "Remove a source" })
  async remove(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Param("sourceId") sourceId: string,
  ) {
    await this.sourceService.remove(req.user.userId, projectId, sourceId);
    return { message: "Source removed" };
  }
}
