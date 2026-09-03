import Redis from "ioredis";
import { Logger } from "@nestjs/common";

const logger = new Logger("ProgressSubscriber");

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

export interface ProgressEvent {
  jobId: string;
  clipId?: string;
  progress: number;
  step: string;
}

export function subscribeToJobProgress(
  jobId: string,
  onEvent: (event: ProgressEvent) => void,
  onError?: (err: Error) => void
): { unsubscribe: () => void } {
  const subscriber = createRedisConnection();
  const channel = `progress:${jobId}`;

  subscriber.subscribe(channel, (err) => {
    if (err) {
      logger.warn(`Failed to subscribe to ${channel}: ${err.message}`);
      onError?.(err);
    }
  });

  subscriber.on("message", (_ch, message) => {
    try {
      const event = JSON.parse(message) as ProgressEvent;
      onEvent(event);
    } catch {
      // Ignore malformed messages
    }
  });

  subscriber.on("error", (err) => {
    logger.warn(`Subscriber error for ${channel}: ${err.message}`);
    onError?.(err);
  });

  return {
    unsubscribe: () => {
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
    },
  };
}
