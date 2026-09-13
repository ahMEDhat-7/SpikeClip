# SpikeClip — Master Plan

> Find what viewers actually rewatch — then make it beautiful.

This merges the validation-first sequencing with the system architecture, which is being carried forward as-is. Nothing in Part II gets built until Part I produces a "go."

---

## Part I — Validation (Before Any Code)

### 0. Philosophy & Positioning

Two products, one sequence:

- **Stage 1 — SpikeClip:** extracts and reformats the most-replayed moments from a YouTube video using audience heatmap data — the wedge, and the thing that makes you different from AI-guessing tools.
- **Stage 2 — Prompt Editing Layer:** captions, cleanup, and styling on top of Stage 1's clips — a commodity layer, built once Stage 1 has demand.

> **Editing engine direction — OpenReel integration.** Stage 2's Studio is being re-architected on the open-source [OpenReel](https://openreel.video) architecture ([MIT](https://github.com/Augani/openreel-video)): a non-destructive multi-track timeline as the single source of truth, a typed editing-tool registry shared by manual *and* AI edits, a model-agnostic AI agent (OpenAI / Anthropic / local, dry-run planning, undo-a-turn), and hybrid rendering (server `yt-dlp` ingest/transcode + in-browser WebCodecs/WebGPU compositing/export). `StudioAction` stays as a legacy/translation layer during the transition.

**Audience lens — "elegant creative people":** design-conscious creators (film, art, fashion, lifestyle, premium tutorials) who'd be embarrassed by a clip with a generic neon caption template. This filters your ICP, your interview candidates, and every visual decision later — see Appendix B.

### Phase 0 — Define the Wedge

**Tasks:** write the one-sentence value prop ("shows you which moments people actually rewatched, so you clip the right ones — not the ones an AI guesses"); name 3 competitors and why heatmap-based beats AI-guessed; pick the one metric that would prove the wedge; explicitly deprioritize Stage 2 in writing.
**Deliverable:** one page — value prop, proof metric, non-goals.
**Est. time:** 1 day

### Phase 1 — ICP Definition & Discovery Prep

**Tasks:** define the persona (e.g. solo YouTubers, 20K–200K subs, visually-driven niche, currently cut their own shorts manually) and explicit exclusions (faceless/meme/high-volume-low-craft channels); source 30–50 reachable candidates; draft non-salesy outreach; build an interview question bank.
**Deliverable:** persona doc + reachable candidate list + outreach draft.
**Est. time:** 2–3 days

### Phase 2 — Discovery Interviews & Signal Synthesis

**Tasks:** run 10–15 conversations on how they currently pick moments, time spent, past bad picks, trust in watch-data vs. instinct, what "cheap" tools have put them off; log verbatim; tag strong/weak/no-signal; note aesthetic cues specifically.
**Deliverable:** synthesis doc with top 3 pains, differentiator resonance, go/no-go recommendation.
**Est. time:** 1–2 weeks (mostly waiting on replies)

### Phase 3 — Concierge MVP (Manual, No UI)

**Tasks:** consolidate the algorithm to one canonical version (Appendix A — now resolved below); recruit 5–10 strong-signal participants; run their videos through the script by hand, cut and reformat with FFmpeg, hand-deliver clips with the reasoning behind each pick; have them post and track performance vs. their usual shorts; collect structured feedback; track your own time-per-video.
**Deliverable:** 5–10 real creators with real clips, at least some posted, performance + qualitative data collected.
**Est. time:** 1–2 weeks

### Phase 4 — Go / No-Go Decision Gate

**Tasks:** compare heatmap-selected vs. self-selected clip performance; tally willingness-to-pay signals; revisit the Phase 0 wedge statement against reality; make an explicit call.
**Deliverable:** one-page decision memo.
**Est. time:** 2–3 days

**Nothing in Part II starts until Phase 4 is a "go."**

---

## Part II — Product & System Design (Confirmed Architecture)

### 1. Product Overview

**Target Users**

| Segment               | Use Case                                        | Willingness to Pay |
| --------------------- | ----------------------------------------------- | ------------------ |
| Solo content creators | Repurpose long-form videos into shorts          | $15–25/mo          |
| Social media agencies | Batch process client videos, team collaboration | $40–60/mo          |
| YouTubers/TikTokers   | Find viral moments to repackage                 | $10–20/mo          |

**Revenue Model**

