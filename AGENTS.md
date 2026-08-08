# AGENTS.md

## Project

SpikeClip — YouTube heatmap-driven clip extraction tool. Extracts most-replayed moments using actual viewer heatmap data (via `yt-dlp`), reformats into vertical 9:16 shorts. Turborepo monorepo, pnpm workspaces.

## Commands

```bash
# Root (turbo) — `lint` only runs tsc --noEmit (see note below)
pnpm dev              # Start web + api in parallel (persistent watch)
pnpm build            # Build all apps
pnpm lint             # tsc --noEmit per package
pnpm test             # Run all unit tests (shared + api + web)

# Single package
pnpm --filter @spikeclips/web dev
pnpm --filter @spikeclips/api dev          # also runs `prisma generate` first
pnpm --filter @spikeclips/shared build     # tsc → dist/

# Tests
pnpm --filter @spikeclips/shared test
pnpm --filter @spikeclips/api test
pnpm --filter @spikeclips/api test:e2e     # needs infra (see below)
pnpm --filter @spikeclips/web test         # jest
```

**Infra:** `./scripts/dev.sh` starts Postgres (5432), Redis (6379), MinIO (9000/9001) via Docker.

**Database:** `pnpm --filter @spikeclips/api prisma:migrate` (dev) / `prisma migrate deploy` (CI). `prisma:seed` creates a test user `test@spikeclips.dev` (useful for manual testing without Google OAuth).

## Environment gotchas

- **`pnpm install` auto-runs `prisma generate`** (api `postinstall`). Don't run it manually unless the client is stale.
- **Env files:** root `.env` and `apps/api/.env` both exist and are loaded. API reads `DATABASE_URL`, `JWT_SECRET`, `REDIS_*`, `STORAGE_DRIVER` (local|minio), `GOOGLE_CLIENT_ID/SECRET`, `STRIPE_*`. Frontend reads `NEXT_PUBLIC_*`.
- **Running the API as a background process:** launching via `pnpm dev` / `pnpm api dev` with `&` in a shell that exits will kill the server (orphaned watch process). Use `setsid ... </dev/null &` / `nohup ... &` so it survives the tool session. The API binds **3001**; web binds **3000**.
- **Live YouTube analysis** depends on `yt-dlp` network access and is slow/flaky. For UI walkthroughs, seed/inspect existing completed jobs instead of running a fresh analyze.

## Architecture notes (not obvious from filenames)

- **API is internal-only.** Next.js proxies `/api/*` through `apps/web/src/app/api/[...path]/route.ts`. That proxy lets `/api/auth/*` through without a cookie and **blocks every other route** if no `access_token` cookie is present. All data access (Postgres/Redis/MinIO) happens only in the API.
- **Global guard order in `app.module.ts`:** `ThrottlerGuard` → `JwtAuthGuard` → `RolesGuard`. Auth = Google OAuth only; sessions are httpOnly JWT cookies.
- **Workers (BullMQ) start in `main.ts`** (`startWorkers`) and require Redis. If Redis is down the bootstrap logs a warning and continues. Heatmap queue = `analysis`, export queue = `export`.
- **Clip export downloads the section once** (`yt-dlp --download-sections`), then crops/overlays/mixes with `ffmpeg` locally (not per-clip downloads).
- **Storage:** clips are never served from a public bucket. `GET /api/clips/:id/download` issues an HMAC-signed `GET /api/clips/download/:key` URL; the API streams the file from MinIO or local disk.
- **Tiers:** Free (3 analyses/mo, 3 scenes). Pro (unlimited, 10 scenes). Team (unlimited, 25 scenes). `analysesLimit = -1` means unlimited.
- **Hero heatmap (`AnimatedHeatmapHero`):** Procedurally generated 200-point dataset via seeded PRNG (`mulberry32`, seed=42). 5 peak anchors with randomized height/width/asymmetry, Gaussian noise, micro-bumps, and smoothing. SVG paths + playhead updated via refs in `requestAnimationFrame` (bypasses React render cycle). Single synced playhead (line + circle + glow) with color shifts green→yellow→red.
- **Floating icons (`FloatingIcon`):** Use Web Animations API (`el.animate()`) with 8-point `hero-orbit` keyframes to bypass CSS `prefers-reduced-motion` and `animation-duration: 0.01ms !important` overrides. Visible on all screen sizes.

## Algorithm source of truth

- Canonical implementation: `packages/shared/src/algorithm/merge.ts` (62 tests). Defaults in `packages/shared/src/types.ts` (`DEFAULT_ALGORITHM_CONFIG`): gap tolerance 5s, intensity delta 0.25, floor 0.40, min clip 3s, max clip 60s, target duration 15–60s, top_n 3, min spacing 5s, weights 0.4/0.4/0.2.
- `CreateYTShorts.py` at repo root is the **reference prototype** (Python). Keep it in sync if the algorithm changes — the TS port must match it.
- Frontend types mirror these in `apps/web/src/domain/entities/job.ts` (`ScoredBlock`).

## Conventions

- **Package manager:** pnpm only (never npm/yarn).
- **Lint = type-check.** There is **no ESLint config**; `pnpm lint` runs `tsc --noEmit` (web uses `tsconfig.lint.json`). Do not add lint steps that expect eslint.
- **TypeScript:** strict mode everywhere. Shared types use `snake_case` (algorithm/heatmap); app/DB entities use `camelCase`.
- **Commits:** `feat:`, `fix:`, `chore:`, `docs:` prefixes. Review after each change before proceeding.
- `agents/` and `skills/` are **dev-only and gitignored** — not application code; ignore them when navigating the codebase.
- `test-*.png` at repo root are gitignored screenshot artifacts.
