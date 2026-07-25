import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
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
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { ClipResponseDto } from "./dto/clip-response.dto";
import { STORAGE_SERVICE, StorageService } from "../../infrastructure/storage/storage.interface";
import { LocalStorageService } from "../../infrastructure/storage/local-storage.service";
import { toClipResponse } from "../../application/mappers/clip.mapper";

import { Public } from "../../infrastructure/auth/jwt-auth.guard";

@ApiTags("Clips")
@Controller("clips")
export class ClipsController {
  private readonly logger = new Logger(ClipsController.name);

  constructor(
    private readonly prisma: PrismaService,
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
    const job = await this.prisma.job.findUnique({ where: { id: jobId }, select: { userId: true } });
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    if (job.userId !== req.user?.userId) throw new ForbiddenException("Job does not belong to you");

    const clips = await this.prisma.clip.findMany({
      where: { jobId },
      orderBy: { sceneIndex: "asc" },
    });

    return clips.map(toClipResponse);
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
    const clip = await this.prisma.clip.findUnique({ where: { id } });
    if (!clip) {
      throw new NotFoundException(`Clip ${id} not found`);
    }

    const job = await this.prisma.job.findUnique({ where: { id: clip.jobId }, select: { userId: true } });
    if (!job || job.userId !== req.user?.userId) {
      throw new ForbiddenException("Clip does not belong to you");
    }

    const user = await this.prisma.user.findUnique({ where: { id: req.user?.userId }, select: { plan: true } });
    if (!user || user.plan === "free") {
      throw new ForbiddenException("Pro or Team plan required to download clips");
    }

    if (clip.status !== "completed" || !clip.fileUrl) {
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
      const mimeMap: Record<string, string> = {
        mp4: "video/mp4",
        webm: "video/webm",
        mp3: "audio/mpeg",
        wav: "audio/wav",
        ogg: "audio/ogg",
        m4a: "audio/mp4",
      };
      const contentType = mimeMap[ext] || "application/octet-stream";
      const isAudio = ["mp3", "wav", "ogg", "m4a"].includes(ext);
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
