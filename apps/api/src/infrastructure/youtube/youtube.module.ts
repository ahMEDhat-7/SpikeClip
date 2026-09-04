import { Module } from "@nestjs/common";
import { McpClient } from "./mcp-client";
import { YoutubeStudioMcpService } from "./youtube-studio-mcp.service";
import { YOUTUBE_STUDIO_PROVIDER } from "../../domain/ports/youtube-studio.provider";

@Module({
  providers: [
    McpClient,
    {
      provide: YOUTUBE_STUDIO_PROVIDER,
      useClass: YoutubeStudioMcpService,
    },
  ],
  exports: [YOUTUBE_STUDIO_PROVIDER, McpClient],
})
export class YoutubeModule {}
