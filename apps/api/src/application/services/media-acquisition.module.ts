import { Module } from "@nestjs/common";
import { YoutubeMediaService } from "./media-acquisition.service";
import { YoutubeModule } from "../../infrastructure/youtube/youtube.module";
import { StorageModule } from "../../infrastructure/storage/storage.module";
import { PrismaProjectSourceRepository } from "../../infrastructure/database/repositories/prisma-project-source.repository";
import { PROJECT_SOURCE_REPOSITORY } from "../../domain/repositories/project-source.repository";

@Module({
  imports: [YoutubeModule, StorageModule],
  providers: [
    YoutubeMediaService,
    {
      provide: PROJECT_SOURCE_REPOSITORY,
      useClass: PrismaProjectSourceRepository,
    },
  ],
  exports: [YoutubeMediaService],
})
export class MediaAcquisitionModule {}
