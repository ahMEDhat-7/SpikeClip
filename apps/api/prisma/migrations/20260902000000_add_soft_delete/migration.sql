-- AlterTable
ALTER TABLE "Job" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Clip" ADD COLUMN "deletedAt" TIMESTAMP(3);
