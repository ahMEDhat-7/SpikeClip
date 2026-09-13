# YouTube Creators Studio API Integration — SpikeClip

> Status: **Future Plan.** This document outlines how SpikeClip will enable YouTube content creators to connect their channels directly, leveraging YouTube Studio capabilities via official APIs.

---

## Vision

SpikeClip currently extracts heatmap data from YouTube videos using `yt-dlp` / InnerTube (unofficial). This plan describes how to evolve SpikeClip into a **creator-connected platform** where YouTubers can:

- Connect their channel via OAuth 2.0
- Analyze their own videos with official audience retention data
- Download captions from their videos for clip editing
- Upload extracted clips directly as YouTube Shorts
- Manage thumbnails, captions, and metadata on exported clips
- View channel-level analytics and engagement insights
- Eventually: real-time live stream clip extraction

This transforms SpikeClip from a standalone clip extraction tool into a **YouTube creator productivity platform**.

---

## Why This Matters

| Current State | Future State |
|---------------|-------------|
| Uses `yt-dlp` (unofficial) for heatmap data | Official YouTube Data API v3 + Analytics API for owned content |
| No channel connection required | OAuth 2.0 channel linking for direct integration |
| Clips must be manually downloaded and uploaded | One-click upload as YouTube Shorts |
| No caption management | Download existing captions, upload new ones to clips |
| No analytics beyond heatmap | Full audience retention, demographics, traffic source data |
| No live stream support | Real-time live clip extraction via Live Streaming API |

### Key Limitation: Heatmap Data

**There is no official YouTube API endpoint for "most replayed" heatmap data.** The heatmap is YouTube's internal visualization powered by the InnerTube API. SpikeClip will continue using `yt-dlp` / `innertube-sdk` for heatmap extraction on any video, while using official APIs for creator-owned channel features.

---

## Available YouTube APIs

### YouTube Data API v3

**Base URL:** `https://www.googleapis.com/youtube/v3`

| Resource | Endpoint | Quota | SpikeClip Use |
|----------|----------|-------|---------------|
| `videos.list` | `GET /videos` | 1 unit | Get video metadata, duration, captions availability |
| `videos.insert` | `POST /videos` | 100 units | Upload clips as YouTube Shorts |
| `videos.update` | `PUT /videos` | 50 units | Update clip metadata (title, description, tags) |
| `channels.list` | `GET /channels` | 1 unit | Get connected channel info |
| `playlists.list` | `GET /playlists` | 1 unit | List channel playlists |
| `playlistItems.list` | `GET /playlistItems` | 1 unit | List videos in a playlist (cheaper than search) |
| `captions.list` | `GET /captions` | 50 units | List available caption tracks |
| `captions.download` | `GET /captions/{id}` | 200 units | Download caption track (SRT/VTT) |
| `captions.insert` | `POST /captions` | 400 units | Upload new caption track to a clip |
| `thumbnails.set` | `POST /thumbnails/set` | 50 units | Upload custom thumbnail for exported clips |
| `search.list` | `GET /search` | 100 units | Search videos (expensive — avoid) |

**Key Video Parts:**
- `snippet` — title, description, channelId, tags, thumbnails, publishedAt
- `contentDetails` — duration, definition, caption availability
- `statistics` — viewCount, likeCount, commentCount
- `status` — privacyStatus, embeddable, madeForKids
- `fileDetails` — fileName, videoStreams, audioStreams
- `processingDetails` — processingStatus, progress

### YouTube Analytics API

**Base URL:** `https://youtubeanalytics.googleapis.com/v2`

**Single endpoint:** `GET /reports`

| Metric Category | Metrics | Relevance |
|----------------|---------|-----------|
| Audience Retention | `audienceWatchRatio`, `relativeRetentionPerformance` | Compare with SpikeClip heatmap data |
| Engagement | `views`, `engagedViews`, `likes`, `comments`, `shares` | Identify top-performing videos |
| Watch Time | `estimatedMinutesWatched`, `averageViewDuration` | Content performance scoring |
| Traffic Sources | `views` by `insightTrafficSourceType` | Understand discovery channels |
| Demographics | `viewerPercentage` by `ageGroup`, `gender` | Audience insights |
| Revenue | `estimatedRevenue`, `cpm` | Partner-only monetization data |