| Tier | Price  | Credits       | Features                                   |
| ---- | ------ | ------------- | ------------------------------------------ |
| Free | $0     | 3 analyses/mo | View heatmap only, no downloads            |
| Pro  | $19/mo | Unlimited     | Full pipeline, captions, vertical reformat |
| Team | $49/mo | Unlimited     | 5 seats, priority, API access              |

**Competitive advantage:** unlike AI-guessing products (OpusClip, Vexub), SpikeClip uses actual viewer behavior data (the YouTube heatmap) to find genuinely replayed moments — data-driven, not AI-guessed. Keep this the loud part of the pitch even after Stage 2 ships, since captioning/cleanup alone is commoditized.

_Note:_ the Team tier (batch/agency) is real future upside but is out of scope for Phase 5 — build it only once Pro-tier demand is proven.

### 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│   ┌─────────────────┐          ┌───────────────────┐             │
│   │   Next.js 16    │          │  Chrome Extension │             │
│   │   (Web App)     │          │  (Backlog)        │             │
│   └────────┬────────┘          └────────┬──────────┘             │
└────────────┼────────────────────────────┼────────────────────────┘
             │  HTTPS / REST              │
┌────────────▼────────────────────────────▼────────────────────────┐
│                        API GATEWAY (Nginx / Caddy)               │
│                   Rate limiting, SSL termination                 │
└────────────────────────┬─────────────────────────────────────────┘
┌────────────────────────▼─────────────────────────────────────────┐
│                      BACKEND LAYER (NestJS API)                  │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│   │   Auth   │ │   Jobs   │ │   Clips  │ │  Users   │            │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘            │
│   ┌────▼────────────▼───────────▼─────────────▼────────┐         │
│   │ Service Layer: HeatmapExtractor (yt-dlp) ·         │         │
│   │ SpikeMerger (algorithm) · ClipProcessor (FFmpeg) · │         │
│   │ CaptionGenerator (Whisper API, Stage 2 only)       │         │
│   └──────────────────────┬─────────────────────────────┘         │
│   ┌──────────────────────▼─────────────────────────────┐         │
│   │ Queue Layer (BullMQ + Redis): HeatmapJob ·         │         │
│   │ ClipJob · CaptionJob                               │         │
│   └────────────────────────────────────────────────────┘         │
└────────────────────────┬─────────────────────────────────────────┘
┌────────────────────────▼─────────────────────────────────────────┐
│                      DATA LAYER                                  │
│   PostgreSQL 18 · Redis 8 · MinIO (object storage)             │
└──────────────────────────────────────────────────────────────────┘
```

**Why a separate NestJS backend, not Next.js API routes:**

| Factor                   | Next.js API Routes          | NestJS Separate Backend                  |
| ------------------------ | --------------------------- | ---------------------------------------- |
| Processing heavy jobs    | Blocks serverless functions | Dedicated worker processes               |
| WebSocket support        | Limited (serverless)        | Native WebSocket adapters                |
| Background queues        | Needs external service      | Built-in BullMQ integration              |
| yt-dlp/FFmpeg subprocess | Cold start issues           | Persistent process, no cold starts       |
| Scaling independently    | Scales with frontend        | Scale processing independently           |
| Code organization        | Flat route handlers         | Modular architecture (DI, guards, pipes) |

**Monorepo structure:**

```
spikeclips/
├── apps/
│   ├── web/                 # Next.js 16 frontend
│   │   ├── src/app/         # App Router pages
│   │   ├── src/components/
│   │   └── src/lib/         # API client, utils
│   └── api/                 # NestJS backend
│       ├── src/modules/     # auth, jobs, clips, users
│       ├── src/services/    # yt-dlp, ffmpeg, heatmap, storage
│       └── src/workers/     # heatmap.worker.ts, clip.worker.ts
├── packages/shared/         # types, algorithm, utils — shared by both apps
├── docker/                  # docker-compose.yml, Dockerfile.api
└── turbo.json
```

Putting the merge algorithm in `packages/shared/algorithm` (not duplicated per-app) is the structural fix for the three-conflicting-versions problem from the prototype — see Appendix A.

### 3. Functional Requirements

**FR-1: URL Input & Validation**

| ID     | Requirement                                                                         | Priority                            |
| ------ | ----------------------------------------------------------------------------------- | ----------------------------------- |
| FR-1.1 | Accepts standard YouTube URL formats (`watch?v=`, `youtu.be/`, `shorts/`, `embed/`) | P0                                  |
| FR-1.2 | Validates URL format before processing                                              | P0                                  |
| FR-1.3 | Rejects non-YouTube URLs with a clear error                                         | P0                                  |
| FR-1.4 | Supports YouTube Shorts URLs                                                        | P1                                  |
| FR-1.5 | Supports playlist URLs (process each video)                                         | P2 — backlog, not needed for launch |

**FR-2: Heatmap Extraction**

| ID     | Requirement                                             | Priority |
| ------ | ------------------------------------------------------- | -------- |
| FR-2.1 | Extracts heatmap data via `yt-dlp -j` metadata          | P0       |
| FR-2.2 | Returns array of `{start_time, end_time, value}` spikes | P0       |
| FR-2.3 | Handles videos with no heatmap data gracefully          | P0       |
| FR-2.4 | Caches extracted heatmap for 24 hours                   | P1       |

**FR-3: Spike Merging Algorithm — canonical version (v2, enhanced)**

| ID      | Requirement                                                                                                                                                                                          | Priority |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-3.1  | Sorts spikes chronologically by `start_time`                                                                                                                                                         | P0       |
| FR-3.2  | Merges adjacent spikes within gap tolerance (default: 5s)                                                                                                                                            | P0       |
| FR-3.3  | Merges spikes with intensity delta within tolerance (default: 0.25)                                                                                                                                  | P0       |
| FR-3.4  | Safety-floor override: merges anyway if **both** current and previous segments are ≥ 0.40                                                                                                            | P0       |
| FR-3.5  | Each merged block records merge **confidence**: `high` if merged purely on intensity similarity, `floor_override` if the floor rule was needed at any point                                          | P1       |
| FR-3.6  | Blocks longer than `max_clip_duration` (default: 60s) are reduced to their best-scoring sub-window via sliding-window search, rather than shipped at full length or truncated arbitrarily            | P0       |
| FR-3.7  | Blocks shorter than `min_clip_duration` (default: 3s) are dropped as unusable                                                                                                                        | P0       |
| FR-3.8  | Scenes are ranked by a **composite score** — weighted peak intensity + average intensity (area-under-curve / duration) + fit to a target duration range (default: 15–60s) — not peak intensity alone | P0       |
| FR-3.9  | Final top-N selection enforces non-overlap and a minimum spacing (default: 5s) between picks, so scenes are spread across the video rather than clustered in one region                              | P0       |
| FR-3.10 | User can adjust algorithm parameters via UI (gap/intensity tolerances, floor, min/max duration, target duration range, score weights, spacing)                                                       | P1       |

This locks in the "both segments above floor" merge rule (matching the stricter of the two prototype scripts) plus the scoring/duration/diversity layer on top, as the one true implementation in `packages/shared/algorithm`. Reference implementation: `spike_merger.py`. Archive the three prototype versions rather than keeping them around as dead code.

**FR-4: Heatmap Visualization**

| ID     | Requirement                                | Priority |
| ------ | ------------------------------------------ | -------- |
| FR-4.1 | Interactive engagement chart               | P0       |
| FR-4.2 | Time on X-axis, intensity (0–1) on Y-axis  | P0       |
| FR-4.3 | Merged scene blocks highlighted distinctly | P0       |
| FR-4.4 | Click a spike to see timestamp/intensity   | P0       |
| FR-4.5 | Responsive on mobile                       | P1       |

**FR-5: Scene Selection**

| ID     | Requirement                                    | Priority |
| ------ | ---------------------------------------------- | -------- |
| FR-5.1 | List of merged scenes with timestamps          | P0       |
| FR-5.2 | Each shows start/end, duration, peak intensity | P0       |
| FR-5.3 | User can select/deselect scenes to process     | P0       |
| FR-5.4 | Shows total estimated clip count/duration      | P1       |

**FR-6: Clip Processing**

| ID     | Requirement                                            | Priority |
| ------ | ------------------------------------------------------ | -------- |
| FR-6.1 | Downloads selected time ranges via `yt-dlp`            | P0       |
| FR-6.2 | Trims to exact start/end (`--force-keyframes-at-cuts`) | P0       |
| FR-6.3 | Reformats to vertical 9:16 (1080×1920)                 | P0       |
| FR-6.4 | Centers subject during vertical crop                   | P1       |
| FR-6.5 | Configurable pre/post padding (seconds)                | P1       |

**FR-7: Caption Generation** _(Stage 2 — Phase 6, not Phase 5)_

| ID     | Requirement                                                                                                                                              | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-7.1 | Generates captions from audio via Whisper API                                                                                                            | P1       |
| FR-7.2 | Burns captions with customizable style                                                                                                                   | P1       |
| FR-7.3 | User selects caption style (font, color, position) — must include curated presets meeting the elegant-brand bar (Appendix B), not just generic templates | P2       |

**FR-8: Export & Download**

| ID     | Requirement                        | Priority |
| ------ | ---------------------------------- | -------- |
| FR-8.1 | Download link per processed clip   | P0       |
| FR-8.2 | "Download all" as ZIP              | P1       |
| FR-8.3 | Shareable link for processed clips | P2       |

**FR-9: User Accounts**

| ID     | Requirement                          | Priority |
| ------ | ------------------------------------ | -------- |
| FR-9.1 | Account via email/OAuth              | P1       |
| FR-9.2 | Tracks analysis count per user/month | P1       |
| FR-9.3 | Enforces free-tier limits            | P1       |
| FR-9.4 | User can view job history            | P2       |

**FR-10: Payments**

| ID      | Requirement                | Priority |
| ------- | -------------------------- | -------- |
| FR-10.1 | Stripe subscriptions       | P1       |
| FR-10.2 | Upgrade/downgrade plan     | P1       |
| FR-10.3 | Payment receipts via email | P2       |

### 4. Non-Functional Requirements

**NFR-1: Performance**

| Metric                 | Target  |
| ---------------------- | ------- |
| Heatmap extraction     | < 10s   |
| Spike merging          | < 100ms |
| Single clip processing | < 60s   |
| Batch (5 clips)        | < 5 min |
| Page load (LCP)        | < 2s    |
| API response (p95)     | < 500ms |

**NFR-2: Scalability**

| Dimension        | Target      | Strategy                            |
| ---------------- | ----------- | ----------------------------------- |
| Concurrent users | 100+        | Stateless API, horizontal scaling   |
| Concurrent jobs  | 20+         | BullMQ worker pool, rate limiting   |
| Storage          | 10GB+ clips | R2, auto-cleanup after 7 days       |
| Database         | 10K+ users  | Connection pooling, indexed queries |

_Treat these as the target shape, not day-one requirements — at Phase 5 launch scale (early users from Phase 3's cohort plus organic), a single small worker instance is enough. Build to this ceiling; don't provision for it immediately._

**NFR-3: Reliability**

| Requirement         | Target   | Implementation                      |
| ------------------- | -------- | ----------------------------------- |
| Job completion rate | 99%+     | Retry logic (3x), dead-letter queue |
| Data durability     | 99.99%   | Postgres backups, R2 versioning     |
| Uptime              | 99.5%    | Health checks, auto-restart         |
| Error recovery      | Graceful | Per-clip try/catch, partial results |

**NFR-4: Security**

| Requirement          | Implementation                                        |
| -------------------- | ----------------------------------------------------- |
| Authentication       | Google OAuth 2.0 (cookie-based JWT)                    |
| Authorization        | Role-based (Free, Pro, Team)                          |
| API rate limiting    | 100 req/min (metadata), 10 req/min (processing)       |
| Input validation     | Zod schemas on all endpoints                          |
| File upload security | Size limits, type checking, path traversal prevention |
| Secrets              | Environment variables, never in code                  |
| Downloads            | Signed, expiring URLs; no public bucket listing       |

**NFR-5: Observability**

| Layer          | Tool                   | When                                                        |
| -------------- | ---------------------- | ----------------------------------------------------------- |
| Logging        | Pino (structured JSON) | Day one                                                     |
| Error tracking | Sentry                 | Day one                                                     |
| Metrics        | Prometheus             | Add once you have real traffic to monitor, not before       |
| Tracing        | OpenTelemetry          | Add once you have more than one worker type to debug across |

**NFR-6: Maintainability**

| Requirement   | Approach                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Code style    | ESLint + Prettier, pre-commit hooks                                                                           |
| Type safety   | Strict TypeScript, no `any`                                                                                   |
| Testing       | Unit tests for the algorithm (real heatmap data, not just the synthetic edge case), integration tests for API |
| Documentation | OpenAPI spec auto-generated from NestJS decorators                                                            |
| CI/CD         | GitHub Actions: lint → test → build → deploy                                                                  |

**NFR-7: Deployment**

| Component   | Platform               | Cost      |
| ----------- | ---------------------- | --------- |
| All-in-one  | Self-hosted VPS (Hetzner) | ~€4.5/mo |
| Domain      | Cloudflare             | ~$10/year |

**NFR-8: Design & Brand Quality** _(new — carries the "elegant creative" requirement into engineering, not just visual polish at the end)_

| Requirement               | Implementation                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Typography                | One considered serif/sans pairing used consistently — not default system fonts                                                                                           |
| Color                     | Restrained palette (2–3 core colors + neutrals), no rainbow status badges                                                                                                |
| Motion                    | Subtle and purposeful — no bouncing/gamified UI elements                                                                                                                 |
| Copy voice                | Direct and quiet ("extracts your most-replayed moment," not "GO VIRAL 🔥")                                                                                               |
| Output quality            | No black bars, no upscaling artifacts, keyframe-accurate cuts — a rough export undermines the moment-selection value proposition regardless of how good the algorithm is |
| Caption presets (Stage 2) | Every preset reviewed against this bar before shipping — no generic stock templates                                                                                      |

### 5. Data Flow

**Heatmap extraction:** user submits URL → frontend `POST /api/jobs` → NestJS validates URL, creates job (`status: pending`) → enqueues `HeatmapJob` → worker runs `yt-dlp -j <url>` → parses `heatmap[]` → runs the canonical merge algorithm → saves scenes to job (`status: completed`) → frontend polls `GET /api/jobs/:id` and renders the heatmap.

**Clip processing:** user selects scenes → `POST /api/jobs/:id/process` → validate user credits → enqueue `ClipJob(s)` → worker runs `yt-dlp --download-sections` once per source video (not once per clip — see NFR note below) → FFmpeg trims + crops to 9:16 → upload to R2 → update job status + signed download URL → frontend receives update (WebSocket or poll) and shows the download button.

_Engineering note carried over from the prototype review: download the source once and cut locally with FFmpeg for each clip, rather than re-invoking `yt-dlp --download-sections` per clip against the same URL — the original scripts did the latter, which is slower and wastes bandwidth._

### 6. API Design

| Method | Endpoint                  | Description           |
| ------ | ------------------------- | --------------------- |
| POST   | `/api/auth/register`      | Create account        |
| POST   | `/api/auth/login`         | Login                 |
| GET    | `/api/auth/me`            | Current user          |
| POST   | `/api/jobs`               | Create analysis job   |
| GET    | `/api/jobs/:id`           | Job status + scenes   |
| GET    | `/api/jobs`               | List user jobs        |
| POST   | `/api/jobs/:id/process`   | Start clip processing |
| GET    | `/api/jobs/:id/clips`     | Get processed clips   |
| GET    | `/api/clips/:id/download` | Download clip file    |
| POST   | `/api/webhooks/stripe`    | Stripe webhook        |
| GET    | `/api/health`             | Health check          |

```typescript
// POST /api/jobs — Request
{ url: string }

