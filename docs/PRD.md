# Product Requirements Document: SpikeClip

> Find what viewers actually rewatch — then make it beautiful.

---

## 1. Executive Summary

SpikeClip is a YouTube clip extraction tool that uses **actual viewer heatmap data** (audience replay behavior) to identify the most-replayed moments in a video — not AI-guessed predictions. It then reformats those moments into vertical short-form clips ready for TikTok, YouTube Shorts, and Instagram Reels.

**Two-stage product vision:**
- **Stage 1 (SpikeClip):** Heatmap-driven clip extraction and vertical reformatting
- **Stage 2 (Prompt Editing Layer):** Captions, cleanup, and styling (built only after Stage 1 has demand)

> **Editing engine direction — OpenReel integration.** Stage 2's Studio is being re-architected on the open-source [OpenReel](https://openreel.video) architecture ([MIT](https://github.com/Augani/openreel-video)): a non-destructive multi-track timeline as the single source of truth, a typed editing-tool registry shared by manual and AI edits, a model-agnostic AI agent (OpenAI / Anthropic / local, dry-run planning, undo-a-turn), and hybrid rendering (server-side `yt-dlp` ingest/transcode + in-browser WebCodecs/WebGPU compositing/export). `StudioAction` remains a legacy/translation layer during the transition.

---

## 2. Problem Statement

Content creators currently pick which moments to clip from long-form videos based on:
- **Instinct** — guessing what viewers found engaging
- **AI predictions** — tools like OpusClip that use AI to guess viral moments
- **Manual review** — watching the entire video to find highlights

None of these use the **actual data** YouTube already collects: the audience heatmap showing exactly where viewers rewatch, skip, or drop off.

**Result:** Creators waste hours clipping moments that don't perform, while genuinely replayed moments go unnoticed.

---

## 3. Target Users & Segments

| Segment | Use Case | Willingness to Pay |
|---------|----------|-------------------|
| Solo content creators | Repurpose long-form videos into shorts | $15–25/mo |
| Social media agencies | Batch process client videos, team collaboration | $40–60/mo |
| YouTubers/TikTokers | Find viral moments to repackage | $10–20/mo |

### Ideal Customer Profile (ICP)

**Persona:** Solo YouTubers, 20K–200K subscribers, visually-driven niche (film, art, fashion, lifestyle, premium tutorials), currently cut their own shorts manually.

**Explicit Exclusions:**
- Faceless/meme channels
- High-volume-low-craft channels
- Channels without heatmap data availability

---

## 4. Value Proposition

**One-sentence value prop:**
> Shows you which moments people actually rewatched, so you clip the right ones — not the ones an AI guesses.

**Competitive advantage:**
Unlike AI-guessing products (OpusClip, Vexub), SpikeClip uses actual viewer behavior data (the YouTube heatmap) to find genuinely replayed moments — data-driven, not AI-guessed.

---

## 5. Revenue Model

| Tier | Price | Credits | Features |
|------|-------|---------|----------|
| Free | $0 | 3 analyses/mo | View heatmap only, no downloads |
| Pro | $19/mo | Unlimited | Full pipeline, captions, vertical reformat |
| Team | $49/mo | Unlimited | 5 seats, priority, API access |

**Note:** Team tier (batch/agency) is future upside — build only after Pro-tier demand is proven.

---

## 6. Functional Requirements

### FR-1: URL Input & Validation

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Accepts standard YouTube URL formats (`watch?v=`, `youtu.be/`, `shorts/`, `embed/`) | P0 |
| FR-1.2 | Validates URL format before processing | P0 |
| FR-1.3 | Rejects non-YouTube URLs with a clear error | P0 |
| FR-1.4 | Supports YouTube Shorts URLs | P1 |
| FR-1.5 | Supports playlist URLs (process each video) | P2 — backlog |

### FR-2: Heatmap Extraction

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Extracts heatmap data via `yt-dlp -j` metadata | P0 |
| FR-2.2 | Returns array of `{start_time, end_time, value}` spikes | P0 |
| FR-2.3 | Handles videos with no heatmap data gracefully | P0 |
| FR-2.4 | Caches extracted heatmap for 24 hours | P1 |

