import { Module } from "@nestjs/common";
import { JobsController } from "./jobs.controller";
import { CreateJobUseCase } from "../../application/use-cases/create-job.use-case";
import { ExportClipsUseCase } from "../../application/use-cases/export-clips.use-case";
import { JOB_REPOSITORY } from "../../domain/repositories/job.repository";
import { PrismaJobRepository } from "../../infrastructure/database/repositories/prisma-job.repository";
import { VIDEO_EXTRACTOR } from "../../domain/services/video-extractor";
import { YtdlpService } from "../../infrastructure/external/ytdlp.service";
import { QUEUE_SERVICE } from "../../domain/services/queue";
import { BullMQQueueService } from "../../infrastructure/external/queue.service";
import { StorageModule } from "../../infrastructure/storage/storage.module";
import { PrismaModule } from "../../infrastructure/database/prisma.module";
import { AuthModule } from "../../infrastructure/auth/auth.module";

@Module({
  imports: [StorageModule, PrismaModule, AuthModule],
  controllers: [JobsController],
  providers: [
    CreateJobUseCase,
    ExportClipsUseCase,
    {
      provide: JOB_REPOSITORY,
      useClass: PrismaJobRepository,
    },
    {
      provide: VIDEO_EXTRACTOR,
      useClass: YtdlpService,
    },
    {
      provide: QUEUE_SERVICE,
      useClass: BullMQQueueService,
    },
  ],
  exports: [CreateJobUseCase, ExportClipsUseCase],
})
export class JobsModule {}