**Critical Limitation:** Analytics data is only available for channels you **own or manage**. You cannot query analytics for other creators' videos.

**Audience Retention Report (key for SpikeClip):**
```
dimensions=elapsedVideoTimeRatio
metrics=audienceWatchRatio,relativeRetentionPerformance
filters=video==VIDEO_ID
```
Returns 100 data points per video (1% to 100% of duration). For a 10-minute video, each point represents ~6 seconds.

### YouTube Live Streaming API

**Base URL:** `https://www.googleapis.com/youtube/v3`

| Resource | Methods | SpikeClip Use |
|----------|---------|---------------|
| `liveBroadcast` | list, insert, transition | Monitor live events |
| `liveStream` | list, insert | Manage stream feeds |
| `liveChatMessage` | list, insert | Real-time engagement monitoring |
| `superChatEvent` | list | Identify high-engagement Super Chat moments |

**Future Use:** Extract clips from live stream VODs after they process, or monitor live engagement in real-time.

### YouTube OAuth 2.0 Scopes

| Scope | Purpose | Required For |
|-------|---------|-------------|
| `youtube.readonly` | View channel data | Channel connection, video listing |
| `youtube.upload` | Upload videos | Exporting clips as Shorts |
| `youtube.force-ssl` | Manage captions, metadata | Caption upload, thumbnail management |
| `yt-analytics.readonly` | View Analytics reports | Audience retention, engagement data |
| `yt-analytics-monetary.readonly` | View revenue reports | Monetization analytics (partner-only) |

**Recommended Minimum:** `youtube.readonly` + `youtube.upload` + `yt-analytics.readonly`

---

## Architecture

### OAuth 2.0 Flow

```
Creator clicks "Connect YouTube Channel"
  → SpikeClip redirects to Google OAuth consent screen
  → Creator grants permissions
  → Google redirects back with authorization code
  → SpikeClip exchanges code for access + refresh tokens
  → Tokens encrypted and stored in ChannelConnection table
  → Creator's channel is now linked
```

### Token Management

```
SpikeClip API
  ├ OAuth middleware checks token expiry
  ├ If expired: refresh using stored refresh_token
  ├ If refresh fails: notify creator to re-authenticate
  └ All YouTube API calls go through authenticated client
```

### Hybrid Architecture

```
SpikeClip API (NestJS)
  ├ yt-dlp / InnerTube ──→ Heatmap data (any YouTube video)
  ├ YouTube Data API v3 ──→ Video metadata, captions, upload (connected channels)
  ├ YouTube Analytics API ──→ Audience retention, engagement (connected channels)
  └ YouTube Live API ──→ Live stream monitoring (future)

SpikeClip Web (Next.js)
  ├ Channel connection UI (OAuth flow)
  ├ Analytics dashboard (retention vs. heatmap comparison)
  ├ Clip upload manager (export to YouTube Shorts)
  └ Caption editor (download → edit → re-upload)
```

---

## Phased Implementation

### Phase 1: Channel Connection (OAuth)

**Goal:** Let creators link their YouTube channel to SpikeClip.

| Task | Details |
|------|---------|
| Create `ChannelConnection` entity | `id`, `userId`, `channelId`, `channelTitle`, `channelThumbnail`, `accessToken` (encrypted), `refreshToken` (encrypted), `scopes`, `expiresAt`, `connectedAt` |
| Add Google OAuth scopes for YouTube | Extend existing Google OAuth config with YouTube-specific scopes |
| Build OAuth callback handler | Exchange code for tokens, store encrypted, link to user |
| Build channel connection UI | "Connect YouTube" button on dashboard, show connected channel status |
| Token refresh middleware | Auto-refresh expired tokens before API calls |
| Disconnect channel | Revoke tokens, delete connection record |

**Data Model:**
```typescript
// apps/api/src/domain/entities/channel-connection.entity.ts
interface ChannelConnection {
  id: string;
  userId: string;
  channelId: string;          // YouTube channel ID
  channelTitle: string;       // Cached channel name
  channelThumbnail: string;   // Cached profile picture URL
  accessToken: string;        // Encrypted
  refreshToken: string;       // Encrypted
  scopes: string[];           // Granted OAuth scopes
  expiresAt: Date;            // Token expiry
  connectedAt: Date;          // When linked
}
```

