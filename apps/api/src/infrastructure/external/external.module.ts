import { Module } from "@nestjs/common";
import { FfmpegService } from "./ffmpeg.service";
import { BullMQQueueService } from "./queue.service";
import { YtdlpService } from "./ytdlp.service";
import { PromptTranslationService } from "./prompt-translation.service";
import { FilterGraphBuilder } from "./filter-graph-builder";
import { QUEUE_SERVICE } from "../../domain/services/queue";

export const FFMPEG_SERVICE = "FFMPEG_SERVICE";

@Module({
  providers: [
    { provide: FFMPEG_SERVICE, useClass: FfmpegService },
    { provide: QUEUE_SERVICE, useClass: BullMQQueueService },
    YtdlpService,
    PromptTranslationService,
    FilterGraphBuilder,
  ],
  exports: [FFMPEG_SERVICE, QUEUE_SERVICE, YtdlpService, PromptTranslationService, FilterGraphBuilder],
})
export class ExternalModule {}
