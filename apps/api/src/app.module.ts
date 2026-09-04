import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./infrastructure/database/prisma.module";
import { AppConfigModule } from "./infrastructure/config/config.module";
import { JobsModule } from "./presentation/jobs/jobs.module";
import { ClipsModule } from "./presentation/clips/clips.module";
import { StorageModule } from "./infrastructure/storage/storage.module";
import { AuthModule } from "./infrastructure/auth/auth.module";
import { MusicModule } from "./presentation/music/music.module";
import { ExternalModule } from "./infrastructure/external/external.module";
import { SentryModule } from "./infrastructure/sentry/sentry.module";
import { PaymentsModule } from "./presentation/payments/payments.module";
import { StudioModule } from "./presentation/studio/studio.module";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { YoutubePresentationModule } from "./presentation/youtube/youtube.module";
import { ProjectsModule } from "./presentation/projects/projects.module";
import { JwtAuthGuard } from "./infrastructure/auth/jwt-auth.guard";
import { RolesGuard } from "./infrastructure/auth/roles.guard";
import { ThrottlerGuard } from "@nestjs/throttler";

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    JobsModule,
    ClipsModule,
    StorageModule,
    MusicModule,
    ExternalModule,
    PaymentsModule,
    StudioModule,
    YoutubePresentationModule,
    ProjectsModule,
    RedisModule,
    SentryModule.forRoot({
      dsn: process.env.SENTRY_DSN || "",
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    }),
    ThrottlerModule.forRoot([
      {
        name: "global",
        ttl: 60_000,
        limit: 100,
      },
      {
        name: "auth",
        ttl: 60_000,
        limit: 20,
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
