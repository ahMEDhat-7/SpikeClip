import { Module } from "@nestjs/common";
import { StudioController } from "./studio.controller";
import { StudioService } from "./studio.service";
import { ExternalModule } from "../../infrastructure/external/external.module";
import { PrismaModule } from "../../infrastructure/database/prisma.module";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { StorageModule } from "../../infrastructure/storage/storage.module";
import { JOB_REPOSITORY } from "../../domain/repositories/job.repository";
import { PrismaJobRepository } from "../../infrastructure/database/repositories/prisma-job.repository";

@Module({
  imports: [ExternalModule, PrismaModule, RedisModule, StorageModule],
  controllers: [StudioController],
  providers: [
    StudioService,
    {
      provide: JOB_REPOSITORY,
      useClass: PrismaJobRepository,
    },
  ],
  exports: [StudioService],
})
export class StudioModule {}
