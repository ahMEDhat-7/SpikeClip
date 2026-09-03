import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import cookieParser = require("cookie-parser");
import helmet from "helmet";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./presentation/filters/exception.filter";
import { LoggingInterceptor } from "./presentation/interceptors/logging.interceptor";
import { SentryModule } from "./infrastructure/sentry/sentry.module";
import { startWorkers, stopWorkers } from "./infrastructure/workers";
import { PrismaService } from "./infrastructure/database/prisma.service";
import { AuthService } from "./infrastructure/auth/auth.service";
import { FFMPEG_SERVICE } from "./infrastructure/external/external.module";

const logger = new Logger("Bootstrap");

async function bootstrap() {
  if (process.env.SENTRY_DSN) {
    await SentryModule.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    });
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  });

  const config = new DocumentBuilder()
    .setTitle("Clutch API")
    .setDescription(
      "YouTube heatmap-driven clip extraction API. " +
        "Analyze viewer engagement data to find the most-replayed moments in videos."
    )
    .setVersion("0.1.0")
    .addTag("Health", "API health checks")
    .addTag("Auth", "User authentication and registration")
    .addTag("Jobs", "Video analysis jobs — create, process, export clips")
    .addTag("Clips", "Clip download and management")
    .addTag("Music", "Background music upload and management")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  if (process.env.NODE_ENV?.toLowerCase() !== "production") {
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = process.env.PORT || 3001;
  const host = process.env.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0";
  await app.listen(port, host);
  logger.log(`API running on http://${host}:${port}`);
  if (process.env.NODE_ENV?.toLowerCase() !== "production") {
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }

  try {
    const prisma = app.get(PrismaService);
    const authService = app.get(AuthService);
    const storage = app.get("STORAGE_SERVICE");
    const ffmpeg = app.get(FFMPEG_SERVICE);
    startWorkers(prisma, authService, storage, ffmpeg);
  } catch (err) {
    logger.warn(`Failed to start workers (Redis may be unavailable): ${err instanceof Error ? err.message : err}`);
  }
}

process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on("uncaughtException", (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, err.stack);
  process.exit(1);
});

process.on("SIGTERM", async () => {
  await stopWorkers();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await stopWorkers();
  process.exit(0);
});

bootstrap();
