import { Injectable, Logger, Inject } from "@nestjs/common";
import { PrismaService } from "../infrastructure/database/prisma.service";
import { STORAGE_SERVICE, StorageService } from "../infrastructure/storage/storage.interface";
import { RedisService } from "../infrastructure/redis/redis.service";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    private readonly redis: RedisService
  ) {}

  async check() {
    const checks: Record<string, string> = {};

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch {
      this.logger.warn("Database health check failed");
      checks.database = "error";
    }

    // Redis check
    try {
      const result = await this.redis.ping();
      checks.redis = result === "PONG" ? "ok" : "error";
    } catch {
      this.logger.warn("Redis health check failed");
      checks.redis = "error";
    }

    // Storage check (MinIO or local)
    if (typeof this.storage.healthCheck === "function") {
      try {
        const result = await this.storage.healthCheck();
        checks.storage = result.status;
        if (result.message) {
          this.logger.warn(`Storage health: ${result.message}`);
        }
      } catch {
        this.logger.warn("Storage health check failed");
        checks.storage = "error";
      }
    } else {
      checks.storage = "unknown";
    }

    const allHealthy = Object.values(checks).every((s) => s === "ok" || s === "unknown");

    return {
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }
}
