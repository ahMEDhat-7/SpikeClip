import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Queue, Worker, Job } from "bullmq";
import { QueueService, ExportJobConfig } from "../../domain/services/queue";

const connectionOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

@Injectable()
export class BullMQQueueService implements QueueService, OnModuleDestroy {
  private readonly logger = new Logger(BullMQQueueService.name);
  private readonly analysisQueue: Queue;
  private readonly exportQueue: Queue;
  private readonly sourceQueue: Queue;

  constructor() {
    this.analysisQueue = new Queue("analysis", { connection: connectionOptions });
    this.exportQueue = new Queue("export", { connection: connectionOptions });
    this.sourceQueue = new Queue("source", { connection: connectionOptions });
    this.logger.log("Queues initialized");
  }

  async addAnalysisJob(
    jobId: string,
    data: { url: string; userId: string }
  ): Promise<void> {
    await this.analysisQueue.add("process", { ...data, jobId }, {
      jobId,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });
  }

  async addExportJob(
    jobId: string,
    data: ExportJobConfig,
    dependsOn?: string
  ): Promise<void> {
    const opts: Record<string, unknown> = {
      jobId: `export-${jobId}-${data.sceneIndex}-${randomUUID().slice(0, 8)}`,
      attempts: 2,
      backoff: { type: "exponential", delay: 10000 },
    };
    if (dependsOn) {
      opts.dependencies = [dependsOn];
    }
    await this.exportQueue.add("export-clip", { ...data, jobId }, opts);
  }

  async addSourceJob(
    jobId: string,
    data: { userId: string; start: number; end: number }
  ): Promise<string> {
    const bullJobId = `source-${jobId}`;
    await this.sourceQueue.add("prepare-source", { ...data, jobId }, {
      jobId: bullJobId,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });
    return bullJobId;
  }

  createWorker(
    queueName: string,
    processor: (jobData: Record<string, unknown>) => Promise<void>
  ): Worker {
    const worker = new Worker(
      queueName,
      async (job) => {
        this.logger.log(`Processing ${queueName} job ${job.id}`);
        await processor(job.data);
        this.logger.log(`Completed ${queueName} job ${job.id}`);
      },
      { connection: connectionOptions }
    );

    worker.on("failed", (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    return worker;
  }

  async onModuleDestroy() {
    try {
      await this.analysisQueue.close();
    } catch (err) {
      this.logger.error(`Failed to close analysis queue: ${err}`);
    }
    try {
      await this.exportQueue.close();
    } catch (err) {
      this.logger.error(`Failed to close export queue: ${err}`);
    }
    try {
      await this.sourceQueue.close();
    } catch (err) {
      this.logger.error(`Failed to close source queue: ${err}`);
    }
  }
}
