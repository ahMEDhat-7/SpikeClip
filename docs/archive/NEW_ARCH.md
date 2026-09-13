# SpikeClip — Architecture & Refactor Specification

**Purpose of this document:** This is the canonical reference for local coding agents (OpenCode, MiniMax, or any other agent) working on the SpikeClip refactor. It consolidates product goals, target architecture, data model, service boundaries, worker/queue design, the AI pipelines, and explicit build instructions into one file. Treat every "Do NOT" in this document as a hard constraint, not a suggestion — several of them exist because an earlier, simpler design choice would silently fail in production (see §3).

---

## Table of Contents

1. [Product Goal](#1-product-goal)
2. [Target Architecture](#2-target-architecture-high-level)
3. [Non-Negotiable Architectural Decisions](#3-non-negotiable-architectural-decisions)
4. [Current State Assessment](#4-current-state-assessment)
5. [Data Model](#5-data-model-prisma)
6. [Service Boundaries & File Layout](#6-service-boundaries--file-layout)
7. [Worker Fleet & Queue Topology](#7-worker-fleet--queue-topology)
8. [Multi-Signal Scene Scoring](#8-multi-signal-scene-scoring)
9. [Heatmap-Driven Scene Selection](#9-heatmap-driven-scene-selection)
10. [AI Editing Pipeline](#10-ai-editing-pipeline)
11. [Stage 1 Analyze — Enhancement Tasks](#11-stage-1-analyze--enhancement-tasks)
12. [API Surface](#12-api-surface)
13. [Security Requirements](#13-security-requirements)
14. [Pricing Tier Enforcement](#14-pricing-tier-enforcement)
15. [Feature Flags](#15-feature-flags)
16. [Tech Stack by Stage](#16-tech-stack-by-stage)
17. [Testing Strategy](#17-testing-strategy)
18. [Deployment & Migration](#18-deployment--migration)
19. [Task Breakdown](#19-task-breakdown)
20. [Risk Mitigations](#20-risk-mitigations)
21. [File Impact Summary](#21-file-impact-summary)
22. [Example User Journey](#22-example-user-journey)
23. [UI/UX Overhaul](#23-uiux-overhaul)
24. [Instructions for the Coding Agent](#24-instructions-for-the-coding-agent)
- [Appendix A: FFmpeg Filter Reference](#appendix-a-ffmpeg-filter-reference)

---

## 1. Product Goal

Build the heatmap-driven clipping tool for the MENA market. Independent clippers and creators use SpikeClip to find the most-replayed moments in YouTube videos — using real viewer heatmap data, not AI guessing — then cut, caption (Arabic), and export vertical clips ready for TikTok, Shorts, and Reels. English-first UI, Arabic caption generation as a key feature.

**Target users:**
- Independent clippers (MENA + global) — freelancers who join campaigns on Arabic Clipping, Clipping.net, or Whop and need to find better moments faster
- Arabic content creators — YouTubers/podcasters who want to clip their own long-form Arabic content
- Clipping agencies (team accounts) — small operations that want standardized tooling for their clipper network

**Differentiated experience:**

1. Paste a YouTube URL (or connect a channel via OAuth).
2. See a heatmap of the selected video and **manually** mark the moment(s) to clip — AI suggests candidate peaks, it does not auto-decide.
3. The system acquires and cuts only the selected time range.
4. Edit the clip through natural-language prompts that map to a validated, structured editing schema — not freeform AI video generation.
5. Export to platform-specific formats and download — with Arabic caption generation.

**Two-stage product vision:**
- **Stage 1 (SpikeClip):** Heatmap-driven clip extraction and vertical reformatting
- **Stage 2 (Prompt Editing Layer):** Captions, cleanup, and styling via natural-language prompts

> **Editing engine direction — OpenReel integration.** The Studio editing layer is being re-architected on the open-source [OpenReel](https://openreel.video) architecture ([MIT](https://github.com/Augani/openreel-video)): a non-destructive multi-track timeline as the single source of truth, a typed editing-tool registry shared by manual *and* AI edits, a model-agnostic AI agent (OpenAI / Anthropic / local, dry-run planning, undo-a-turn), and hybrid rendering (server ingest/transcode + in-browser WebCodecs/WebGPU compositing/export). `StudioAction` remains as a legacy/translation layer during the transition.

### 1b. MENA Clipping Industry Context

The clipping industry is the economy of freelance editors ("clippers") who cut long-form content into short-form vertical clips. In MENA:

- **Arabic Clipping** is the dominant managed agency — 50,000+ clippers, 500M+ views, 87K Whop members. They handle clip selection, editing, and distribution. They are NOT a self-serve tool.
- **Lumina Clippers** has a dedicated UAE desk with 62,900+ creators and 18B+ views.
- **No AI clipping tool is built Arabic-first.** OpusClip admits "Arabic caption accuracy trails English." Klap, Vizard, Submagic — all English-first with no MENA focus.
- **MENA CPMs are lower** ($0.34–$1.93 YouTube CPM) — clippers need every clip to perform to earn well.
- **173M+ TikTok users in MENA**, 50M+ YouTube users in Egypt alone, Saudi YouTube watch time among highest globally.

**SpikeClip's position:** The tooling layer between campaign platforms and clipper distribution. Not a campaign platform, not an agency, not a marketplace — the software clippers use to create better clips.

---

## 2. Target Architecture (High Level)

```
YouTube Account (Google OAuth, per-user)
        │
        ▼
YouTube Integration Layer  (YoutubeStudioProvider interface)
        │  channel · videos · metadata · analytics
        ▼
SpikeClip Project
        │
        ├── Select video
        ├── Heatmap + manual scene selection   (Extract + Generate collapsed)
        ├── Scoped acquisition & cut           (only the selected range)
        ├── Editor  (prompt → StudioAction[] → FilterGraphBuilder → FFmpeg)
        ├── Export  (BullMQ → render workers → storage)
        └── Download (signed URL)
```

---

## 3. Non-Negotiable Architectural Decisions

These were resolved through design review and should **not** be re-litigated by an agent refactoring the code — implement them as given, or flag explicitly if a genuine blocker is found.

1. **MCP is not a multi-tenant primitive.** The reference `youtube-studio-mcp` server is a local, single-user, stdio-based tool with credentials in one `token.json`. In production, `YoutubeStudioMcpService` must be re-implemented against the YouTube Data API v3 / Analytics API directly, using **per-user OAuth tokens** retrieved from `AuthTokenVaultService` (§6). The `YoutubeStudioProvider` interface (§6) stays fixed — only the implementation behind it changes. Do not scatter YouTube API calls outside this boundary.
2. **YouTube API quota is shared per Google Cloud project, not per user.** All calls from all users draw down the same daily budget. `YouTubeQuotaGuard` (§6) must gate every outbound call before it happens, not after a failure. Apply for a quota increase from Google early — assume multi-week lead time.
3. **Two different "heatmaps" exist and must not be conflated:**
   - Official **Audience Retention** data (YouTube Analytics API) — requires the channel owner's OAuth, works on any video including new/low-view/private ones. This is the production path for connected-channel videos.
   - The public **"Most Replayed"** graph shown on the YouTube player — no official public API exists for it; only unofficial scraping is available, which is fragile and carries ToS risk. Do **not** build load-bearing functionality on this. For the paste-URL fallback path (a video the user doesn't own), degrade to a transcript/audio-energy-based timeline instead of claiming a true retention heatmap.
4. **Extract and Generate collapse into one interactive screen**, not two sequential phases. The heatmap-driven manual-selection UI (§9) *is* both phases. The existing scene-scoring algorithm (`mergeHeatmapSpikes → capAndScoreBlocks → selectTopScenes → padScenes`) becomes a **suggestion overlay** on the heatmap graph, not the sole decision-maker.
5. **Scene acquisition is scoped**, not full-video by default. Only download the time range actually needed, with a duration-based strategy switch (§9.3).
6. **Preserve, do not rewrite:** FFmpeg rendering, BullMQ, the MinIO/storage abstraction, `FilterGraphBuilder`, the `StudioAction` schema (extend, don't replace), the OpenReel editor integration, the existing heatmap algorithms, caption rendering, music mixing, and signed download URLs. These are working infrastructure — the refactor is about the YouTube ingestion layer, the domain model, and the project workflow, not a rendering-engine rewrite.

---

## 4. Current State Assessment

### What Already Exists

| Area | Status | Details |
|---|---|---|
| Algorithm (merge, score, select) | **Complete** | 415 lines TS, 654+ tests, Python reference in sync |
| Database schema | **Complete** | User, Job, Clip with relations, indexes, 7 migrations |
| Auth (Google OAuth + JWT) | **Complete** | Cookie-based, guards, roles |
| yt-dlp integration | **Complete** | Metadata, heatmap, section download |
| FFmpeg integration | **Partial** | Trim, vertical crop, SRT/drawtext captions, audio mix, vignette. Missing: animations, styles, transitions, quality/format control |
| BullMQ workers | **Complete** | Heatmap (analysis queue), Clip (export queue) |
| Storage | **Complete** | Local + MinIO, HMAC-signed URLs |
| Payments (Stripe) | **Complete** | Checkout, portal, webhooks |
| Frontend — Dashboard | **Complete** | URL input, heatmap chart, scene editor, video preview, metadata sidebar |
| Frontend — Studio | **Partial** | Platform select, caption editor, music panel, template library, export panel. Missing: prompt-based chat interface, live preview |
| Pricing | **Partial** | UI exists, but scenesLimit defaults don't match new tiers |
| Tests | **Substantial** | 25 web test files, 6 API e2e files, 654+ algorithm tests |

### What Needs Building

1. YouTube account integration (OAuth token vault, quota guard, direct API calls)
2. Project/Source/Scene/Clip domain model
3. **Prompt-based chat interface** replacing current editor panels
4. **LLM translation layer** (natural language → structured actions)
5. **Standard action language** (intermediate representation)
6. **FFmpeg filter graph builder** (actions → filter_complex)
7. **Server-side preview rendering** (480p, cached)
8. **Quality/format export options** (480p/720p/1080p, mp4/webm)
9. **Platform-specific encoding rules**
10. **Pricing tier enforcement** (Free: 2, Pro: 10, Team: 20 clips)
11. **Additional FFmpeg capabilities** (text animations, styles, transitions, speed, overlays)
12. Multi-signal scene scoring (heatmap + transcript + audio energy + visual cues)
13. Pattern preset service with two-tier prompt routing
14. Worker fleet restructuring (3 independently-scaled pools)

---

## 5. Data Model (Prisma)

Extends the original schema. New/changed fields are marked.

```prisma
model YoutubeConnection {
  id               String    @id @default(uuid())
  userId           String
  channelId        String
  channelTitle     String?
  channelThumbnail String?
  provider         String    @default("youtube-data-api")   // CHANGED from "youtube-studio-mcp"
  status           String    @default("active")
  lastSyncedAt     DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  projects         Project[]
  credential       OAuthCredential?
  @@unique([userId, channelId])
  @@index([userId])
}

// NEW — isolates secrets from the connection record itself
model OAuthCredential {
  id                    String    @id @default(uuid())
  youtubeConnectionId   String    @unique
  encryptedAccessToken  String
  encryptedRefreshToken String
  kmsKeyId              String
  expiresAt              DateTime
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  youtubeConnection      YoutubeConnection @relation(fields: [youtubeConnectionId], references: [id], onDelete: Cascade)
}

model Project {
  id                  String    @id @default(uuid())
  userId              String
  youtubeConnectionId String?
  name                String
  description         String?
  status              String    @default("active")
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  youtubeConnection   YoutubeConnection? @relation(fields: [youtubeConnectionId], references: [id], onDelete: SetNull)
  sources             ProjectSource[]
  scenes              ProjectScene[]
  clips               GeneratedClip[]
  @@index([userId])
  @@index([userId, status])
}

model ProjectSource {
  id              String   @id @default(uuid())
  projectId       String
  youtubeVideoId  String
  youtubeUrl      String
  title           String?
  description     String?
  thumbnailUrl    String?
  duration        Float?
  publishedAt     String?
  viewCount       Int?
  likeCount       Int?
  commentCount    Int?
  privacyStatus   String?
  metadataJson    Json?
  analyticsJson   Json?          // official Analytics API retention curve, when available
  sourceStatus    String   @default("discovered")
  mediaStatus     String   @default("not_downloaded")  // used only when acquisition strategy = full-source
  storageKey      String?
  errorMessage    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scenes          ProjectScene[]
  clips           GeneratedClip[]
  @@unique([projectId, youtubeVideoId])
  @@index([projectId])
  @@index([sourceStatus])
}

model ProjectScene {
  id           String   @id @default(uuid())
  projectId    String
  sourceId     String
  startTime    Float
  endTime      Float
  duration     Float
  score        Float?          // from fusion scoring, used for suggestion markers only
  rank         Int?
  analysisJson Json?
  status       String   @default("selected")   // CHANGED default — manual selection skips "candidate"
  storageKey   String?         // NEW — used when acquisition strategy = per-scene section download
  mediaStatus  String   @default("not_downloaded")  // NEW
  errorMessage String?         // NEW
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  source       ProjectSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  clips        GeneratedClip[]
  @@index([projectId])
  @@index([sourceId])
  @@index([status])
}

model GeneratedClip {
  id               String   @id @default(uuid())
  projectId        String
  sceneId          String
  sourceId         String
  status           String   @default("draft")
  platform         String?
  aspectRatio      String?
  duration         Float?
  editorConfigJson Json?
  outputStorageKey String?
  fileUrl          String?
  size             Int?
  progress         Int      @default(0)
  errorMessage     String?
  createdAt        DateTime @default(now())
  startedAt        DateTime?
  completedAt      DateTime?
  project          Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scene            ProjectScene @relation(fields: [sceneId], references: [id], onDelete: Cascade)
  source           ProjectSource @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  performance      ClipPerformance[]
  @@index([projectId])
  @@index([sceneId])
  @@index([status])
}

// NEW — the performance flywheel (§8.3)
model ClipPerformance {
  id                String   @id @default(uuid())
  clipId            String
  platform          String
  views             Int?
  likes             Int?
  comments          Int?
  shares            Int?
  watchThroughRate  Float?
  fetchedAt         DateTime @default(now())
  clip              GeneratedClip @relation(fields: [clipId], references: [id], onDelete: Cascade)
  @@index([clipId])
}

// NEW — the pattern/preset library (§10)
model PatternPreset {
  id                    String   @id @default(uuid())
  name                  String
  description           String
  genre                 String   // talking_head | podcast | reaction | meme | walkthrough
  embedding             Unsupported("vector")?   // requires pgvector extension
  studioActionTemplate  Json
  sourceType            String   @default("curated")  // curated | mined_from_performance | trend_scraped
  usageCount            Int      @default(0)
  avgPerformanceScore   Float?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

// NEW — quota + billing (§6, BillingService)
model UsageRecord {
  id         String   @id @default(uuid())
  userId     String
  projectId  String?
  unitType   String   // source_acquisition_minutes | generated_scenes | rendered_clip_minutes | export_minutes | ai_generations | storage_bytes
  amount     Float
  createdAt  DateTime @default(now())
  @@index([userId, unitType, createdAt])
}

model PlanQuota {
  id        String  @id @default(uuid())
  planTier  String
  unitType  String
  limit     Float
  period    String  @default("monthly")
  @@unique([planTier, unitType])
}

model Subscription {
  id                   String   @id @default(uuid())
  userId               String   @unique
  stripeCustomerId     String
  stripeSubscriptionId String?
  planTier             String   @default("free")
  status               String   @default("active")
  currentPeriodEnd     DateTime?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

---

## 6. Service Boundaries & File Layout

### Component Inventory

| Layer | Component | Responsibility | Verdict |
|---|---|---|---|
| Integration | `YoutubeStudioProvider` (interface) | `getChannel()`, `listVideos()`, `getVideo()` contract | **Keep as-is** |
| Integration | `YoutubeStudioMcpService` (impl) | Fulfills the provider via direct YouTube Data/Analytics API calls, per-user tokens | **Replace implementation** (see §3.1) |
| Integration | `AuthTokenVaultService` | Encrypts, stores, refreshes per-user OAuth tokens; issues short-lived credentials | **New** |
| Integration | `YouTubeQuotaGuard` | Tracks shared daily quota; queues/defers/rejects calls before they're made | **New** |
| Acquisition | `YoutubeMediaService` | `yt-dlp` downloads (full or scoped via `--download-sections`), validation, storage handoff | **Keep, reshape input** |
| Domain | `ProjectService` | Project CRUD, lifecycle, ownership | **Keep** |
| Domain | `SourceService` | Source discovery, `sourceStatus`/`mediaStatus` state machine, selection policy | **Reshape** — split out of `ProjectService` |
| Generation | `SceneGenerationService` | Orchestrates signal extraction + fusion scoring (§8) | **Keep algorithm, reshape into pluggable strategies** |
| Generation | `ClipGenerationService` | Creates a `GeneratedClip` record from a selected scene + platform | **Keep, narrow scope** — creates records only, never triggers rendering |
| Signals | `SignalExtractor` implementations (Heatmap / Transcript / AudioEnergy / VisualCues) | Produce a normalized signal timeline per source | **Heatmap: keep. Others: new** (§8) |
| Signals | `SceneRankingModel` | Learned reranker trained on post-export performance data | **New, future** — start logging training data now, train once volume justifies it |
| Editor | `EditorConfigService` | Persists/validates `EditorConfig`, crop, captions, templates, music | **Reshape** — split out of original `EditorService` |
| Editor | `AiCommandService` | Sends prompt to LLM/pattern router, parses into candidate `StudioAction[]` | **New** — split out of `EditorService` |
| Editor | `PatternPresetService` | Two-tier prompt routing: embed → match preset library → param overrides, or fall back to full generation (§10) | **New** |
| Editor | `FaceTrackingService` | Frame-sampled face/person detection producing a time-varying focus track for `AUTO_REFRAME` | **New** |
| Editor | `FilterGraphBuilder` | `StudioAction[]` → FFmpeg filter graph | **Keep, unchanged** |
| Export | `JobOrchestrator` | Resolves job dependencies (parent acquisition job / child render jobs), routes by plan priority | **New** |
| Export | `ExportService` | Executes a resolved render job, tracks `QUEUED → PROCESSING → COMPLETED` | **Reshape, thinner** — dependency resolution moves to `JobOrchestrator` |
| Export | Worker pools: source / scene / render | Job execution | **Reshape into 3 independently-scaled pools** (§7) |
| Platform | `StorageService` | put/get/delete/signed URL/exists | **Keep** |
| Platform | `CacheService` | Redis-backed cache for channel/video metadata, thumbnails, analytics | **New** |
| Platform | `QuotaService` | Tracks per-user consumption against plan limits; gates job enqueue | **New** |
| Platform | `BillingService` | Stripe checkout/webhooks, subscription state, plan→quota mapping | **New — biggest gap in the original design** |
| Platform | `NotificationService` | Live job-status push (WebSocket/SSE) to frontend | **New** |
| Legacy | `Job`-centric pipeline | Backward compatibility during migration | **Retire on a hard calendar date**, not "eventually" |

### File Layout

```
apps/api/src/
├── domain/
│   ├── ports/
│   │   ├── youtube-studio.provider.ts        — YoutubeStudioProvider interface (UNCHANGED)
│   │   └── signal-extractor.provider.ts      — NEW: SignalExtractor interface
│   ├── entities/
│   └── repositories/
│
├── infrastructure/
│   ├── youtube/
│   │   ├── youtube-studio-mcp.service.ts     — REPLACE internals: direct API calls, per-user token
│   │   ├── auth-token-vault.service.ts       — NEW
│   │   ├── youtube-quota-guard.service.ts    — NEW
│   │   └── youtube.module.ts
│   ├── external/
│   │   └── youtube-media.service.ts          — reshape: add scoped section-download support
│   └── database/repositories/
│
├── application/
│   ├── services/
│   │   ├── scene-generation.service.ts       — reshape: pluggable SignalExtractor strategies
│   │   ├── signal-extractors/
│   │   │   ├── heatmap.extractor.ts          — KEEP (wraps existing algorithm)
│   │   │   ├── transcript.extractor.ts       — NEW
│   │   │   ├── audio-energy.extractor.ts     — NEW
│   │   │   └── visual-cues.extractor.ts      — NEW
│   │   ├── clip-generation.service.ts
│   │   ├── editor-config.service.ts          — NEW (split from EditorService)
│   │   ├── ai-command.service.ts             — NEW (split from EditorService)
│   │   ├── pattern-preset.service.ts         — NEW: embedding match + routing (§10)
│   │   ├── face-tracking.service.ts          — NEW
│   │   ├── job-orchestrator.service.ts       — NEW
│   │   ├── quota.service.ts                  — NEW
│   │   ├── billing.service.ts                — NEW
│   │   ├── cache.service.ts                  — NEW
│   │   └── notification.service.ts           — NEW
│   └── filter-graph/
│       └── filter-graph-builder.ts           — KEEP, UNCHANGED
│
├── presentation/
│   ├── youtube/ | projects/ | sources/ | scenes/ | clips/ | editor/ | export/ | billing/
│
└── workers/
    ├── source.worker.ts                      — reshape: honor scoped acquisition strategy
    ├── scene.worker.ts
    └── render.worker.ts                      — KEEP 10-step pipeline, unchanged internals
```

---

## 7. Worker Fleet & Queue Topology

Three independently-scaled pools — do not colocate them in one generic worker:

| Pool | Bottleneck | Instance profile | Concurrency/instance | Autoscale signal |
|---|---|---|---|---|
| Source workers | Network/disk I/O (`yt-dlp`) | Small (1–2 vCPU), more disk | 5–10 | queue depth + avg wait time |
| Scene workers | Light CPU (heatmap merge/score, signal extraction) | Small (1–2 vCPU) | 5–8 | queue depth |
| Render workers | CPU-bound (FFmpeg) | Large (4+ vCPU) | 1–2, tied to core count | queue depth (min 0, scale aggressively on spike) |

**Job dependency pattern:** use BullMQ `FlowProducer` — a source-acquisition job is the parent; every render job requesting that source's media is a child gated on it. Use the resource ID (`sourceId` / `sceneId`) as the BullMQ job ID so duplicate enqueues are no-ops (built-in dedup), rather than relying solely on a DB status check.

**Priority:** paid-tier export jobs get either `priority` set on the job or route into a separate high-priority export queue consumed first by the same render pool.

**Idempotency rules:**
- A render worker checks whether the deterministic output path (`{projectId}/{clipId}/final.mp4`) already exists in storage before doing any work.
- Distinguish retryable failures (quota, transient network) — exponential backoff — from terminal failures (deleted video, invalid `StudioAction`) — fail immediately, set `status = FAILED` with `errorMessage`, no retry loop.
- Set BullMQ lock duration longer than the longest expected render job to avoid false stalled-job requeues on your biggest clips.

---

## 8. Multi-Signal Scene Scoring

### 8.1 Signal extraction

```typescript
interface SignalExtractor {
  readonly signalType: "heatmap" | "transcript" | "audio_energy" | "visual_cues";
  extract(source: ProjectSource, media: AcquiredMedia): Promise<SignalTimeline>;
}

interface SignalTimeline {
  signalType: string;
  points: { timestamp: number; value: number }[]; // normalized 0–1
}
```

- `heatmap.extractor.ts` — wraps the existing official Analytics API retention curve. Only available for connected-channel videos.
- `transcript.extractor.ts` — transcription + highlight/topic detection via a hosted API (AssemblyAI/Deepgram) initially; do not self-host Whisper until volume justifies the GPU cost.
- `audio-energy.extractor.ts` — RMS energy + speech-rate over the audio track (`ffmpeg astats` filter or `librosa`), no ML needed.
- `visual-cues.extractor.ts` — scene cuts via `PySceneDetect`, face presence via Mediapipe (both open source, CPU-friendly, self-host).

### 8.2 Fusion scoring

`SceneGenerationService` sums weighted, normalized signal outputs. When a signal is unavailable for a given source (e.g., no heatmap for a low-view or paste-URL video), redistribute its weight across the remaining available signals rather than zeroing the score.

### 8.3 Performance flywheel (future, log data now)

Post-export, periodically pull each clip's real platform performance (YouTube Shorts analytics now; TikTok/Instagram later if integrated) into `ClipPerformance`. Once a few thousand labeled examples exist, train a lightweight learned reranker (gradient-boosted trees are sufficient — no deep learning needed) taking the signal-extractor outputs as features, to replace the hand-tuned linear formula. Start logging from day one even before the model exists — this is the data that becomes hard to replicate later and is the strongest differentiator in the product.

---

## 9. Heatmap-Driven Scene Selection

### 9.1 Flow

`Connect/paste URL → Select video → Heatmap + manual selection → Scoped acquisition & cut → Editor phase`

### 9.2 Heatmap source logic

```
if (video belongs to connected channel):
    use official Analytics API retention curve (via YoutubeStudioMcpService)
    overlay AI-suggested peak markers from SceneGenerationService
else (paste-URL fallback):
    do NOT attempt to scrape the public "Most Replayed" graph in production
    degrade to a transcript/audio-energy-based timeline
    label it clearly as an approximation, not "the heatmap"
```

### 9.3 Acquisition strategy

Decision made in `YoutubeMediaService`, keyed on source duration:

- **Source duration < ~20 minutes:** download the full source once, reuse it for every scene selected from it (`ProjectSource.storageKey`). Simple, cheap enough, supports re-trimming without re-downloading.
- **Source duration ≥ ~20 minutes (long-form/podcast/stream):** use `yt-dlp --download-sections` to pull only each selected scene's byte range (`ProjectScene.storageKey`). Avoids downloading a 2-hour stream to extract one 30-second clip.
- The initial cut on acquisition should be a **fast, keyframe-boundary trim** (stream copy, no re-encode) — frame-accurate precision isn't needed here because the Editor's final export re-encodes with all filters applied anyway. Don't double the encoding work.

### 9.4 UI constraints

Enforce or warn on scene duration against platform norms surfaced during research: roughly 15–45 seconds depending on target platform. Let users override, but default the drag-selection to snap toward this range.

---

## 10. AI Editing Pipeline

### 10.1 Extended `StudioAction` schema

```typescript
type StudioAction =
  | { type: "CAPTION_STYLE"; config: CaptionStyleConfig & {
        animation: "karaoke" | "highlight" | "pop" | "fade" | "slide" | "bounce" | "typewriter" | "static";
      } }
  | { type: "ZOOM"; config: ZoomConfig }
  | { type: "CROP"; config: CropConfig }
  | { type: "AUTO_REFRAME"; config: AutoReframeConfig }   // NEW — time-varying crop from FaceTrackingService
  | { type: "VIGNETTE"; config: VignetteConfig }
  | { type: "LAYOUT"; config: LayoutConfig & {
        genre?: "talking_head" | "podcast" | "reaction" | "meme" | "walkthrough";
      } }
  | { type: "MUSIC"; config: MusicConfig }
  | { type: "TRANSITION"; config: TransitionConfig }       // NEW — hard_cut | jump_cut | whip_pan | match_cut | wipe | dissolve | l_cut | j_cut
  | { type: "PACE"; config: PaceConfig }                   // NEW — remove_fillers: bool, snap_to_beat: bool
  | { type: "HOOK_OVERLAY"; config: HookOverlayConfig };    // NEW — bold text card, first ~1.5s

// All actions still pass through the existing strict schema validator before FilterGraphBuilder. This gate does not change.
```

Default every genre preset to include a `HOOK_OVERLAY` unless explicitly disabled — this is a near-universal requirement, not an optional flourish.

Offer `"static"` as a genuinely supported caption animation, not a silent fallback — karaoke-style captions have real accessibility drawbacks (reduced-motion, screen readers).

### 10.2 Two-tier prompt routing

```
User prompt
   │
   ▼
Embed + match against PatternPreset library
   │
   ├── match found ──→ preset template + LLM extracts small parameter overrides ──┐
   │                                                                               │
   └── no match     ──→ full LLM generation from scratch ──────────────────────────┤
                                                                                    ▼
                                                               Schema validation (unchanged gate)
                                                                                    │
                                                                                    ▼
                                                                    FilterGraphBuilder → FFmpeg
```

Most prompts ("podcast style," "add karaoke captions," "make it punchy") should resolve through the cheap preset-match path. Only novel/unusual requests fall through to full generation. Keep schema validation identical regardless of which path produced the output — it's the safety boundary, not a formality.

### 10.3 Pattern library maintenance

Two feeds keep `PatternPreset` current, don't treat it as a static seed list:
1. **Performance flywheel** — periodically cluster top-performing exports by preset/parameter combination; promote winners into new curated presets, demote decliners.
2. **Scheduled trend scraping** (weekly) — candidate new presets go into a human review queue before publishing; trend velocity means don't auto-publish.

---

## 11. Stage 1 Analyze — Enhancement Tasks

The Analyze stage is largely functional. These refinements close remaining gaps:

### 11.1 Drag/Drop Scene Selection on Heatmap

**Current state:** `SceneEditor.tsx` and `EditableSceneCard.tsx` support adding/removing scenes. `HeatmapChart.tsx` supports click-to-add via `onChartClick`.

**Enhancement:** Enable drag-to-create on the heatmap chart — user drags horizontally on the engagement curve to define a new scene's start/end. The chart already renders scene overlay rectangles (`ReferenceArea`). Add `onMouseDown`/`onMouseUp` handlers to create new scenes from drag range.

**Files:** `apps/web/src/presentation/components/heatmap/HeatmapChart.tsx`

### 11.2 Auto-Update Seconds/Minutes Fields

**Current state:** `EditableSceneCard.tsx` has time inputs that update scene start/end.

**Enhancement:** Bidirectional sync — when user drags on chart, time fields update; when user types in time fields, chart selection updates. Already partially working via shared state in `use-scene-editor.ts`. Verify full round-trip sync.

**Files:** `apps/web/src/application/hooks/use-scene-editor.ts`, `EditableSceneCard.tsx`

### 11.3 Video Player Progress Bar Reflecting Selected Moments

**Current state:** `VideoScenePreview.tsx` embeds YouTube player via `react-youtube`, supports play/pause/skip, seeks to scene timestamps.

**Enhancement:** Show colored markers on the player's progress bar for each selected scene. Since YouTube's embedded player doesn't expose a customizable progress bar, build a custom progress bar below the embed that shows: (a) current playback position, (b) colored segments for each selected scene, (c) click-to-seek on scenes.

**Files:** `apps/web/src/presentation/components/video/VideoScenePreview.tsx`

### 11.4 Sidebar Video Metadata

**Current state:** Dashboard shows `videoTitle`, `videoThumbnail`, `videoDuration`, `videoViewCount`, `videoUploadDate`, `videoChannelName` from the Job entity.

**Enhancement:** Display as a styled sidebar card with thumbnail, channel avatar (if available), view count with formatting (e.g., "1.2M views"), upload date relative ("3 months ago"), and duration.

**Files:** `apps/web/src/app/dashboard/page.tsx` (or new `VideoMetadataSidebar.tsx` component)

---

## 12. API Surface (additions/changes vs. original)

```
# Scoped scene acquisition (distinct from full-source acquire)
POST /api/projects/:pid/scenes/:sid/acquire

# Pattern library
GET  /api/projects/:pid/patterns
POST /api/clips/:cid/editor/actions        — now routes through PatternPresetService two-tier logic

# Billing
POST /api/billing/checkout
POST /api/billing/webhook
GET  /api/billing/usage

# YouTube (unchanged surface, changed implementation underneath)
GET  /api/youtube/status
GET  /api/youtube/channel
GET  /api/youtube/videos
GET  /api/youtube/videos/:videoId
POST /api/youtube/sync
```

All other endpoints from the original design (Projects, Sources, Generate, Scenes, Clips, Editor, Export, Download) remain as specified.

---

## 13. Security Requirements

- OAuth tokens: never sent to the browser, never logged, encrypted at rest via `OAuthCredential` + KMS, isolated from `YoutubeConnection` record.
- MCP/YouTube API access: only trusted backend processes, never exposed to frontend.
- FFmpeg: structured configuration + argument arrays only — never interpolate user/LLM-generated strings directly into a shell command.
- LLM: only ever produces `StudioAction[]`, always schema-validated before reaching `FilterGraphBuilder` — never raw shell commands, regardless of routing tier (§10.2).
- Logging: include `requestId`, `userId`, `projectId`, `sourceId`, `sceneId`, `clipId`, `exportId`. Never log OAuth tokens, client secrets, or signed URLs.

---

## 14. Pricing Tier Enforcement

### 14.1 Updated Limits

| Tier | Price | Analyses/month | Clips (scenes) | Features |
|---|---|---|---|---|
| Free | $0 | 3 | 2 | Heatmap view only, basic export |
| Pro | $20/mo | Unlimited | 10 | Full studio, prompt editing, all formats |
| Team | $40/mo | Unlimited | 20 | Everything in Pro + team seats |

### 14.2 Implementation

Update `scenesLimit` defaults in Prisma schema:
- Free: `scenesLimit = 2`
- Pro: `scenesLimit = 10`
- Team: `scenesLimit = 20`

Add enforcement in `ExportClipsUseCase`:
```typescript
const totalClips = await clipRepository.countByUser(userId);
const user = await userRepository.findById(userId);
if (user.scenesLimit !== -1 && totalClips + requestedClips > user.scenesLimit) {
  throw new ScenesLimitExceededException(user.scenesLimit, totalClips, requestedClips);
}
```

### 14.3 Upgrade Prompt

When limit is reached, show inline upgrade prompt in the Studio UI with link to `/pricing`.

---

## 15. Feature Flags

```typescript
const FEATURE_FLAGS = {
  SPIKECLIP_PROJECT_PIPELINE: true,
  YOUTUBE_MCP_INTEGRATION: true,        // toggled off once direct-API replacement ships
  YOUTUBE_DIRECT_API: false,            // NEW — flip on when §3.1 replacement is validated
  MANUAL_HEATMAP_SELECTION: true,       // NEW
  SIGNAL_FUSION_SCORING: false,         // NEW — enable once transcript/audio/visual extractors ship
  PATTERN_PRESET_ROUTING: false,        // NEW
  SMART_CROP_TRACKING: false,           // NEW
  NEW_EXTRACT_UI: true,
  NEW_EDITOR_PIPELINE: true,
  NEW_EXPORT_PIPELINE: true,
  LEGACY_URL_FLOW: true,
};
```

---

## 16. Tech Stack by Stage

| Layer | MVP (0–1k users) | Growth (1k–50k) | Scale (50k+) |
|---|---|---|---|
| Frontend | Next.js on Vercel | Same | Same + edge caching |
| API | NestJS, single instance | NestJS on ECS/Fly, 2–3 replicas | Horizontally scaled |
| DB | Managed Postgres (small) | RDS/Cloud SQL + read replica | + partitioning on high-volume tables |
| Queue | Redis + BullMQ, single node | Managed Redis, per-job-type queues | Tuned concurrency per pool |
| Render workers | Docker + FFmpeg, autoscale 0–3 | Dedicated pool (ECS/GKE), queue-depth scaling | Spot-instance pool, GPU tier if AI-heavy steps added |
| Storage | B2/S3, no CDN | S3 + CloudFront | + lifecycle rules for cold sources |
| LLM | Pay-per-call | + response caching | Cheaper model for simple routing, frontier model for novel edits |
| Billing | Stripe Checkout + webhooks | Stripe metered billing on quota units | Same |

---

## 17. Testing Strategy

### 17.1 Unit Tests

| Test File | What It Tests |
|---|---|
| `prompt-translation.service.spec.ts` | LLM call formatting, response parsing, validation |
| `filter-graph-builder.spec.ts` | Action→filter mapping, filter_complex assembly, edge cases |
| `studio-actions.schema.spec.ts` | Zod schema validation for all action types |
| `preview-cache.spec.ts` | Cache key generation, hit/miss, TTL |
| `platform-encoding.spec.ts` | Platform preset selection, duration enforcement |

### 17.2 Integration Tests

| Test | What It Tests |
|---|---|
| Prompt → Actions → FFmpeg command | Full translation pipeline |
| Preview render (mocked FFmpeg) | End-to-end preview flow |
| Export with actions | Full export with new action system |
| Platform encoding compliance | Output matches platform specs |

### 17.3 E2E Tests

| Test | What It Tests |
|---|---|
| Chat → preview → export | Full user flow in studio |
| Multiple prompts stacking | Actions accumulate correctly |
| Ambiguity resolution | Clarification flow works |
| Pricing enforcement | Limit blocks at threshold |

### 17.4 Performance Tests

| Metric | Target |
|---|---|
| LLM translation response | < 5s (p95) |
| Preview render (480p, 15s clip) | < 15s |
| Export render (1080p, 30s clip) | < 60s |
| Preview cache hit | < 500ms |
| Chat input → first action | < 3s |

---

## 18. Deployment & Migration

### 18.1 Environment Variables

```bash
# LLM
LLM_PROVIDER=openai          # "openai" | "anthropic"
LLM_API_KEY=sk-...           # API key
LLM_MODEL=gpt-4o-mini        # Model name
LLM_MAX_TOKENS=2000
LLM_TEMPERATURE=0.2

# Preview
PREVIEW_QUALITY=480p
PREVIEW_FPS=15
PREVIEW_MAX_DURATION=30
PREVIEW_CACHE_TTL_MS=3600000  # 1 hour
```

### 18.2 Database Migration

```prisma
// Update default scenesLimit
model User {
  scenesLimit     Int      @default(2)  // was 3
  // ... rest unchanged
}
```

Note: Existing free users keep their current limit. New users get 2. Pro/Team users get their respective limits via Stripe webhook.

### 18.3 Redis Queue

Add `preview` queue alongside existing `analysis` and `export` queues. No new Redis infrastructure needed.

### 18.4 Storage

Add `previews/` prefix in MinIO bucket for cached preview files. Add TTL cleanup job (delete files older than 1 hour).

### 18.5 CI/CD

Add to pipeline:
1. `pnpm lint` (type-check)
2. `pnpm test` (all packages)
3. `pnpm build`
4. Deploy

### 18.6 Monitoring

| Metric | Tool | Alert Threshold |
|---|---|---|
| LLM token usage/user/day | Custom counter | > 100K tokens |
| LLM API errors | Sentry | > 5% error rate |
| Preview render time | Custom histogram | p95 > 20s |
| Export render time | Custom histogram | p95 > 90s |
| Preview cache hit rate | Custom counter | < 30% hit rate |
| BullMQ queue depth | Redis info | preview > 10 pending |

### 18.7 Migration Strategy

Phase A (new architecture behind flags) → Phase B (new UI uses project architecture) → Phase C (legacy URL flow stays available) → Phase D (migrate existing jobs) → Phase E (remove old `Job`-centric pipeline). **Put a calendar date on Phase E now** — "once validated" without a deadline tends to never arrive, leaving two permanent systems to maintain.

---

## 19. Task Breakdown

**Build order (walking skeleton first, not horizontal layers):** get one user, one video, one manually-selected scene, through to a downloaded MP4, end-to-end, before polishing any single layer. This validates the riskiest unknowns — per-user YouTube auth actually working, and the acquisition/render pipeline producing a correct file — in the first days of work, not after weeks of layer-by-layer building.

### Phase A: YouTube Integration + Project Model (Weeks 1–3)

| Task | Hours | Description |
|---|---|---|
| A.1 Implement YoutubeStudioProvider interface | 8 | YouTube Data API v3 + Analytics API direct calls |
| A.2 Implement AuthTokenVaultService | 12 | Encrypt/store/refresh per-user OAuth tokens |
| A.3 Implement YouTubeQuotaGuard | 8 | Track shared daily quota, gate outbound calls |
| A.4 Prisma schema migration for new models | 6 | YoutubeConnection, OAuthCredential, Project, ProjectSource, ProjectScene, GeneratedClip |
| A.5 Implement ProjectService + SourceService | 12 | Project CRUD, source discovery, state machines |
| A.6 Implement YoutubeMediaService reshape | 8 | Scoped section-download support, duration-based strategy |
| A.7 Unit tests for A.1–A.6 | 12 | Comprehensive test coverage |

**Deliverable:** User can connect YouTube channel, browse videos, create a project, add sources.

### Phase B: Heatmap + Manual Selection (Weeks 3–5)

| Task | Hours | Description |
|---|---|---|
| B.1 Heatmap source logic (Analytics API vs fallback) | 8 | Official retention curve for connected videos, transcript/audio-energy fallback |
| B.2 Drag-to-create scene selection on heatmap | 10 | onMouseDown/onMouseUp on HeatmapChart, ReferenceArea |
| B.3 Bidirectional time field sync | 4 | Chart drag ↔ time fields round-trip |
| B.4 Custom progress bar with scene markers | 8 | Colored segments, click-to-seek |
| B.5 Video metadata sidebar | 4 | Thumbnail, channel avatar, formatted views/date |
| B.6 Scoped acquisition worker | 8 | Source worker honoring duration-based strategy |
| B.7 Integration tests | 8 | End-to-end: connect → select → acquire → cut |

**Deliverable:** User can connect channel, view heatmap, drag-select scenes, acquire only selected range.

### Phase C: Studio — Prompt-Based Editing (Weeks 5–8)

| Task | Hours | Description |
|---|---|---|
| C.1 Define StudioAction types in shared | 6 | All action interfaces + Zod schemas (10 types) |
| C.2 Implement PromptTranslationService | 14 | LLM API integration, system prompt, response parsing, validation |
| C.3 Implement PatternPresetService | 10 | Embedding match + routing, preset library |
| C.4 Implement FilterGraphBuilder | 18 | Action→FFmpeg filter mapping, filter_complex assembly |
| C.5 Enhance FFmpegService | 10 | New filter support (animations, styles, transitions, speed, overlays) |
| C.6 Add output quality/format encoding | 4 | CRF control, WebM/VP9, resolution presets |
| C.7 Unit tests for C.2–C.6 | 12 | Comprehensive test coverage |

**Deliverable:** Prompt → FFmpeg pipeline works end-to-end via API.

### Phase D: Chat UI + Preview (Weeks 8–10)

| Task | Hours | Description |
|---|---|---|
| D.1 Build ChatPanel, ChatMessage, ChatInput components | 10 | Conversational UI in Studio |
| D.2 Build ActionList, ActionCard components | 6 | Display and manage applied actions |
| D.3 Build ClarificationCard component | 4 | LLM ambiguity resolution UI |
| D.4 Refactor StudioLayout to 3-panel | 6 | Chat | Preview | SceneSelector |
| D.5 Implement PreviewPanel | 6 | Video player with transport controls |
| D.6 Implement preview queue (BullMQ) | 8 | Background preview rendering |
| D.7 Implement preview caching (MinIO) | 4 | Cache key generation, TTL, storage |
| D.8 POST /api/studio/preview endpoint | 4 | API endpoint for preview requests |
| D.9 Extend use-studio.ts reducer | 6 | New state: messages, actions, previewUrl |
| D.10 Integration tests | 8 | Chat → translate → preview → render flow |

**Deliverable:** Full chat-based editing with live server-side preview.

### Phase E: Export + Pricing (Weeks 10–12)

| Task | Hours | Description |
|---|---|---|
| E.1 Update ExportClipsDto for actions | 4 | Accept StudioAction[] in export request |
| E.2 Refactor ClipWorker pipeline | 10 | Unified action pipeline, 3 worker pools |
| E.3 Platform-specific encoding | 4 | Encoding presets per platform |
| E.4 Quality/format selection in export | 4 | 480p/720p/1080p, mp4/webm |
| E.5 Pricing tier enforcement | 8 | scenesLimit check, upgrade prompts, UsageRecord tracking |
| E.6 Update ExportPanel UI | 4 | Quality/format/platform selectors |
| E.7 E2E tests | 8 | Full flow: chat → preview → export → download |

**Deliverable:** Complete export pipeline with pricing enforcement.

### Phase F: Polish + Launch (Weeks 12–13)

| Task | Hours | Description |
|---|---|---|
| F.1 Design pass on chat UI | 6 | NFR-8 compliance, elegant-brand bar |
| F.2 Error handling + retry | 4 | LLM failures, FFmpeg failures, timeout handling |
| F.3 Rate limiting for LLM calls | 4 | Per-user token limits |
| F.4 Sentry integration for new services | 2 | Error tracking |
| F.5 Documentation | 2 | API docs, prompt examples, architecture |
| F.6 Performance optimization | 4 | Preview render time, filter chain optimization |

**Deliverable:** Production-ready prompt-based editing studio.

### Effort Summary

| Phase | Hours | Weeks (part-time) |
|---|---|---|
| A: YouTube Integration | 66 | 2–3 |
| B: Heatmap + Selection | 50 | 2–3 |
| C: Studio — Editing | 74 | 3–4 |
| D: Chat UI + Preview | 62 | 3–4 |
| E: Export + Pricing | 42 | 2 |
| F: Polish + Launch | 22 | 1 |
| **Total** | **316** | **~13–17 weeks** |

At 20 hrs/week: ~16 weeks. At 30 hrs/week: ~11 weeks.

---

## 20. Risk Mitigations

### Engineering Risks

| Risk | Impact | Mitigation |
|---|---|---|
| LLM generates invalid FFmpeg | High | Zod validation + graceful error + retry with correction prompt |
| LLM API downtime | High | Cache common prompt→action patterns, show "try again later" |
| Preview render too slow | Medium | 480p + 15fps cap, timeout at 30s, show spinner |
| FFmpeg filter_complex too long | Medium | Limit to 10 actions per prompt, split into multiple passes if needed |
| LLM costs high | Medium | Use gpt-4o-mini ($0.15/1M input tokens), cache translations |
| User writes unintelligible prompts | Medium | Clarification flow + suggestion chips + example prompts |
| Preview cache storage grows | Low | TTL cleanup + max 50 previews per user |
| Platform encoding differences break output | Medium | Platform presets tested against each platform's upload requirements |
| Worker lifecycle fragility | Medium | Redis reconnection with exponential backoff, graceful shutdown with 30s grace period |
| yt-dlp flakiness | Medium | 5-minute timeouts, 3 retries with backoff, Redis metadata caching, distributed lock for concurrent requests |

### Open Risks — Do Not Resolve Unilaterally

An agent should implement around these but flag rather than silently decide:

1. **Status of the Google quota-increase application.** Blocks safe multi-tenant scaling; confirm before assuming headroom.
2. **Whether to build "Most Replayed" scraping at all**, even as a degraded fallback — this is a product/legal call given ToS risk (§3.3), not an engineering one.
3. **The exact duration threshold for full-vs-scoped source acquisition** (§9.3) — 20 minutes is a reasonable starting default, not a validated number. Confirm against real usage once available.
4. **Project lifecycle management.** What happens when a user abandons a project mid-flow? Define idle project cleanup, stale source media deletion, and orphaned temporary file reclamation.
5. **Data migration for existing users.** Existing users have Jobs with scenes and clips. How do those map to the new Project/Source/Scene/Clip hierarchy?
6. **Rollback strategy.** If the new project pipeline ships and breaks something, how do you roll back? Feature flags help, but document the rollback procedure.

---

## 21. File Impact Summary

### New Files

| Path | Purpose |
|---|---|
| `packages/shared/src/types/studio-actions.ts` | Action type definitions + Zod schemas |
| `apps/api/src/infrastructure/youtube/auth-token-vault.service.ts` | OAuth token encryption/storage |
| `apps/api/src/infrastructure/youtube/youtube-quota-guard.service.ts` | Shared quota tracking |
| `apps/api/src/infrastructure/external/prompt-translation.service.ts` | LLM integration |
| `apps/api/src/infrastructure/external/filter-graph-builder.ts` | FFmpeg filter_complex builder |
| `apps/api/src/infrastructure/external/preview-cache.service.ts` | Preview caching |
| `apps/api/src/application/services/signal-extractors/heatmap.extractor.ts` | Heatmap signal extraction |
| `apps/api/src/application/services/signal-extractors/transcript.extractor.ts` | Transcript signal extraction |
| `apps/api/src/application/services/signal-extractors/audio-energy.extractor.ts` | Audio energy signal extraction |
| `apps/api/src/application/services/signal-extractors/visual-cues.extractor.ts` | Visual cues signal extraction |
| `apps/api/src/application/services/pattern-preset.service.ts` | Embedding match + routing |
| `apps/api/src/application/services/job-orchestrator.service.ts` | Job dependency resolution |
| `apps/api/src/infrastructure/workers/preview.worker.ts` | Preview render worker |
| `apps/web/src/presentation/components/studio/ChatPanel.tsx` | Chat UI |
| `apps/web/src/presentation/components/studio/ChatMessage.tsx` | Message bubble |
| `apps/web/src/presentation/components/studio/ChatInput.tsx` | Text input |
| `apps/web/src/presentation/components/studio/ActionList.tsx` | Applied actions |
| `apps/web/src/presentation/components/studio/ActionCard.tsx` | Single action |
| `apps/web/src/presentation/components/studio/ClarificationCard.tsx` | Clarification prompt |
| `apps/web/src/presentation/components/studio/PreviewPanel.tsx` | Preview player |

### Modified Files

| Path | Changes |
|---|---|
| `apps/api/prisma/schema.prisma` | New models: YoutubeConnection, OAuthCredential, Project, ProjectSource, ProjectScene, GeneratedClip, ClipPerformance, PatternPreset, UsageRecord, PlanQuota, Subscription |
| `apps/api/src/infrastructure/external/ffmpeg.service.ts` | Add animation, style, transition, speed, overlay filters |
| `apps/api/src/infrastructure/workers/clip.worker.ts` | Unified action pipeline, 3 worker pools |
| `apps/api/src/application/dto/export-clips.dto.ts` | Add actions field, quality/format |
| `apps/api/src/main.ts` | Register preview queue, 3 worker pools |
| `apps/web/src/application/hooks/use-studio.ts` | New state for chat/actions/preview |
| `apps/web/src/app/studio/page.tsx` | 3-panel layout |
| `apps/web/src/domain/entities/studio.ts` | New types |
| `apps/web/src/domain/ports/job-api.port.ts` | Add preview endpoint |
| `apps/web/src/infrastructure/api/job-api.client.ts` | Add preview API call |
| `apps/web/src/presentation/components/heatmap/HeatmapChart.tsx` | Drag-to-create scene selection |
| `apps/web/src/presentation/components/video/VideoScenePreview.tsx` | Custom progress bar with scene markers |

---

## 22. Example User Journey

1. **User logs in** → Google OAuth → redirected to dashboard
2. **User clicks "Connect YouTube"** → YouTube OAuth → channel linked
3. **User creates a SpikeClip Project** → named "My Podcast Highlights"
4. **User browses videos** → sees list of their YouTube videos with thumbnails, views, duration
5. **User selects a video** → heatmap loads (official Analytics API retention curve)
6. **AI suggests peak markers** → 3 candidate high-engagement moments highlighted on heatmap
7. **User drags on heatmap** → manually selects a 20s moment the AI missed
8. **System acquires only that range** → scoped section download via yt-dlp (video is 45min, so section download)
9. **User clicks "Open in Studio"** → navigates to editor with scene loaded
10. **User selects platform** → "YouTube Shorts" (9:16 locked)
11. **User types in chat:** _"Add bold white captions saying 'Wait for it...' from 0-2s, then 'HERE WE GO!' in neon style from 5-8s with a pop animation"_
12. **LLM translates** → 2 `add_captions` actions returned
13. **System renders preview** → 480p preview appears, user watches it
14. **User types:** _"Also mix in some chill beats at 30% volume with a 2s fade in"_
15. **LLM translates** → 1 `mix_audio` action appended (total: 3 actions)
16. **Preview re-renders** → Updated preview with captions + music
17. **User types:** _"And add a vignette effect"_
18. **Actions stack** → 4 total actions, preview updates
19. **User satisfied** → Clicks "Export" → Selects 1080p MP4 → Export renders asynchronously
20. **Live status updates** → SSE shows: Queued → Rendering → Uploading → Completed
21. **User downloads** → 1080p MP4 clip with all effects applied, via signed URL

---

## 23. UI/UX Overhaul

Comprehensive visual refresh across all public-facing pages. Focus on refined dark mode, animated elements, and consistent design system.

### 23.1 Color System

**Dark mode (primary):**
- Background: `hsl(222, 47%, 5%)` — near-black
- Card: `hsl(222, 47%, 8%)`
- Border: `hsl(217, 20%, 15%)`
- Surface: `hsl(222, 47%, 10%)`
- Primary accent: `hsl(354, 79%, 65%)` — crimson

**Light mode:**
- Background: `hsl(0, 0%, 98%)`
- Card: `hsl(0, 0%, 100%)`
- Border: `hsl(220, 13%, 91%)`

### 23.2 Components

| Component | File | Purpose |
|-----------|------|---------|
| `DotsBackground` | `layout/DotsBackground.tsx` | CSS `radial-gradient` dot pattern (24px grid, 0.4 opacity) |
| `FloatingIcon` | `features/FloatingIcon.tsx` | CSS keyframe floating animation (4-6s loops) |
| `GlowOrb` | `features/GlowOrb.tsx` | Pulsing radial gradient effect |
| `HeatmapWave` | `features/HeatmapWave.tsx` | SVG path morphing with crimson gradient |

### 23.3 Page Updates

| Page | Changes |
|------|---------|
| Home | Floating icons (film, scissors, play), glow orbs, heatmap wave divider, dots background |
| About | Hero + 3-column grid (What/Why/Who) + monetization data section |
| Login | Dots background + dual glow orbs |
| Pricing | Hero section with glow, dots background on tiers |
| Features | Dots backgrounds on hero and feature grid |
| Privacy/Terms | Subtle dots background |

### 23.4 Logo/Favicon

All SVGs updated with:
- Filled dark background (`#09090b` / `#171717` gradient)
- SVG glow filter on stroke paths
- Refined gradient transitions
- Animated opacity on favicon/icon variants

---

## 24. Instructions for the Coding Agent

**Build order (walking skeleton first, not horizontal layers):** get one user, one video, one manually-selected scene, through to a downloaded MP4, end-to-end, before polishing any single layer. This validates the riskiest unknowns — per-user YouTube auth actually working, and the acquisition/render pipeline producing a correct file — in the first days of work, not after weeks of layer-by-layer building.

**Do not touch without flagging:** `FilterGraphBuilder`, the FFmpeg filter construction internals, the existing heatmap merge/score/select algorithm, BullMQ configuration, the storage abstraction, or the OpenReel postMessage protocol. These are working systems being wrapped in new architecture, not rewritten.

**Conventions:**
- TypeScript strict mode throughout.
- All MCP/YouTube API calls go through `YoutubeStudioProvider` — no direct calls from controllers, use-cases, or workers.
- All worker job handlers must be idempotent (§7) — verify existing output before doing work, not just on retry.
- Every `StudioAction[]` — from either routing tier in §10.2 — passes the same schema validator before reaching `FilterGraphBuilder`. No exceptions, no fast paths that skip validation.
- Never interpolate raw strings into FFmpeg shell invocations; use argument arrays.

**Definition of done** (extends the original acceptance criteria): a user can connect a channel, browse videos, view a heatmap for a selected video, manually drag-select one or more scenes, have the system acquire only that scoped range, edit via natural-language prompt (routed through preset match or fallback generation, both schema-validated), preview, export asynchronously with live status updates, and download — while the system enforces per-plan quota before jobs reach a worker, and recovers cleanly from MCP/YouTube/yt-dlp/FFmpeg/queue/storage failures without corrupting `Project`/`Source`/`Scene`/`Clip` state.

---

## Appendix A: FFmpeg Filter Reference

Quick reference for the filters used in this plan:

| Filter | Syntax | Purpose |
|---|---|---|
| `drawtext` | `text='...':fontfile=...:fontsize=...:fontcolor=...:x=...:y=...:borderw=...:shadowx=...:shadowy=...:box=1:boxcolor=...` | Text overlay with outline, shadow, box |
| `drawbox` | `x=...:y=...:w=...:h=...:color=...:t=fill` | Colored rectangle (`t=fill` for solid) |
| `crop` | `crop=w:h:x:y` | Crop video region (default centers) |
| `scale` | `scale=w:h` (`-1` = keep AR, `-2` = keep AR even) | Resize video |
| `vignette` | `vignette=angle` (0=none, PI/2=max) | Darkened edges |
| `zoompan` | `zoompan=z=...:d=1:s=WxH:fps=N:x=...:y=...` | Ken Burns (d=1 for video) |
| `boxblur` | `boxblur=luma_radius:luma_power` | Blur |
| `unsharp` | `unsharp=lx:ly:la:cx:cy:ca` (matrix 3-23 odd, amount -1.5 to 1.5) | Sharpen/blur |
| `hue` | `hue=s=0` (0=grayscale, 1=original, >1=boost) | Desaturate/saturate |
| `colorchannelmixer` | `colorchannelmixer=rr:rg:rb:ra:...` (4x4 matrix, range [-2,2]) | Color matrix (sepia, B&W) |
| `rgbashift` | `rgbashift=rh=...:rv=...:bh=...:edge=smear` | Chromatic aberration / glitch |
| `noise` | `noise=alls=...:allf=t` | Add noise |
| `overlay` | `overlay=x:y:enable='between(t,s,e)'` | Image overlay with timing |
| `volume` | `volume=0.5` or `volume=-6dB` | Audio gain |
| `afade` | `afade=t=in/out:st=start:d=duration:curve=tri` | Audio fade (22 curve types) |
| `equalizer` | `equalizer=f=freq:t=q:w=bandwidth:g=gain_dB` | Parametric EQ |
| `amix` | `amix=inputs=N:duration=first:normalize=0:weights='1 0.25'` | Mix audio streams |
| `setpts` | `setpts=0.5*PTS` (2x speed), `setpts=2.0*PTS` (0.5x speed) | Video speed (inverse) |
| `atempo` | `atempo=0.5` to `atempo=100` (chain for >2x: `atempo=sqrt(N),atempo=sqrt(N)`) | Audio speed |
| `fade` | `fade=t=in/out:st=start_time:d=duration:color=black` | Video fade |
| `xfade` | `xfade=transition=TYPE:duration=D:offset=O` (56 types) | Cross-fade between clips |
| `subtitles` | `subtitles=file:force_style='...'` | SRT subtitle overlay |

---

## Appendix B: StudioAction — Full Action Schema

```typescript
// packages/shared/src/types/studio-actions.ts

type StudioAction =
  | AddCaptionsAction
  | MixAudioAction
  | ApplyEffectAction
  | SetSpeedAction
  | AddOverlayAction
  | SetTransitionAction
  | AddBackgroundAction
  | TrimAction;

interface AddCaptionsAction {
  action: "add_captions";
  text: string;
  font: "inter" | "impact" | "bebas" | "playfair" | "mono";
  size: number;          // 12-120, default 48
  color: string;         // hex "#FFFFFF"
  position: "top" | "center" | "bottom";
  start: number;         // seconds
  end: number;           // seconds
  animation: "fade" | "slide" | "pop" | "typewriter" | "none";
  style: "normal" | "bold" | "outlined" | "shadow" | "neon";
  opacity: number;       // 0-1, default 1
  backgroundColor?: string;  // hex, optional background box
  backgroundEnabled?: boolean;
  strokeWidth?: number;  // for outlined style, default 2
  shadowRadius?: number; // for shadow style, default 2
  x?: number;            // 0-100 percentage override
  y?: number;            // 0-100 percentage override
}

interface MixAudioAction {
  action: "mix_audio";
  volume: number;         // 0-1, music volume
  originalVolume: number; // 0-1, original audio volume
  fadeIn: number;         // seconds
  fadeOut: number;        // seconds
  startTime?: number;     // when music starts (default 0)
  tone?: "normal" | "bass_boost" | "treble_boost" | "warm";
}

interface ApplyEffectAction {
  action: "apply_effect";
  type: "vignette" | "zoom_in" | "zoom_out" | "blur" | "sharpen" | "sepia" | "bw" | "glitch" | "glow";
  intensity: number;      // 0-1, default 0.7
  startTime?: number;     // when effect starts (default 0)
  endTime?: number;       // when effect ends (default full duration)
}

interface SetSpeedAction {
  action: "set_speed";
  rate: number;           // 0.25-4.0, default 1.0
  preservePitch: boolean; // default true
}

interface AddOverlayAction {
  action: "add_overlay";
  assetKey: string;       // storage key for image
  x: number;              // 0-100 percentage
  y: number;              // 0-100 percentage
  scale: number;          // 0.1-2.0, default 1.0
  opacity: number;        // 0-1, default 1.0
  startTime?: number;
  endTime?: number;
}

interface SetTransitionAction {
  action: "set_transition";
  type: "fade" | "slide_left" | "slide_right" | "zoom" | "wipe";
  duration: number;       // seconds, default 0.5
  position: "start" | "end"; // transition in or out
}

interface AddBackgroundAction {
  action: "add_background";
  color: string;          // hex
  startTime: number;
  endTime: number;
}

interface TrimAction {
  action: "trim";
  startTime: number;
  endTime: number;
}
```

### Example Prompt-to-Action Translations

**Prompt:** _"Add bold white captions saying 'This Changes Everything' from second 0 to 3 with a fade in"_

```json
[{
  "action": "add_captions",
  "text": "This Changes Everything",
  "font": "impact",
  "size": 56,
  "color": "#FFFFFF",
  "position": "center",
  "start": 0,
  "end": 3,
  "animation": "fade",
  "style": "bold",
  "opacity": 1
}]
```

**Prompt:** _"Mix in lo-fi music at 40% volume with 2s fade in and 3s fade out, and make the original audio quieter"_

```json
[{
  "action": "mix_audio",
  "volume": 0.4,
  "originalVolume": 0.6,
  "fadeIn": 2,
  "fadeOut": 3
}]
```

**Prompt:** _"Speed it up to 2x and add a vignette, also put my logo in the top right corner from 1s to the end"_

```json
[
  { "action": "set_speed", "rate": 2.0, "preservePitch": true },
  { "action": "apply_effect", "type": "vignette", "intensity": 0.7 },
  { "action": "add_overlay", "assetKey": "user-logo.png", "x": 85, "y": 5, "scale": 0.3, "opacity": 0.8, "startTime": 1 }
]
```

**Prompt:** _"Make it black and white with a slow zoom in, and add a fade transition at the start"_

```json
[
  { "action": "apply_effect", "type": "bw", "intensity": 1 },
  { "action": "apply_effect", "type": "zoom_in", "intensity": 0.5 },
  { "action": "set_transition", "type": "fade", "duration": 1.0, "position": "start" }
]
```

**Prompt:** _"Add captions from 0-2s saying 'Wait for it', then from 5-8s add 'Here we go!' in neon style"_

```json
[
  { "action": "add_captions", "text": "Wait for it", "font": "inter", "size": 48, "color": "#FFFFFF", "position": "center", "start": 0, "end": 2, "animation": "none", "style": "normal" },
  { "action": "add_captions", "text": "Here we go!", "font": "impact", "size": 56, "color": "#00FFFF", "position": "center", "start": 5, "end": 8, "animation": "pop", "style": "neon", "strokeWidth": 2 }
]
```

### Ambiguity Resolution

When the LLM detects ambiguous or incomplete prompts, it returns a **clarification request** instead of actions:

```json
{
  "type": "clarification",
  "question": "You mentioned adding captions. What text would you like, and during which time range?",
  "suggestions": [
    "Add 'highlight moment' from 0-3s in bold",
    "Add captions for the full clip duration"
  ]
}
```

The chat UI displays this as a system message with clickable suggestions.

---

## Appendix C: Example Assembled FFmpeg Command

For prompt: _"Add bold captions 'Epic' from 0-3s with fade, vignette, 1.5x speed, lo-fi music at 40% volume"_

```bash
ffmpeg -y -ss 10.0 -i /tmp/scene.mp4 -t 15.0 \
  -filter_complex "
    [0:v]crop=ih*9/16:ih,scale=1080:1920,
    drawtext=text='Epic':fontfile=/usr/share/fonts/DejaVuSans-Bold.ttf:
      fontsize=48:fontcolor=white:borderw=2:bordercolor=black:
      alpha='if(between(t,0,0.3),clip(t/0.3,0,1),1)':
      enable='between(t,0,3)':x=(w-text_w)/2:y=(h-text_h)/2[v1];
    [v1]vignette=angle=PI/4[v2];
    [v2]setpts=PTS/1.5[v3];
    [0:a]atempo=1.5,volume=1[a0];
    [1:a]volume=0.4,afade=t=in:d=2,afade=t=out:st=12:d=3[music];
    [a0][music]amix=inputs=2:duration=first:normalize=0[aout]
  " \
  -map "[v3]" -map "[aout]" \
  -c:v libx264 -crf 23 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac /tmp/output.mp4
```

---

## Appendix D: Platform Encoding Presets

| Platform | Aspect | Resolution | Max Duration | Codec | Audio | Max Size |
|---|---|---|---|---|---|---|
| YouTube Shorts | 9:16 | 1080x1920 | 60s | H.264 | AAC 128kbps | 256MB |
| Instagram Reels | 9:16 | 1080x1920 | 90s | H.264 | AAC 128kbps | 256MB |
| TikTok | 9:16 | 1080x1920 | 180s | H.264 | AAC 128kbps | 287MB |

```typescript
function getPlatformEncodingPreset(platform: PlatformId): EncodingPreset {
  const presets = {
    "youtube-shorts": {
      maxDuration: 60,
      resolution: { width: 1080, height: 1920 },
      videoCodec: "libx264",
      audioCodec: "aac",
      audioBitrate: "128k",
      extraFlags: ["-movflags", "+faststart"],
    },
    "instagram-reels": {
      maxDuration: 90,
      resolution: { width: 1080, height: 1920 },
      videoCodec: "libx264",
      audioCodec: "aac",
      audioBitrate: "128k",
      extraFlags: ["-movflags", "+faststart"],
    },
    "tiktok": {
      maxDuration: 180,
      resolution: { width: 1080, height: 1920 },
      videoCodec: "libx264",
      audioCodec: "aac",
      audioBitrate: "128k",
      extraFlags: ["-movflags", "+faststart"],
    },
  };
  return presets[platform];
}
```

---

## Appendix E: Preview Rendering Configuration

| Parameter | Value | Rationale |
|---|---|---|
| Resolution | 480p (854x480) | Fast render, good enough for preview |
| FPS | 15 | Reduces frame count by 2.5x |
| CRF | 32 | Lower quality = faster encode |
| Timeout | 30s | Kill if too slow |
| Max preview length | 30s | Cap for long scenes |

```typescript
function previewCacheKey(sceneId: string, actions: StudioAction[], platform: PlatformId): string {
  const sorted = JSON.stringify(actions, Object.keys(actions[0] || {}).sort());
  const hash = createHash("sha256").update(`${sceneId}:${platform}:${sorted}`).digest("hex");
  return `preview/${hash}.mp4`;
}
```
