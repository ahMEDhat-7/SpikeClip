import { Module } from "@nestjs/common";
import { YoutubeDirectApiService } from "./youtube-direct-api.service";
import { AuthTokenVaultService } from "./auth-token-vault.service";
import { YouTubeQuotaGuard } from "./youtube-quota-guard.service";
import { YOUTUBE_STUDIO_PROVIDER } from "../../domain/ports/youtube-studio.provider";

@Module({
  providers: [
    AuthTokenVaultService,
    YouTubeQuotaGuard,
    {
      provide: YOUTUBE_STUDIO_PROVIDER,
      useClass: YoutubeDirectApiService,
    },
  ],
  exports: [YOUTUBE_STUDIO_PROVIDER, AuthTokenVaultService, YouTubeQuotaGuard],
})
export class YoutubeModule {}