### Phase 2: Channel Video Listing

**Goal:** Let creators see their own videos in SpikeClip with metadata.

| Task | Details |
|------|---------|
| Fetch channel videos | `playlistItems.list` on the channel's `uploads` playlist |
| Cache video list | Store in `ChannelVideo` entity, refresh on demand |
| Display in Dashboard | Show connected channel's videos alongside analyzed videos |
| Video detail enrichment | `videos.list` with `part=snippet,contentDetails,statistics` |

**Data Model:**
```typescript
interface ChannelVideo {
  id: string;
  channelConnectionId: string;
  youtubeVideoId: string;
  title: string;
  thumbnail: string;
  duration: number;          // seconds
  viewCount: number;
  publishedAt: Date;
  lastSyncedAt: Date;
}
```

### Phase 3: Caption Download & Management

**Goal:** Download captions from creator's videos for use in clip editing.

| Task | Details |
|------|---------|
| List available captions | `captions.list` for a video |
| Download caption track | `captions.download` — returns SRT/VTT/SBV/TTML |
| Parse and store captions | Convert to internal format for clip overlay |
| Upload captions to clips | `captions.insert` on exported YouTube Shorts |

**Quota Note:** Caption operations are expensive (50-400 units each). Cache aggressively.

### Phase 4: Upload Clips as YouTube Shorts

**Goal:** Export extracted clips directly to the creator's YouTube channel as Shorts.

| Task | Details |
|------|---------|
| Upload video | `videos.insert` with `part=snippet,status` |
| Set metadata | Title, description, tags, categoryId, privacyStatus |
| Mark as Short | Ensure vertical format (9:16), duration < 60s |
| Auto-set thumbnail | `thumbnails.set` with custom thumbnail |
| Upload captions | `captions.insert` if captions were added in Studio |

**Quota Budget:**
- Upload: 100 units per video
- Thumbnail: 50 units
- Captions: 400 units
- **Total per clip export: ~550 units** (max ~18 clips/day on default quota)

### Phase 5: Thumbnail Auto-Generation

**Goal:** Automatically generate and upload thumbnails for exported clips.

| Task | Details |
|------|---------|
| Extract frame from clip | Use ffmpeg to grab keyframe at peak engagement moment |
| Apply template overlay | Add text, gradient, or branding to thumbnail |
| Upload to YouTube | `thumbnails.set` on the uploaded Short |
| Store locally | Save generated thumbnail for future reference |

### Phase 6: Analytics Dashboard

**Goal:** Let creators view their channel analytics alongside SpikeClip heatmap data.

| Task | Details |
|------|---------|
| Fetch audience retention | Analytics API `elapsedVideoTimeRatio` report |
| Compare with heatmap | Overlay official retention data vs. SpikeClip heatmap |
| Engagement metrics | Views, likes, watch time, subscriber gain/loss |
| Traffic source analysis | Where viewers discover the video |
| Demographics | Age, gender, geography breakdowns |

**Visualization:** Side-by-side comparison of SpikeClip heatmap (per-second intensity) vs. YouTube Analytics retention (100-point curve).

### Phase 7: Live Stream Clip Extraction (Future)

**Goal:** Extract clips from live stream VODs in real-time or post-stream.

| Task | Details |
|------|---------|
| Monitor live streams | `liveBroadcast.list` for connected channel |
| Real-time engagement | `liveChatMessage.streamList` for engagement signals |
| Post-stream analysis | Wait for VOD processing, then apply standard heatmap pipeline |
| Super Chat identification | `superChatEvent.list` to find high-engagement paid moments |

---

## API Quota Management

### Default Quota: 10,000 units/day

| Operation | Units | Daily Max (at 10k) |
|-----------|-------|---------------------|
| `videos.list` | 1 | 10,000 calls |
| `channels.list` | 1 | 10,000 calls |
| `playlistItems.list` | 1 | 10,000 calls |
| `captions.list` | 50 | 200 calls |
| `captions.download` | 200 | 50 calls |
| `captions.insert` | 400 | 25 calls |
| `videos.insert` | 100 | 100 calls |
| `thumbnails.set` | 50 | 200 calls |
| `search.list` | 100 | 100 calls (own bucket) |

