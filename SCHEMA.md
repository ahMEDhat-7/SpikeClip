# Database Schema

PostgreSQL 18 with Prisma ORM.

## User

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `email` | String | Google OAuth email |
| `name` | String? | Display name |
| `oauthProvider` | String | OAuth provider (`google`) |
| `oauthProviderId` | String | Google OAuth subject ID |
| `plan` | String | `free` / `pro` / `team` (default: `free`) |
| `stripeCustomerId` | String? | Stripe customer ID |
| `analysesUsed` | Int | Current period usage (default: 0) |
| `analysesLimit` | Int | Monthly limit (default: 3) |
| `scenesLimit` | Int | Max scenes per analysis (default: 3) |
| `clipsUsed` | Int | Clips exported this period (default: 0) |
| `clipsLimit` | Int | Max clips per analysis (default: 2) |
| `analysesResetAt` | DateTime? | Monthly reset timestamp |
| `totalExports` | Int | Lifetime exports (default: 0) |
| `totalProcessingTimeMs` | Float | Total processing time (default: 0) |
| `createdAt` | DateTime | Account creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |
| `jobs` | Job[] | User's analysis jobs |
| `youtubeConnections` | YoutubeConnection[] | Connected YouTube accounts |
| `projects` | Project[] | User's projects |

**Relations:**
- `jobs` → Job[] (one-to-many)
- `youtubeConnections` → YoutubeConnection[] (one-to-many)
- `projects` → Project[] (one-to-many)

## Job

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `userId` | String | FK → User.id |
| `url` | String | YouTube URL |
| `videoTitle` | String? | Extracted video title |
| `videoThumbnail` | String? | Thumbnail URL |
| `videoDuration` | Float? | Duration in seconds |
| `videoViewCount` | Int? | View count from YouTube |
| `videoUploadDate` | String? | Upload date (YYYYMMDD format) |
| `videoChannelName` | String? | Channel name |
| `status` | String | `pending` / `processing` / `completed` / `failed` |
| `progress` | Int | Progress percentage (default: 0) |
| `scenes` | Json? | `ScoredBlock[]` from algorithm |
| `heatmapData` | Json? | `HeatmapSpike[]` from yt-dlp |
| `studioEdits` | Json? | Legacy StudioAction[] for prompt translation |
| `project` | Json? | Legacy OpenReel project JSON |
| `sourceKey` | String? | Storage key for shared source media |
| `sourceStart` | Float? | Source video start time |
| `errorMessage` | String? | Error details on failure |
| `createdAt` | DateTime | Job creation timestamp |
| `startedAt` | DateTime? | Processing start timestamp |
| `completedAt` | DateTime? | Completion timestamp |
| `deletedAt` | DateTime? | Soft delete timestamp |
| `user` | User | User relation (many-to-one) |
| `clips` | Clip[] | Generated clips |

**Relations:**
- `user` → User (many-to-one)
- `clips` → Clip[] (one-to-many)

## Clip

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `jobId` | String | FK → Job.id |
| `sceneIndex` | Int | Scene index in parent job |
| `startTime` | Float | Start time in seconds |
| `endTime` | Float | End time in seconds |
| `peakIntensity` | Float? | Peak heatmap intensity |
| `status` | String | `pending` / `processing` / `completed` / `failed` |
| `progress` | Int | Progress percentage (default: 0) |
| `fileUrl` | String? | Storage path/URL |
| `fileSize` | Int? | File size in bytes |
| `duration` | Float? | Clip duration in seconds |
| `errorMessage` | String? | Error details on failure |
| `createdAt` | DateTime | Clip creation timestamp |
| `startedAt` | DateTime? | Processing start timestamp |
| `completedAt` | DateTime? | Completion timestamp |
| `deletedAt` | DateTime? | Soft delete timestamp |
| `job` | Job | Job relation (many-to-one) |

**Relations:**
- `job` → Job (many-to-one)

## YoutubeConnection

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `userId` | String | FK → User.id |
| `channelId` | String | YouTube channel ID |
| `channelTitle` | String? | Channel display name |
| `channelThumbnail` | String? | Channel avatar URL |
| `provider` | String | OAuth provider (default: `youtube-data-api`) |
| `status` | String | `active` / `revoked` / `expired` (default: `active`) |
| `lastSyncedAt` | DateTime? | Last sync timestamp |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |
| `user` | User | User relation (many-to-one) |
| `projects` | Project[] | Projects using this connection |
| `credential` | OAuthCredential? | Encrypted OAuth tokens |

## OAuthCredential

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `youtubeConnectionId` | String | FK → YoutubeConnection.id (unique) |
| `encryptedAccessToken` | String | Encrypted OAuth access token |
| `encryptedRefreshToken` | String | Encrypted OAuth refresh token |
| `kmsKeyId` | String | KMS key ID for encryption |
| `expiresAt` | DateTime | Token expiration timestamp |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |
| `youtubeConnection` | YoutubeConnection | Parent connection (one-to-one) |

