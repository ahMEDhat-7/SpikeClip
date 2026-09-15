import { Controller, Get, Post, Put, Delete, Param, Body, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { ProjectService } from "./project.service";

@ApiTags("Projects")
@ApiBearerAuth()
@Controller("projects")
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @ApiOperation({ summary: "List all projects" })
  async list(@Req() req: Request & { user: { userId: string } }) {
    return this.projectService.list(req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: "Create a new project" })
  async create(
    @Req() req: Request & { user: { userId: string } },
    @Body() body: { name: string; description?: string; youtubeConnectionId?: string },
  ) {
    return this.projectService.create(req.user.userId, body);
  }

  @Get(":projectId")
  @ApiOperation({ summary: "Get project details" })
  async get(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
  ) {
    return this.projectService.get(req.user.userId, projectId);
  }

  @Put(":projectId")
  @ApiOperation({ summary: "Update project" })
  async update(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.projectService.update(req.user.userId, projectId, body);
  }

  @Delete(":projectId")
  @ApiOperation({ summary: "Delete project" })
  async remove(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
  ) {
    await this.projectService.remove(req.user.userId, projectId);
    return { message: "Project deleted" };
  }

  @Get(":projectId/details")
  @ApiOperation({ summary: "Get project with sources, scenes, and clips" })
  async getDetails(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
  ) {
    return this.projectService.getWithDetails(req.user.userId, projectId);
  }
}