### FR-3: Spike Merging Algorithm (Canonical v2)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Sorts spikes chronologically by `start_time` | P0 |
| FR-3.2 | Merges adjacent spikes within gap tolerance (default: 5s) | P0 |
| FR-3.3 | Merges spikes with intensity delta within tolerance (default: 0.25) | P0 |
| FR-3.4 | Safety-floor override: merges anyway if **both** segments are ≥ 0.40 | P0 |
| FR-3.5 | Each merged block records merge confidence: `high` or `floor_override` | P1 |
| FR-3.6 | Blocks longer than `max_clip_duration` (default: 60s) reduced to best sub-window via sliding-window | P0 |
| FR-3.7 | Blocks shorter than `min_clip_duration` (default: 3s) dropped | P0 |
| FR-3.8 | Scenes ranked by composite score: peak intensity + average intensity + duration fit | P0 |
| FR-3.9 | Final top-N enforces non-overlap and minimum spacing (default: 5s) | P0 |
| FR-3.10 | User can adjust algorithm parameters via UI | P1 |

### FR-4: Heatmap Visualization

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Interactive engagement chart | P0 |
| FR-4.2 | Time on X-axis, intensity (0–1) on Y-axis | P0 |
| FR-4.3 | Merged scene blocks highlighted distinctly | P0 |
| FR-4.4 | Click a spike to see timestamp/intensity | P0 |
| FR-4.5 | Responsive on mobile | P1 |

### FR-5: Scene Selection

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | List of merged scenes with timestamps | P0 |
| FR-5.2 | Each shows start/end, duration, peak intensity | P0 |
| FR-5.3 | User can select/deselect scenes to process | P0 |
| FR-5.4 | Shows total estimated clip count/duration | P1 |

### FR-6: Clip Processing

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | Downloads selected time ranges via `yt-dlp` | P0 |
| FR-6.2 | Trims to exact start/end (`--force-keyframes-at-cuts`) | P0 |
| FR-6.3 | Reformats to vertical 9:16 (1080×1920) | P0 |
| FR-6.4 | Centers subject during vertical crop | P1 |
| FR-6.5 | Configurable pre/post padding (seconds) | P1 |

### FR-7: Caption Generation (Stage 2 — Deferred)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7.1 | Generates captions from audio via Whisper API | P1 |
| FR-7.2 | Burns captions with customizable style | P1 |
| FR-7.3 | User selects caption style (font, color, position) with curated elegant presets | P2 |

### FR-8: Export & Download

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-8.1 | Download link per processed clip | P0 |
| FR-8.2 | "Download all" as ZIP | P1 |
| FR-8.3 | Shareable link for processed clips | P2 |

### FR-9: User Accounts

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-9.1 | Account via email/OAuth | P1 |
| FR-9.2 | Tracks analysis count per user/month | P1 |
| FR-9.3 | Enforces free-tier limits | P1 |
| FR-9.4 | User can view job history | P2 |

### FR-10: Payments

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-10.1 | Stripe subscriptions | P1 |
| FR-10.2 | Upgrade/downgrade plan | P1 |
| FR-10.3 | Payment receipts via email | P2 |

---

## 7. Non-Functional Requirements

### NFR-1: Performance

| Metric | Target |
|--------|--------|
| Heatmap extraction | < 10s |
| Spike merging | < 100ms |
| Single clip processing | < 60s |
| Batch (5 clips) | < 5 min |
| Page load (LCP) | < 2s |
| API response (p95) | < 500ms |

### NFR-2: Scalability

| Dimension | Target | Strategy |
|-----------|--------|----------|
| Concurrent users | 100+ | Stateless API, horizontal scaling |
| Concurrent jobs | 20+ | BullMQ worker pool, rate limiting |
| Storage | 10GB+ clips | R2, auto-cleanup after 7 days |
| Database | 10K+ users | Connection pooling, indexed queries |

### NFR-3: Reliability

| Requirement | Target | Implementation |
|-------------|--------|----------------|
| Job completion rate | 99%+ | Retry logic (3x), dead-letter queue |
| Data durability | 99.99% | Postgres backups, R2 versioning |
| Uptime | 99.5% | Health checks, auto-restart |
| Error recovery | Graceful | Per-clip try/catch, partial results |

