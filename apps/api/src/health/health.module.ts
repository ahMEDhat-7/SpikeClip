import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { PrismaModule } from "../infrastructure/database/prisma.module";
import { StorageModule } from "../infrastructure/storage/storage.module";
import { RedisModule } from "../infrastructure/redis/redis.module";

@Module({
  imports: [PrismaModule, StorageModule, RedisModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
