import Redis from "ioredis";
import { Logger } from "@nestjs/common";

const logger = new Logger("ProgressPublisher");

export interface ProgressEvent {
  jobId: string;
  clipId?: string;
  progress: number;
  step: string;
}

function createRedisConnection(): Redis {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }
  return new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });
}

let publisher: Redis | null = null;

function getPublisher(): Redis {
  if (!publisher) {
    publisher = createRedisConnection();
    publisher.on("error", (err) => {
      logger.warn(`Progress publisher Redis error: ${err.message}`);
    });
  }
  return publisher;
}

export function publishProgress(channel: string, event: ProgressEvent): void {
  try {
    getPublisher().publish(channel, JSON.stringify(event));
  } catch (err) {
    logger.warn(`Failed to publish progress: ${err}`);
  }
}

export function publishJobProgress(jobId: string, progress: number, step: string): void {
  publishProgress(`progress:${jobId}`, { jobId, progress, step });
}

export function publishClipProgress(jobId: string, clipId: string, progress: number, step: string): void {
  publishProgress(`progress:${jobId}`, { jobId, clipId, progress, step });
}

export async function closeProgressPublisher(): Promise<void> {
  if (publisher) {
    await publisher.quit().catch(() => {});
    publisher = null;
  }
}