### NFR-4: Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Google OAuth 2.0 (cookie-based JWT) |
| Authorization | Role-based (Free, Pro, Team) |
| API rate limiting | 100 req/min (metadata), 10 req/min (processing) |
| Input validation | Zod schemas on all endpoints |
| File upload security | Size limits, type checking, path traversal prevention |
| Secrets | Environment variables, never in code |
| Downloads | Signed, expiring URLs; no public bucket listing |

### NFR-5: Observability

| Layer | Tool | When |
|-------|------|------|
| Logging | Pino (structured JSON) | Day one |
| Error tracking | Sentry | Day one |
| Metrics | Prometheus | Once real traffic exists |
| Tracing | OpenTelemetry | Once multiple worker types |

### NFR-6: Maintainability

| Requirement | Approach |
|-------------|----------|
| Code style | ESLint + Prettier, pre-commit hooks |
| Type safety | Strict TypeScript, no `any` |
| Testing | Unit tests for algorithm (real heatmap data), integration tests for API |
| Documentation | OpenAPI spec auto-generated from NestJS decorators |
| CI/CD | GitHub Actions: lint → test → build → deploy |

### NFR-7: Deployment

| Component | Platform | Cost |
|-----------|----------|------|
| Frontend | Vercel | Free tier |
| Backend | Railway or Hetzner VPS | $5–20/mo |
| Database | Neon (PostgreSQL) | Free tier |
| Cache/Queue | Upstash (Redis) | $10/mo |
| Storage | Cloudflare R2 | $5/mo |
| Domain | Cloudflare | ~$10/year |

**Total estimated monthly cost:** $21–36/mo

### NFR-8: Design & Brand Quality

| Requirement | Implementation |
|-------------|----------------|
| Typography | One considered serif/sans pairing used consistently |
| Color | Restrained palette (2–3 core colors + neutrals), no rainbow badges |
| Motion | Subtle and purposeful — no bouncing/gamified UI elements |
| Copy voice | Direct and quiet ("extracts your most-replayed moment," not "GO VIRAL 🔥") |
| Output quality | No black bars, no upscaling artifacts, keyframe-accurate cuts |
| Caption presets (Stage 2) | Every preset reviewed against elegant-brand bar |

---

## 8. System Architecture

### High-Level Architecture

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

### Monorepo Structure

```
spikeclips/
├── apps/
│   ├── web/                 # Next.js 16 frontend
│   │   ├── src/app/         # App Router pages
│   │   ├── src/presentation/# Components
│   │   ├── src/application/ # Hooks, use cases
│   │   ├── src/infrastructure/ # API clients
│   │   └── src/domain/      # Ports (interfaces)
│   └── api/                 # NestJS backend
│       ├── src/domain/      # Entities, value objects
│       ├── src/application/ # Use cases, DTOs
│       ├── src/infrastructure/ # Database, storage, workers
│       └── src/presentation/ # Controllers
├── packages/shared/         # types, algorithm — shared by both apps
├── docker/                  # docker-compose, nginx config
└── turbo.json
```

### Why Separate NestJS Backend (Not Next.js API Routes)

| Factor | Next.js API Routes | NestJS Separate Backend |
|--------|-------------------|------------------------|
| Processing heavy jobs | Blocks serverless functions | Dedicated worker processes |
| WebSocket support | Limited (serverless) | Native WebSocket adapters |
| Background queues | Needs external service | Built-in BullMQ integration |
| yt-dlp/FFmpeg subprocess | Cold start issues | Persistent process, no cold starts |
| Scaling independently | Scales with frontend | Scale processing independently |
| Code organization | Flat route handlers | Modular architecture (DI, guards, pipes) |

---

## 9. API Design

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |
| POST | `/api/jobs` | Create analysis job |
| GET | `/api/jobs/:id` | Job status + scenes |
| GET | `/api/jobs` | List user jobs |
| POST | `/api/jobs/:id/process` | Start clip processing |
| GET | `/api/jobs/:id/clips` | Get processed clips |
| GET | `/api/clips/:id/download` | Download clip file |
| POST | `/api/webhooks/stripe` | Stripe webhook |
| GET | `/api/health` | Health check |

### Request/Response Schemas

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

---

## 10. Database Schema

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

---

## 11. Tech Stack

