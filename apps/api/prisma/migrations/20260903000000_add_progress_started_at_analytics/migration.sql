-- AlterTable: Add progress, startedAt to Job and Clip; add analytics to User
ALTER TABLE "jobs" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "jobs" ADD COLUMN "startedAt" TIMESTAMP(3);

ALTER TABLE "clips" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "clips" ADD COLUMN "startedAt" TIMESTAMP(3);

ALTER TABLE "users" ADD COLUMN "totalExports" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "totalProcessingTimeMs" DOUBLE PRECISION NOT NULL DEFAULT 0;
