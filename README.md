# SpikeClip

> Find what viewers actually rewatch — then make it beautiful.

[![CI](https://github.com/ahMEDhat-7/SpikeClip/actions/workflows/ci.yml/badge.svg)](https://github.com/ahMEDhat-7/SpikeClip/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-24-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**SpikeClip extracts the most-replayed moments from YouTube videos using *actual viewer heatmap data* — not AI guesses.** It detects spikes in audience replay behavior and reformats those moments into vertical shorts ready for TikTok, YouTube Shorts, and Instagram Reels.

Unlike AI-guessing tools (OpusClip, Vexub, etc.), SpikeClip is built on the engagement signal YouTube already collects: the heatmap that shows exactly where viewers rewatched. The result is a clip selection you can defend with data, not vibes.

![SpikeClip](./media/home)

---

## Watch it in action

A walkthrough of SpikeClip running locally — landing page, the heatmap analysis dashboard, and the full Clip Studio pipeline (platform → scenes → captions → music → templates → export).

<video src="./media/demo" controls width="800" poster="./media/home" preload="metadata">
  Your browser does not support the video tag.
  <a href="./media/demo">Download the walkthrough (MP4)</a>.
</video>

---

## Features

- **Real heatmap data** — extracts per-second viewer engagement directly from YouTube's heatmap via `yt-dlp`. Every recommendation is backed by actual human attention.
- **Spike Merging Algorithm v2** — gap-tolerant clustering (5s tolerance) + intensity scoring (0.25 delta) merges adjacent high-engagement moments into coherent, naturally-bounded clips. Configurable 3–60s duration.
- **Animated hero heatmap** — procedurally generated realistic engagement visualization (seeded PRNG, 200 data points) with a single synced playhead, floating orbit icons (Web Animations API), and glassmorphism UI. SVG paths updated via refs to bypass React render at 60fps.
- **Interactive heatmap visualization** — see exactly where viewers rewatched, with detected scenes highlighted and clickable timestamps.
- **Clip Studio editor** — pick scenes, add captions (SRT / drawtext), layer background music with fades, apply curated templates (kinetic typography, split-screen, POV, collages, and more).
- **Vertical reformatting** — automatically crops and reformats to 9:16 (1080×1920) from a single downloaded source, with keyframe-accurate cuts and no black bars.
- **Multi-platform export** — one analysis, clips ready for TikTok, YouTube Shorts, and Instagram Reels.
- **Accounts & tiers** — Google OAuth, free-tier quota enforcement, and Pro/Team subscriptions via Stripe.
- **Production-grade backend** — clean/hexagonal architecture, BullMQ workers, PostgreSQL + Redis + MinIO, Sentry, rate limiting, and HMAC-signed clip downloads.

---

## Architecture

```
                           ┌─────────────────────────────────┐
                           │         nginx (port 80)         │
                           │      reverse proxy → web        │
                           └──────────────┬──────────────────┘
                                          │
                           ┌──────────────▼──────────────────┐
                           │      Next.js web (port 3000)    │
                           │  /api/* → proxy to API (intern) │
                           └──────────────┬──────────────────┘
                                          │ Docker network
                           ┌──────────────▼───────────────────┐
                           │      NestJS API :3001            │
                           │         (internal only)          │
                           └──────────┬───────────────────────┘
                                      │
                      ┌───────────────┼───────────────┐
                      │               │               │
          ┌───────────▼─────┐ ┌───────▼──────┐ ┌──────▼─────────┐
          │  PostgreSQL 18  │ │   Redis 8    │ │    MinIO       │
          │ (localhost:5432)│ │ (localhost:  │ │ (localhost:    │
          └─────────────────┘ │     6379)    │ │  9000/9001)    │
                              └──────────────┘ └────────────────┘
```

- **nginx** is the only public entry point. It proxies to the web server only.
- **Next.js** handles user-facing concerns and proxies `/api/*` internally via `apps/web/src/app/api/[...path]/route.ts`. It never connects to Postgres, Redis, or MinIO directly.
- **NestJS API** is the single backend gateway — all data access flows through it (the web proxy blocks every non-`/api/auth/*` route without a session cookie).
- **PostgreSQL, Redis, MinIO** are only reachable from the API layer.

### Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript 7, Tailwind CSS 4, shadcn/ui, Recharts |
| Backend | NestJS 11, TypeScript 7, Prisma 6 (ORM), BullMQ 5 (queues), Pino (logging) |
| Algorithm | Canonical spike-merging port in `packages/shared` (`CreateYTShorts.py` is the reference) |
| Data | PostgreSQL 18, Redis 8, MinIO (object storage) |
| Media | `yt-dlp` (heatmap + section download), `ffmpeg` (trim, 9:16 crop, caption/music mix) |
| Infra | Docker Compose, nginx reverse proxy, self-hosted VPS |
| Payments | Stripe (subscriptions + webhooks) |

---

## How it works

```
User submits URL
  → POST /api/jobs  (URL validated, metadata + heatmap extracted via yt-dlp)
  → HeatmapWorker runs the canonical merge algorithm → scenes saved to job
  → Frontend polls GET /api/jobs/:id and renders the heatmap
        ↓
User opens Clip Studio, picks a scene, adds captions/music/template
  → POST /api/jobs/:id/export  (Clip rows created + export jobs enqueued)
  → ClipWorker: download section → crop to 9:16 → overlay captions →
    apply template effects → mix music → upload to storage
  → Clips served via HMAC-signed API URLs (never a public bucket)
```

---

## Quick Start

### Prerequisites

- **Node.js** >= 24
- **pnpm** 9.x
- **Docker** + Docker Compose v2
- **yt-dlp** — `pip install yt-dlp`
- **FFmpeg** — `apt install ffmpeg` / `brew install ffmpeg`

### 1. Clone & install

```bash
git clone git@github.com:ahMEDhat-7/SpikeClip.git
cd SpikeClip
pnpm install          # postinstall runs `prisma generate` automatically
```

### 2. Start infrastructure

```bash
./scripts/dev.sh
```

This starts Postgres (5432), Redis (6379), and MinIO (9000/9001) in Docker.

### 3. Configure environment

```bash
cp .env.example apps/api/.env
```

Set your Google OAuth credentials at minimum (the UI and Browse pages work without them; analysis/export require a signed-in user).

### 4. Migrate & run

```bash
pnpm --filter @spikeclips/api prisma:migrate
pnpm dev
```

- **Frontend:** http://localhost:3000
- **Swagger:** http://localhost:3001/api/docs

> A seeded test user (`test@spikeclips.dev`) is available via `pnpm --filter @spikeclips/api prisma:seed` for manual testing without Google OAuth.

---

## Project Structure

```
SpikeClip/
├── apps/
│   ├── api/            # NestJS 11 backend (internal) — clean/hexagonal architecture
│   │   └── src/
│   │       ├── domain/          # entities, value objects, repository interfaces, services
│   │       ├── application/      # use-cases + DTOs
│   │       ├── infrastructure/   # Prisma, auth, external (yt-dlp/ffmpeg), storage, workers
│   │       └── presentation/     # controllers, filters, interceptors
│   └── web/            # Next.js 16 frontend (public)
│       └── src/
│           ├── app/             # App Router pages (studio, dashboard, login, ...)
│           ├── application/      # hooks + providers (API client, auth, studio)
│           ├── domain/           # entities, ports, data
│           ├── infrastructure/    # API clients (auth, job)
│           └── presentation/      # components (studio, heatmap, scenes, clips)
├── packages/
│   └── shared/         # shared types + the canonical spike-merging algorithm
├── deploy/             # VPS deployment (systemd, nginx, scripts)
├── docker/             # Nginx config for Docker
├── scripts/            # dev.sh, prod.sh
├── docs/               # PRD, plan, tasks
└── docker-compose.yml  # Full stack (all services)
```

---

## Authentication

**Google OAuth 2.0 only.** Sessions are cookie-based JWTs (`httpOnly`).

- `GET /api/auth/google` — redirect to Google consent
- `GET /api/auth/google/callback` — sets session cookie
- `POST /api/auth/logout` — clears cookie
- `GET /api/auth/me` — current user

**Tiers:** Free (3 analyses/month, 3 scenes). Pro (unlimited, 10 scenes). Team (unlimited, 25 scenes). Unlimited tiers store `analysesLimit = -1`.

---

## Testing & CI

```bash
pnpm test                              # all unit tests (shared + api + web)
pnpm --filter @spikeclips/api test:e2e # e2e (needs docker compose up)
```

CI runs 6 jobs: Lint, Security Audit, Test, API E2E (compose infra), Build, Docker Build.

> **Note:** `lint` is `tsc --noEmit` per package (the web app uses `tsconfig.lint.json`). There is no ESLint config — type-checking is the lint step.

---

## Documentation

| Document                        | Description                          |
| ------------------------------- | ------------------------------------ |
| [API Reference](API.md)         | Endpoints, request/response examples |
| [Database Schema](SCHEMA.md)    | User, Job, Clip tables               |
| [Algorithm](ALGORITHM.md)       | Spike detection pipeline             |
| [Deployment](DEPLOYMENT.md)     | Local dev + VPS production           |
| [Contributing](CONTRIBUTING.md) | Style, git + PR conventions          |
| [Security](SECURITY.md)         | Practices + vulnerability reporting  |

---

## License

[MIT](LICENSE)
