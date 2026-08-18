# Database Schema

PostgreSQL 18 with Prisma ORM.

## User

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `email` | String | Google OAuth email |
| `oauthProvider` | String | OAuth provider (`google`) |
| `oauthProviderId` | String | Google OAuth subject ID |
| `name` | String? | Display name |
| `plan` | String | `free` / `pro` / `team` (default: `free`) |
| `stripeCustomerId` | String? | Stripe customer ID |
| `analysesUsed` | Int | Current period usage (default: 0) |
| `analysesLimit` | Int | Monthly limit (default: 3) |
| `scenesLimit` | Int | Max scenes per analysis (default: 3) |
| `createdAt` | DateTime | Account creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations:**
- `jobs` → Job[] (one-to-many)

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
| `scenes` | Json? | `ScoredBlock[]` from algorithm |
| `heatmapData` | Json? | `HeatmapSpike[]` from yt-dlp |
| `errorMessage` | String? | Error details on failure |
| `createdAt` | DateTime | Job creation timestamp |
| `completedAt` | DateTime? | Completion timestamp |

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
| `fileUrl` | String? | Storage path/URL |
| `fileSize` | Int? | File size in bytes |
| `duration` | Float? | Clip duration in seconds |
| `errorMessage` | String? | Error details on failure |
| `createdAt` | DateTime | Clip creation timestamp |
| `completedAt` | DateTime? | Completion timestamp |

**Relations:**
- `job` → Job (many-to-one)

## Entity Relationship

```
User 1 ──── N Job 1 ──── N Clip
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