## Project

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `userId` | String | FK → User.id |
| `youtubeConnectionId` | String? | FK → YoutubeConnection.id |
| `name` | String | Project name |
| `description` | String? | Project description |
| `status` | String | `active` / `archived` / `deleted` (default: `active`) |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |
| `user` | User | User relation (many-to-one) |
| `youtubeConnection` | YoutubeConnection? | YouTube connection relation |
| `sources` | ProjectSource[] | Video sources in project |
| `scenes` | ProjectScene[] | Generated scenes |
| `clips` | GeneratedClip[] | Exported clips |

## ProjectSource

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `projectId` | String | FK → Project.id |
| `youtubeVideoId` | String | YouTube video ID |
| `youtubeUrl` | String | Full YouTube URL |
| `title` | String? | Video title |
| `description` | String? | Video description |
| `thumbnailUrl` | String? | Thumbnail URL |
| `duration` | Float? | Video duration in seconds |
| `publishedAt` | String? | Published date |
| `viewCount` | Int? | View count |
| `likeCount` | Int? | Like count |
| `commentCount` | Int? | Comment count |
| `privacyStatus` | String? | `public` / `private` / `unlisted` |
| `metadataJson` | Json? | Full video metadata |
| `analyticsJson` | Json? | Analytics data |
| `sourceStatus` | String | `discovered` / `selected` / `acquiring` / `ready` / `failed` (default: `discovered`) |
| `mediaStatus` | String | `not_downloaded` / `downloading` / `available` / `failed` (default: `not_downloaded`) |
| `storageKey` | String? | Storage key for source media |
| `errorMessage` | String? | Error details on failure |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |
| `project` | Project | Parent project (many-to-one) |
| `scenes` | ProjectScene[] | Scenes from this source |
| `clips` | GeneratedClip[] | Clips from this source |

## ProjectScene

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `projectId` | String | FK → Project.id |
| `sourceId` | String | FK → ProjectSource.id |
| `startTime` | Float | Scene start time (seconds) |
| `endTime` | Float | Scene end time (seconds) |
| `duration` | Float | Scene duration |
| `score` | Float? | Algorithm confidence score |
| `rank` | Int? | Rank among selected scenes |
| `analysisJson` | Json? | Full algorithm analysis |
| `status` | String | `candidate` / `selected` / `editing` / `exported` / `rejected` (default: `selected`) |
| `storageKey` | String? | Storage key for scene media |
| `mediaStatus` | String | `not_downloaded` / `downloading` / `available` / `failed` (default: `not_downloaded`) |
| `errorMessage` | String? | Error details on failure |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |
| `project` | Project | Parent project |
| `source` | ProjectSource | Source video |
| `clips` | GeneratedClip[] | Clips generated from this scene |

## GeneratedClip

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `projectId` | String | FK → Project.id |
| `sceneId` | String | FK → ProjectScene.id |
| `sourceId` | String | FK → ProjectSource.id |
| `status` | String | `draft` / `queued` / `processing` / `uploading` / `completed` / `failed` (default: `draft`) |
| `platform` | String? | Target platform (`youtube-shorts`, `instagram-reels`, `tiktok`) |
| `aspectRatio` | String? | `9:16`, `1:1`, `16:9` |
| `duration` | Float? | Clip duration in seconds |
| `editorConfigJson` | Json? | OpenReel editor configuration |
| `outputStorageKey` | String? | Storage key for exported clip |
| `fileUrl` | String? | Download URL |
| `size` | Int? | File size in bytes |
| `progress` | Int | Export progress (default: 0) |
| `errorMessage` | String? | Error details on failure |
| `createdAt` | DateTime | Creation timestamp |
| `startedAt` | DateTime? | Export start timestamp |
| `completedAt` | DateTime? | Completion timestamp |
| `project` | Project | Parent project |
| `scene` | ProjectScene | Parent scene |
| `source` | ProjectSource | Source video |

## PatternPreset

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `name` | String | Preset name |
| `description` | String | Description |
| `genre` | String | Genre/category |
| `studioActionTemplate` | Json | Pre-configured StudioAction[] template |
| `sourceType` | String | `curated` / `generated` (default: `curated`) |
| `usageCount` | Int | Usage counter (default: 0) |
| `avgPerformanceScore` | Float? | Average performance metric |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

## Entity Relationship

```
User 1 ──── N Job 1 ──── N Clip
User 1 ──── N YoutubeConnection 1 ──── N Project
Project 1 ──── N ProjectSource 1 ──── N ProjectScene
ProjectScene 1 ──── N GeneratedClip
```

## Migrations

```bash
# Create migration
pnpm --filter @spikeclip/api prisma:migrate

# Open Prisma Studio (GUI)
pnpm --filter @spikeclip/api prisma:studio

# Regenerate client
pnpm --filter @spikeclip/api prisma:generate
```

## Schema Location

`apps/api/prisma/schema.prisma`