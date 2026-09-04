import { Module } from "@nestjs/common";
import { YoutubeController } from "./youtube.controller";
import { YoutubeService } from "./youtube.service";
import { YoutubeModule } from "../../infrastructure/youtube/youtube.module";
import { PrismaYoutubeConnectionRepository } from "../../infrastructure/database/repositories/prisma-youtube-connection.repository";
import { YOUTUBE_CONNECTION_REPOSITORY } from "../../domain/repositories/youtube-connection.repository";

@Module({
  imports: [YoutubeModule],
  controllers: [YoutubeController],
  providers: [
    YoutubeService,
    {
      provide: YOUTUBE_CONNECTION_REPOSITORY,
      useClass: PrismaYoutubeConnectionRepository,
    },
  ],
  exports: [YoutubeService],
})
export class YoutubePresentationModule {}
