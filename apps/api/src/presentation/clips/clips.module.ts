import { Module } from "@nestjs/common";
import { ClipsController } from "./clips.controller";
import { StorageModule } from "../../infrastructure/storage/storage.module";
import { PrismaModule } from "../../infrastructure/database/prisma.module";
import { CLIP_REPOSITORY } from "../../domain/repositories/clip.repository";
import { JOB_REPOSITORY } from "../../domain/repositories/job.repository";
import { PrismaClipRepository } from "../../infrastructure/database/repositories/prisma-clip.repository";
import { PrismaJobRepository } from "../../infrastructure/database/repositories/prisma-job.repository";

@Module({
  imports: [StorageModule, PrismaModule],
  controllers: [ClipsController],
  providers: [
    {
      provide: CLIP_REPOSITORY,
      useClass: PrismaClipRepository,
    },
    {
      provide: JOB_REPOSITORY,
      useClass: PrismaJobRepository,
    },
  ],
  exports: [CLIP_REPOSITORY],
})
export class ClipsModule {}
