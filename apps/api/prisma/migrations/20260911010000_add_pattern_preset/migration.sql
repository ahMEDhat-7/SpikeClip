-- CreateTable: PatternPreset
CREATE TABLE "PatternPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "studioActionTemplate" JSONB NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'curated',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "avgPerformanceScore DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatternPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatternPreset_genre_idx" ON "PatternPreset"("genre");