### Quota Strategies

1. **Cache aggressively** — Video metadata, caption lists, channel info rarely change
2. **Use `playlistItems.list`** over `search.list` (100x cheaper)
3. **Batch requests** — `videos.list` accepts up to 50 IDs per call (1 unit total)
4. **Incremental sync** — Only fetch videos published since last sync
5. **User-level quota** — Track per-user API usage, enforce fair use
6. **Request quota increase** — Via Google's compliance audit form for production apps

### Per-User Quota Tracking

```typescript
interface ApiQuotaUsage {
  userId: string;
  date: string;              // YYYY-MM-DD
  unitsUsed: number;
  unitsLimit: number;        // Based on plan tier
  breakdown: Record<string, number>; // endpoint → count
}
```

---

## Security Considerations

1. **Encrypted token storage** — Access and refresh tokens encrypted at rest using AES-256-GCM
2. **Scope minimization** — Request only the scopes needed; upgrade incrementally
3. **Token rotation** — Refresh tokens before expiry, detect revocation
4. **Rate limiting** — Per-user API call limits to prevent quota exhaustion
5. **Audit logging** — Log all YouTube API calls for debugging and compliance
6. **YouTube ToS compliance** — No scraping of non-owned channel analytics; heatmap extraction via InnerTube is in a灰色 area
7. **Data retention** — Store only what's needed; delete tokens on disconnect
8. **HTTPS only** — All token exchanges over TLS

---

## Database Schema Changes

### New Tables

```sql
-- Channel connection (OAuth tokens + channel info)
CREATE TABLE channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id VARCHAR(64) NOT NULL,          -- YouTube channel ID
  channel_title VARCHAR(255) NOT NULL,
  channel_thumbnail TEXT,
  access_token_encrypted TEXT NOT NULL,      -- AES-256-GCM encrypted
  refresh_token_encrypted TEXT NOT NULL,     -- AES-256-GCM encrypted
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  UNIQUE(user_id, channel_id)
);

-- Cached channel videos
CREATE TABLE channel_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_connection_id UUID NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,
  youtube_video_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  thumbnail TEXT,
  duration INTEGER,                          -- seconds
  view_count BIGINT,
  published_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_connection_id, youtube_video_id)
);

-- API quota tracking
CREATE TABLE api_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  units_used INTEGER NOT NULL DEFAULT 0,
  units_limit INTEGER NOT NULL DEFAULT 10000,
  breakdown JSONB DEFAULT '{}',
  UNIQUE(user_id, date)
);

CREATE INDEX idx_channel_connections_user ON channel_connections(user_id);
CREATE INDEX idx_channel_videos_connection ON channel_videos(channel_connection_id);
CREATE INDEX idx_api_quota_user_date ON api_quota_usage(user_id, date);
```

---

## Future Vision: AI Video Generation

Beyond YouTube API integration, the long-term vision includes:

1. **AI Video Editing Model** — Train or fine-tune a model on clip editing patterns (captions, transitions, effects) to auto-edit clips based on content analysis
2. **AI Video Generation** — Use text-to-video models to generate B-roll, intros, or transitions for clips
3. **Smart Auto-Edit** — Analyze video content (speech, scene changes, faces) and auto-apply optimal editing decisions
4. **Cross-Platform Optimization** — AI-driven format adaptation (different crops, captions styles, music) per platform (TikTok vs. Shorts vs. Reels)
5. **Content Scoring** — Predict clip performance before publishing using historical engagement data

This builds on the OpenReel integration foundation and YouTube API layer to create a fully automated clip creation pipeline.

---

## Open Questions

1. **Heatmap API status** — Will YouTube ever expose heatmap data officially? Monitor Google's API changelog.
2. **Quota limits** — Is 10,000 units/day sufficient for production use? May need compliance audit for increase.
3. **InnerTube stability** — How long will `yt-dlp` / InnerTube remain functional? Build fallback to Data API v3.
4. **YouTube Shorts API** — YouTube may release dedicated Shorts APIs in the future; watch for announcements.
5. **Content ID implications** — Do uploaded clips trigger Content ID claims? Need to handle potential copyright issues.
6. **Pricing impact** — Should YouTube integration be a Pro/Team feature only, or available to free tier?
