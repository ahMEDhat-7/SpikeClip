import { Controller, Get, Post, Delete, Param, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { Request } from "express";
import { YoutubeService } from "./youtube.service";

@ApiTags("YouTube")
@ApiBearerAuth()
@Controller("youtube")
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Get("status")
  @ApiOperation({ summary: "Get YouTube connection status" })
  async getStatus(@Req() req: Request & { user: { userId: string } }) {
    return this.youtubeService.getStatus(req.user.userId);
  }

  @Post("connect")
  @ApiOperation({ summary: "Connect YouTube account" })
  async connect(@Req() req: Request & { user: { userId: string } }) {
    return this.youtubeService.connect(req.user.userId);
  }

  @Get("channel")
  @ApiOperation({ summary: "Get YouTube channel overview" })
  async getChannel(@Req() req: Request & { user: { userId: string } }) {
    return this.youtubeService.getChannel(req.user.userId);
  }

  @Get("videos")
  @ApiOperation({ summary: "List YouTube videos" })
  async listVideos(
    @Req() req: Request & { user: { userId: string }; query: { max_results?: string; page_token?: string } },
  ) {
    return this.youtubeService.listVideos(req.user.userId, {
      maxResults: req.query.max_results ? parseInt(req.query.max_results, 10) : undefined,
      pageToken: req.query.page_token,
    });
  }

  @Get("videos/:videoId")
  @ApiOperation({ summary: "Get YouTube video details" })
  async getVideo(
    @Req() req: Request & { user: { userId: string } },
    @Param("videoId") videoId: string,
  ) {
    return this.youtubeService.getVideo(req.user.userId, videoId);
  }

  @Post("sync/:connectionId")
  @ApiOperation({ summary: "Sync YouTube channel data" })
  async sync(
    @Req() req: Request & { user: { userId: string } },
    @Param("connectionId") connectionId: string,
  ) {
    return this.youtubeService.sync(req.user.userId, connectionId);
  }

  @Delete("disconnect/:connectionId")
  @ApiOperation({ summary: "Disconnect YouTube account" })
  async disconnect(
    @Req() req: Request & { user: { userId: string } },
    @Param("connectionId") connectionId: string,
  ) {
    await this.youtubeService.disconnect(req.user.userId, connectionId);
    return { message: "Disconnected successfully" };
  }
}
