import { Controller, Get, Post, Delete, Param, Req, Body, Res, UseInterceptors, UploadedFile } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request, Response } from "express";
import { ClipService } from "./clip.service";
import { ProjectExportService } from "../../application/services/project-export.service";

const UPLOAD_MAX_SIZE_BYTES = 500 * 1024 * 1024;

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@ApiTags("Clips")
@ApiBearerAuth()
@Controller("projects/:projectId/clips")
export class ClipController {
  constructor(
    private readonly clipService: ClipService,
    private readonly projectExportService: ProjectExportService,
  ) {}

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

  @Post("export")
  @ApiOperation({ summary: "Export selected scenes as clips" })
  async exportClips(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Body() body: { sceneIds: string[]; platform?: string; quality?: string; format?: string },
  ) {
    return this.projectExportService.exportClips(
      req.user.userId,
      projectId,
      body.sceneIds,
      { platform: body.platform, quality: body.quality, format: body.format },
    );
  }

  @Post("editor-source")
  @ApiOperation({ summary: "Prepare source video for the editor (downloads section, returns signed URL)" })
  async prepareEditorSource(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Body() body: { sourceId: string; startTime: number; endTime: number },
  ) {
    return this.clipService.prepareEditorSource(req.user.userId, projectId, body);
  }

  @Post("editor-export")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: UPLOAD_MAX_SIZE_BYTES } }))
  @ApiOperation({ summary: "Save an exported clip from the editor" })
  async exportEditorClip(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @UploadedFile() file: MulterFile | undefined,
    @Body() body: { startTime?: string; endTime?: string; platform?: string; duration?: string; peakIntensity?: string },
  ) {
    if (!file) {
      return { error: "No file provided" };
    }
    return this.clipService.exportEditorClip(req.user.userId, projectId, file, body);
  }

  @Get(":clipId/download")
  @ApiOperation({ summary: "Download a clip" })
  async download(
    @Req() req: Request & { user: { userId: string } },
    @Param("projectId") projectId: string,
    @Param("clipId") clipId: string,
    @Res() res: Response,
  ) {
    const clip = await this.clipService.get(req.user.userId, projectId, clipId);
    if (!clip.fileUrl) {
      res.status(404).json({ message: "Clip is not ready for download" });
      return;
    }
    const signedUrl = await this.clipService.getSignedDownloadUrl(clip.fileUrl);
    res.redirect(signedUrl);
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
