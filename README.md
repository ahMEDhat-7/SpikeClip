<p align="center">
  <img src="./media/header.svg" alt="SpikeClip — Find what viewers actually rewatch" width="100%"/>
</p>

> Find what viewers actually rewatch — then make it beautiful.

[![CI](https://github.com/ahMEDhat-7/SpikeClip/actions/workflows/ci.yml/badge.svg)](https://github.com/ahMEDhat-7/SpikeClip/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-22-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**SpikeClip extracts the most-replayed moments from YouTube videos using actual viewer heatmap data — not AI guesses.** It detects spikes in audience replay behavior and reformats those moments into vertical shorts ready for TikTok, YouTube Shorts, and Instagram Reels.

Unlike AI-guessing tools (OpusClip, Vexub, etc.), SpikeClip is built on the engagement signal YouTube already collects: the heatmap that shows exactly where viewers rewatched. The result is a clip selection you can defend with data, not vibes.

---

## Key Features

| Category | Features |
|----------|----------|
| **Data-Driven Selection** | Real heatmap data via yt-dlp · Spike Merging Algorithm v2 (5s gap tolerance, 0.25 intensity delta) · 3-60s configurable clip duration · Top-N scene ranking |
| **Clip Studio Editor** | Multi-track timeline (OpenReel-based) · SRT/drawtext captions · Background music with fades · Curated templates (kinetic typography, split-screen, POV, collages) · WebCodecs/WebGPU in-browser rendering |
| **Multi-Platform Export** | Single download - 9:16 crop - keyframe-accurate cuts - TikTok / YouTube Shorts / Instagram Reels ready · HMAC-signed downloads (no public buckets) |
| **Accounts & Tiers** | Google OAuth 2.0 · httpOnly JWT cookies · Free (3 analyses/mo, 3 scenes) · Pro (unlimited, 10 scenes) · Team (unlimited, 25 scenes) · Stripe subscriptions |
| **Production Backend** | Clean/hexagonal architecture (NestJS 11) · BullMQ workers · PostgreSQL 18 + Redis 8 + MinIO · Sentry · Rate limiting · Structured logging (Pino) |

---

## Architecture Overview

```mermaid
graph TB
    subgraph "External"
        User[User Browser]
        YouTube[YouTube API]
    end

    subgraph "VPS / Docker Host"
        Nginx[nginx :80/443<br/>Reverse Proxy + TLS]
        
        subgraph "Frontend"
            Web[Next.js 16 :3000<br/>App Router + React 19]
        end
        
        subgraph "Backend"
            API[NestJS 11 :3001<br/>Internal API Only]
            Workers[BullMQ Workers<br/>Analysis + Export Queues]
        end
        
        subgraph "Data Layer"
            PG[(PostgreSQL 18<br/>:5432)]
            Redis[(Redis 8<br/>:6379)]
            MinIO[(MinIO<br/>:9000/:9001)]
        end
    end

    User -->|HTTPS| Nginx
    Nginx -->|Proxy| Web
    Web -->|/api/* -> Proxy| API
    API -->|Prisma ORM| PG
    API -->|ioredis| Redis
    API -->|MinIO SDK| MinIO
    Workers -->|BullMQ| Redis
    Workers -->|yt-dlp/ffmpeg| YouTube
    Workers -->|Prisma/MinIO| PG
    Workers -->|Prisma/MinIO| MinIO
```

**Key architectural decisions:**
- nginx is the only public entry point (terminates TLS, proxies to web)
- Next.js handles all user-facing concerns; proxies /api/* internally to NestJS API
- NestJS API is the single backend gateway - all data access flows through it (web never touches DB/Redis/MinIO directly)
- Workers run async jobs (heatmap analysis, clip export) via BullMQ/Redis queues
- PostgreSQL, Redis, MinIO are only reachable from the API layer

---

## How It Works

### Analysis Pipeline (6 Stages)

| Stage | Description |
|-------|-------------|
| 01 - Submit | Paste a YouTube URL. Metadata + heatmap extracted via yt-dlp. |
| 02 - Analyze | Per-second engagement scores computed from heatmap data. |
| 03 - Detect | Canonical spike-merging algorithm clusters high-engagement moments into scenes (3-60s). |
| 04 - Score | Scenes ranked by viewer rewatch intensity - highest replay = best clip. |
| 05 - Visualize | Interactive heatmap renders with detected scenes highlighted + clickable timestamps. |
| 06 - Decide | User reviews ranked scenes and picks moments for Clip Studio. |

### Clip Studio Pipeline (4 Stages)

| Stage | Description |
|-------|-------------|
| 01 - Analyze | Paste URL - get heatmap with per-second engagement scores. |
| 02 - Select | Review detected scenes ranked by viewer rewatch intensity. |
| 03 - Edit | Add captions (SRT/drawtext), layer background music with fades, apply curated templates. |
| 04 - Export | Download vertical clips (9:16, 1080x1920) ready for TikTok, Shorts, Reels. |

```text
POST /api/jobs  ->  yt-dlp extracts metadata + heatmap
  ->  HeatmapWorker runs canonical merge algorithm -> scenes saved
  ->  Frontend polls GET /api/jobs/:id -> renders interactive heatmap
        |
POST /api/jobs/:id/export  ->  Clip rows created + export jobs enqueued
  ->  ClipWorker: download section -> crop to 9:16 -> overlay captions ->
     apply template effects -> mix music -> upload to MinIO
  ->  Clips served via HMAC-signed API URLs (never a public bucket)
```

---

## Authentication & Tiers

**Google OAuth 2.0 only.** Sessions are cookie-based JWTs (httpOnly).

| Endpoint | Description |
|----------|-------------|
| GET /api/auth/google | Redirect to Google consent |
| GET /api/auth/google/callback | Sets session cookie |
| POST /api/auth/logout | Clears cookie |
| GET /api/auth/me | Current user |

| Tier | Analyses/Month | Scenes/Analysis |
|------|----------------|-----------------|
| Free | 3 | 3 |
| Pro | Unlimited | 10 |
| Team | Unlimited | 25 |

Unlimited tiers store `analysesLimit = -1`.

---

## Documentation

| Document | Description |
|----------|-------------|
| [API Reference](API.md) | Endpoints, request/response examples |
| [Database Schema](SCHEMA.md) | User, Job, Clip tables |
| [Algorithm](ALGORITHM.md) | Spike detection pipeline |
| [Deployment](DEPLOYMENT.md) | Local dev + VPS production |
| [Contributing](CONTRIBUTING.md) | Style, git + PR conventions |
| [Security](SECURITY.md) | Practices + vulnerability reporting |

---

## Editing Engine & OpenReel Integration

SpikeClip's Clip Studio editing engine is being rebuilt on the open-source **OpenReel** architecture (MIT, github.com/Augani/openreel-video):

- **Non-destructive multi-track timeline** as the single source of truth (replacing the per-scene flat StudioAction[] list)
- **Typed editing-tool registry** - every edit (manual or AI) is one undoable, typed command through the same surface
- **Model-agnostic AI agent** - bring OpenAI / Anthropic / local models; plans via dry-run and executes tools, with "undo the whole turn"
- **Hybrid rendering** - the server keeps YouTube ingest (yt-dlp), proxy/transcode, and storage (MinIO); compositing and export move to in-browser **WebCodecs / WebGPU** (mirroring OpenReel's engine), with server-side ffmpeg as a heavy-transcode fallback

This keeps SpikeClip's data-driven heatmap selection while giving it a professional, agent-native editing core. StudioAction remains as a legacy/translation layer during the transition.

---

## License

[MIT](LICENSE)