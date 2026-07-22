import { Module } from "@nestjs/common";
import { StudioController } from "./studio.controller";
import { StudioService } from "./studio.service";
import { ExternalModule } from "../../infrastructure/external/external.module";
import { PrismaModule } from "../../infrastructure/database/prisma.module";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { JOB_REPOSITORY } from "../../domain/repositories/job.repository";
import { PrismaJobRepository } from "../../infrastructure/database/repositories/prisma-job.repository";
import { CLIP_REPOSITORY } from "../../domain/repositories/clip.repository";
import { PrismaClipRepository } from "../../infrastructure/database/repositories/prisma-clip.repository";

@Module({
  imports: [ExternalModule, PrismaModule, RedisModule],
  controllers: [StudioController],
  providers: [
    StudioService,
    {
      provide: JOB_REPOSITORY,
      useClass: PrismaJobRepository,
    },
    {
      provide: CLIP_REPOSITORY,
      useClass: PrismaClipRepository,
    },
  ],
  exports: [StudioService],
})
export class StudioModule {}
