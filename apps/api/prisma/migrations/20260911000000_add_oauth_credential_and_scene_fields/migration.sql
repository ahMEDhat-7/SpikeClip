-- AlterTable: Update YoutubeConnection provider default
ALTER TABLE "YoutubeConnection" ALTER COLUMN "provider" SET DEFAULT 'youtube-data-api';

-- AlterTable: Add storageKey, mediaStatus, errorMessage to ProjectScene
ALTER TABLE "ProjectScene" ADD COLUMN "storageKey" TEXT;
ALTER TABLE "ProjectScene" ADD COLUMN "mediaStatus" TEXT NOT NULL DEFAULT 'not_downloaded';
ALTER TABLE "ProjectScene" ADD COLUMN "errorMessage" TEXT;

-- AlterTable: Change ProjectScene status default
ALTER TABLE "ProjectScene" ALTER COLUMN "status" SET DEFAULT 'selected';

-- CreateTable: OAuthCredential
CREATE TABLE "OAuthCredential" (
    "id" TEXT NOT NULL,
    "youtubeConnectionId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "kmsKeyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on OAuthCredential.youtubeConnectionId
CREATE UNIQUE INDEX "OAuthCredential_youtubeConnectionId_key" ON "OAuthCredential"("youtubeConnectionId");

-- AddForeignKey
ALTER TABLE "OAuthCredential" ADD CONSTRAINT "OAuthCredential_youtubeConnectionId_fkey" FOREIGN KEY ("youtubeConnectionId") REFERENCES "YoutubeConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