// POST /api/jobs — Response
{
  id: string
  status: "pending" | "processing" | "completed" | "failed"
  videoTitle: string
  videoThumbnail: string
  duration: number
  createdAt: string
}

// GET /api/jobs/:id — Response
{
  id: string
  status: "completed"
  videoTitle: string
  scenes: [{ id: string; startTime: number; endTime: number; peakIntensity: number; duration: number }]
  heatmapData: [{ startTime: number; endTime: number; value: number }]
}

// POST /api/jobs/:id/process — Request
{
  sceneIds: string[]
  options: { vertical: boolean; captionStyle?: string; padding?: number }
}

// POST /api/jobs/:id/process — Response
{ jobId: string; clipJobIds: string[] }
```

### 7. Database Schema

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  plan VARCHAR(20) DEFAULT 'free',
  stripe_customer_id VARCHAR(255),
  analyses_used INT DEFAULT 0,
  analyses_limit INT DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  url VARCHAR(500) NOT NULL,
  video_title VARCHAR(500),
  video_thumbnail VARCHAR(500),
  video_duration FLOAT,
  status VARCHAR(20) DEFAULT 'pending',
  scenes JSONB,
  heatmap_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  scene_index INT NOT NULL,
  start_time FLOAT NOT NULL,
  end_time FLOAT NOT NULL,
  peak_intensity FLOAT,
  status VARCHAR(20) DEFAULT 'pending',
  file_url VARCHAR(500),
  file_size INT,
  duration FLOAT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### 8. Tech Stack

**Frontend (Next.js 16):** Next.js 16, React 19, TypeScript 7, Tailwind CSS 4, shadcn/ui, Recharts (heatmap chart).

**Backend (NestJS):** NestJS 11, TypeScript 7, Prisma 6 (ORM), BullMQ 5, Zod 3 (validation), Pino 9 (logging).

**Infrastructure:** PostgreSQL 18, Redis 8, MinIO (Docker Compose), Self-hosted VPS (Hetzner), Stripe (payments).

---

## Part III — Build Roadmap (Only After Phase 4 Is a "Go")

### Phase 5 — Stage 1 Build

**5.1 Foundation (Weeks 1–2)**

| Task                                                                  | Hours |
| --------------------------------------------------------------------- | ----- |
| Initialize monorepo (Turborepo)                                       | 4     |
| Next.js 16 app + Tailwind + shadcn                                    | 8     |
| NestJS app + module structure                                         | 8     |
| Port canonical merger algorithm to TypeScript, into `packages/shared` | 6     |
| yt-dlp service (subprocess wrapper)                                   | 6     |
| FFmpeg service (trim + reformat)                                      | 6     |
| Postgres schema via Prisma                                            | 4     |
| Redis + BullMQ setup                                                  | 4     |
| Health check endpoints                                                | 2     |
| Docker Compose (local dev)                                            | 2     |

**Deliverable:** running monorepo, algorithm testable via API.

**5.2 Core Features (Weeks 3–4)**

| Task                                                         | Hours |
| ------------------------------------------------------------ | ----- |
| Heatmap extraction job (API + worker)                        | 8     |
| Spike merging job (API + worker)                             | 6     |
| Interactive heatmap chart component                          | 12    |
| Scene list + selection UI                                    | 8     |
| URL input form + validation                                  | 4     |
| Job status polling (start with polling, not WebSocket)       | 6     |
| Clip processing job (download once, trim + reformat locally) | 10    |
| R2 storage integration                                       | 4     |
| Download endpoint                                            | 4     |
| Video-type test cases TC-VID-01 → 06 (below)                 | 6     |

**Deliverable:** working analysis + clipping pipeline, basic UI.

**5.3 Monetization & Polish (Weeks 5–6)**

| Task                                          | Hours |
| --------------------------------------------- | ----- |
| NextAuth.js (Google, GitHub, Email)           | 8     |
| User dashboard (job history, credits)         | 8     |
| Stripe integration (subscriptions)            | 10    |
| Credit/usage tracking + enforcement           | 6     |
| Landing page with pricing                     | 8     |
| Error handling + retry logic                  | 6     |
| Sentry error tracking                         | 4     |
| Rate limiting                                 | 4     |
| Design pass against NFR-8 (elegant-brand bar) | 8     |

**Deliverable:** production-ready, self-serve Stage 1 product with payments.

**Phase 5 subtotal:** 50 + 68 + 62 = **180 hours (~7–9 weeks part-time)**

### Phase 6 — Stage 2: Editing Layer

Only start once Stage 1 has real paying or near-paying usage.

| Task                                                          | Hours |
| ------------------------------------------------------------- | ----- |
| Whisper API integration (captions)                            | 8     |
| Caption style customization (curated elegant presets, FR-7.3) | 6     |

**Deliverable:** captioning available as a Stage 1 add-on/upsell.

### Phase 7 — Launch & Growth (Backlog, Traction-Gated)

Don't schedule these until Phase 5–6 have real users — they're growth levers, not launch blockers.

| Task                                        | Hours |
| ------------------------------------------- | ----- |
| Shareable clip links                        | 4     |
| ZIP download for batch clips                | 4     |
| Chrome extension (reads URL, opens web app) | 12    |
| SEO optimization                            | 4     |
| Landing page animations                     | 6     |
| Product Hunt launch prep                    | 4     |

### Effort Summary

| Phase                       | Hours   | Weeks (part-time)                 |
| --------------------------- | ------- | --------------------------------- |
| 0–4 (Validation)            | —       | 3–5 weeks calendar time           |
| 5 (Stage 1 build)           | 180     | 7–9                               |
| 6 (Stage 2)                 | 14      | 1                                 |
| 7 (Launch/growth, gated)    | 34      | 1.5                               |
| **Total to Stage 1 launch** | **180** | **~10–14 weeks incl. validation** |

At 20 hrs/week on Phase 5 alone: ~9 weeks. At 30 hrs/week: ~6 weeks.

---

## Part IV — Reference

### Cost Breakdown (Monthly)

| Service                   | Cost          | Notes                   |
| ------------------------- | ------------- | ----------------------- |
| Hetzner VPS               | ~€4.5/mo      | 2c/4t, 8GB, 80GB NVMe  |
| Domain                    | ~$1/mo        | ~$10/year               |
| **Total**                 | **~$6/mo**    |                         |

### Test Cases (Video-Type Processing)

| ID        | Scenario                                                         | Expected Output                        | Priority |
| --------- | ---------------------------------------------------------------- | -------------------------------------- | -------- |
| TC-VID-01 | Standard video (~3:30), mid-video peaks                          | 2–3 clips from peak segments           | P0       |
| TC-VID-02 | Long-form tutorial (12:00+), multiple peaks                      | 4–5 clips at key teaching moments      | P0       |
| TC-VID-03 | YouTube Short (0:45), single sustained spike                     | 1 clip (full or trimmed)               | P1       |
| TC-VID-04 | New/low-view video, no heatmap                                   | Graceful fallback message              | P0       |
| TC-VID-05 | Viral video (8:30), multiple intense spikes (0.8–1.0)            | 3–5 clips from top moments             | P0       |
| TC-VID-06 | Synthetic: `[{100-108, 0.60}, {108-116, 1.00}, {116-124, 0.73}]` | Single merged clip 100–124s, peak 1.00 | P0       |

TC-VID-06 is the case that originally justified the floor-override logic — now that FR-3 locks a single canonical algorithm, add real (not just synthetic) heatmap fixtures from a handful of actual videos during Phase 5.2, so the thresholds aren't validated against one hand-built example only.

### Risks & Mitigations

| Risk                                                          | Impact | Mitigation                                                                                |
| ------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| YouTube changes internal heatmap payload / blocks `yt-dlp`    | High   | Keep `yt-dlp` pinned and updated; visible fallback messaging; don't promise 100% coverage |
| FFmpeg processing slow                                        | Medium | Optimize presets; hardware acceleration on VPS if needed                                  |
| Whisper API costs high                                        | Medium | Local faster-whisper option; limit to paid caption tier                                   |
| Low conversion rate                                           | Medium | Strong free tier, clear upgrade triggers                                                  |
| Competitor copies algorithm                                   | Low    | Algorithm is simple; moat is product + UX + brand                                         |
| Algorithm overfit to one synthetic example                    | Medium | Validate FR-3 thresholds against real heatmap fixtures (Phase 5.2), not just TC-VID-06    |
| Persona too broad, dilutes "elegant" positioning              | Medium | Enforce Phase 1 exclusion criteria in every later product decision                        |
| Copyright/ToS exposure re-publishing clips of others' content | Medium | Track as an open legal question; review ToS before charging at scale                      |

### Appendix A — Algorithm: Now Resolved (v2)

The prototype had three conflicting merge implementations. FR-3 above locks the merge decision: gap tolerance 5s, intensity delta tolerance 0.25, floor 0.40, merge-override requires **both** current and previous segments above the floor. On top of that base rule, v2 adds four things the prototype never had:

1. **Composite scoring** (peak + average intensity + duration fit) instead of peak-intensity-only ranking, so a long block that merged in one lucky spike doesn't automatically outrank a shorter, consistently strong block.
2. **Max-duration capping** via best-scoring sliding sub-window, so a merged chain that grows past ~60s gets trimmed to its strongest sub-window instead of shipping an unusably long "short."
3. **Min-duration filtering**, so sub-3-second slivers never make it into the top-N.
4. **Non-overlap + minimum spacing** on the final top-N, so the three delivered scenes are spread across the video instead of being three overlapping slices of one giant block.

Reference implementation and test scenarios live in `packages/shared/src/algorithm/merge.ts` (TypeScript port of `CreateYTShorts.py`).

### Appendix B — Design & Brand Standard

See NFR-8. Applies to every UI surface and every caption preset — the differentiator is real data, but the product still has to _look_ like something this audience would choose voluntarily.
