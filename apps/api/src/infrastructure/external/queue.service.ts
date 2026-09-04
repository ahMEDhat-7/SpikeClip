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

const JOB_CLEANUP = {
  removeOnComplete: { age: 3600, count: 100 },
  removeOnFail: { age: 86400, count: 50 },
};

@Injectable()
export class BullMQQueueService implements QueueService, OnModuleDestroy {
  private readonly logger = new Logger(BullMQQueueService.name);
  private readonly analysisQueue: Queue;
  private readonly exportQueue: Queue;
  private readonly sourceQueue: Queue;
  private readonly sceneGenerationQueue: Queue;

  constructor() {
    this.analysisQueue = new Queue("analysis", { connection: connectionOptions });
    this.exportQueue = new Queue("export", { connection: connectionOptions });
    this.sourceQueue = new Queue("source", { connection: connectionOptions });
    this.sceneGenerationQueue = new Queue("scene-generation", { connection: connectionOptions });
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
      ...JOB_CLEANUP,
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
      ...JOB_CLEANUP,
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
      ...JOB_CLEANUP,
    });
    return bullJobId;
  }

  async addSceneGenerationJob(
    data: { sourceId: string; projectId: string; userId: string }
  ): Promise<string> {
    const bullJobId = `scene-${data.sourceId}-${randomUUID().slice(0, 8)}`;
    await this.sceneGenerationQueue.add("generate-scenes", data, {
      jobId: bullJobId,
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      ...JOB_CLEANUP,
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

  async getJobCounts(): Promise<{
    analysis: { waiting: number; active: number; completed: number; failed: number };
    export: { waiting: number; active: number; completed: number; failed: number };
    source: { waiting: number; active: number; completed: number; failed: number };
  }> {
    const [analysis, exp, source] = await Promise.all([
      this.analysisQueue.getJobCounts("waiting", "active", "completed", "failed"),
      this.exportQueue.getJobCounts("waiting", "active", "completed", "failed"),
      this.sourceQueue.getJobCounts("waiting", "active", "completed", "failed"),
    ]);
    return {
      analysis: analysis as any,
      export: exp as any,
      source: source as any,
    };
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
    try {
      await this.sceneGenerationQueue.close();
    } catch (err) {
      this.logger.error(`Failed to close scene generation queue: ${err}`);
    }
  }
}