**Frontend (Next.js 16):**
- Next.js 16, React 19, TypeScript 7
- Tailwind CSS 4, shadcn/ui
- Recharts (heatmap chart)

**Backend (NestJS):**
- NestJS 11, TypeScript 7
- Prisma 6 (ORM), BullMQ 5
- Zod 3 (validation), Pino 9 (logging)

**Infrastructure:**
- PostgreSQL 18, Redis 8, MinIO (Docker Compose)
- Self-hosted VPS (Hetzner)
- Stripe (payments)

---

## 12. Data Flow

### Heatmap Extraction
1. User submits URL → frontend `POST /api/jobs`
2. NestJS validates URL, creates job (`status: pending`)
3. Enqueues `HeatmapJob`
4. Worker runs `yt-dlp -j <url>` → parses `heatmap[]`
5. Runs canonical merge algorithm → saves scenes to job (`status: completed`)
6. Frontend polls `GET /api/jobs/:id` and renders heatmap

### Clip Processing
1. User selects scenes → `POST /api/jobs/:id/process`
2. Validate user credits → enqueue `ClipJob(s)`
3. Worker runs `yt-dlp --download-sections` once per source video (not per clip)
4. FFmpeg trims + crops to 9:16 → upload to R2
5. Update job status + signed download URL
6. Frontend receives update (WebSocket or poll) → shows download button

**Engineering note:** Download source once and cut locally with FFmpeg for each clip, rather than re-invoking `yt-dlp --download-sections` per clip.

---

## 13. Competitive Landscape

| Tool | Data Source | Approach | Weakness |
|------|-------------|----------|----------|
| OpusClip | AI prediction | Guesses viral moments | No actual viewer data |
| Vexub | AI prediction | Guesses viral moments | No actual viewer data |
| **SpikeClip** | **YouTube heatmap** | **Actual viewer behavior** | Requires heatmap data availability |

**Moat:** Algorithm is simple; moat is product + UX + brand + the heatmap data advantage.

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| YouTube changes heatmap payload / blocks yt-dlp | High | Keep yt-dlp pinned and updated; visible fallback messaging |
| FFmpeg processing slow | Medium | Optimize presets; hardware acceleration on VPS if needed |
| Whisper API costs high | Medium | Local faster-whisper option; limit to paid caption tier |
| Low conversion rate | Medium | Strong free tier, clear upgrade triggers |
| Competitor copies algorithm | Low | Algorithm is simple; moat is product + UX + brand |
| Algorithm overfit to synthetic example | Medium | Validate against real heatmap fixtures (Phase 5.2) |
| Persona too broad | Medium | Enforce Phase 1 exclusion criteria in every decision |
| Copyright/ToS exposure | Medium | Track as open legal question; review ToS before charging at scale |

---

## 15. Success Criteria

### Validation (Phase 4 Go/No-Go)
- [ ] 5-10 creators have used concierge MVP
- [ ] At least some clips posted and tracked
- [ ] Positive willingness-to-pay signals
- [ ] Heatmap-selected clips outperform or match self-selected clips

### Stage 1 Launch (Phase 5)
- [ ] End-to-end pipeline works: URL → heatmap → scenes → clips
- [ ] Free tier functional with 3 analyses/month limit
- [ ] Pro tier with Stripe payments working
- [ ] LCP < 2s, API p95 < 500ms
- [ ] Job completion rate > 99%
- [ ] Design meets NFR-8 elegant-brand bar

---

## Appendix A: Algorithm Reference

The canonical merge algorithm (v2) includes:
1. **Gap tolerance** (5s) and **intensity delta tolerance** (0.25)
2. **Safety-floor override** (both segments ≥ 0.40)
3. **Composite scoring** (peak + average intensity + duration fit)
4. **Max-duration capping** via best-scoring sliding sub-window
5. **Min-duration filtering** (sub-3s slivers dropped)
6. **Non-overlap + minimum spacing** on final top-N

Reference implementation: `packages/shared/src/algorithm/merge.ts` (TypeScript port of `CreateYTShorts.py`)

---

## Appendix B: Design & Brand Standard

Applies to every UI surface and every caption preset — the differentiator is real data, but the product still has to *look* like something the "elegant creative" audience would choose voluntarily.
