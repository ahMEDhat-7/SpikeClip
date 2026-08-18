# OpenReel Integration — SpikeClip

> Status: **Complete (Phases 0–4 + cleanup).** SpikeClip now uses the upstream **[OpenReel](https://openreel.video)** engine ([MIT](https://github.com/Augani/openreel-video)) for video editing and export, vendored at `vendor/openreel-video`.

## Decisions (locked)
- **Approach:** Use the upstream `@openreel/core` engine (vendored via git submodule). We do **not** reimplement OpenReel's concepts — we consume them.
- **Engine:** `@openreel/core` provides the `Project` model, `ExportEngine` (WebCodecs/WebGPU), timeline, media, video, audio, and effects engines.
- **Legacy:** `StudioAction` + `Job.studioEdits` remain as legacy types for the existing per-scene prompt-translation flow.

## Architecture (current)

```
SpikeClip API (NestJS)
  ├ yt-dlp ingest → MinIO storage
  ├ heatmap analysis → scene selection
  └ Studio endpoints: translate-prompt, generate-preview, save-actions

SpikeClip Web (Next.js 16 + React 19)
  ├ @openreel/core (vendored, transpiled)
  │   ├ Project model: { settings, mediaLibrary, timeline }
  │   ├ ExportEngine: WebCodecs/WebGPU video export
  │   └ MediaBunny: video/audio decode
  ├ apps/web/src/lib/openreel/project.ts    — buildProjectFromJob()
  └ apps/web/src/lib/video/openreel-renderer.ts — exportClip() wrapper
```

## Integration points

### `buildProjectFromJob()` — SpikeClip → OpenReel Project
- Maps job metadata + source video blob → OpenReel `Project` (1080×1920 vertical).
- Creates a video track with one clip (`inPoint`/`outPoint` = heatmap segment).
- Optional: subtitles for captions, audio track for music.

### `exportClip()` — OpenReel ExportEngine wrapper
- Lazy-imports `@openreel/core`, initializes `ExportEngine`.
- Calls `engine.exportVideo(project, settings)` (async generator).
- Returns `Blob` + stats. Client-side WebCodecs path; server `ffmpeg` remains fallback.

### Vendored engine
- Git submodule: `vendor/openreel-video` (pinned commit).
- `apps/web/package.json`: `"@openreel/core": "file:../../vendor/openreel-video/packages/core"`.
- `next.config.ts`: `transpilePackages: ['@openreel/core', 'mediabunny', 'three', 'gsap']`.
- Types: `@webgpu/types` + `@types/three` in devDeps; `global.d.ts` references WebGPU types.

## Phases completed

### Phase 0 — Vendor OpenReel
- `git submodule add https://github.com/Augani/openreel-video vendor/openreel-video`.
- Added `@openreel/core` as `file:` dep to web; `transpilePackages` in next.config.
- Added `@webgpu/types`, `@types/three` to devDeps; `global.d.ts` for WebGPU globals.

### Phase 1 — Verify import/build
- tsc compiles with `@openreel/core` types + runtime imports.

### Phase 2 — Map SpikeClip → OpenReel Project
- `apps/web/src/lib/openreel/project.ts`: `buildProjectFromJob()`, `serializeProject()`, `deserializeProject()`.

### Phase 3 — Export wrapper
- `apps/web/src/lib/video/openreel-renderer.ts`: `exportClip()`, `isSupported()`, `hasWebGpu()`.

### Phase 4 — Clip Studio UI
- Removed `StudioTimelineNext` and `NEXT_PUBLIC_STUDIO_TIMELINE` flag from `page.tsx`.
- `StudioTimeline` remains as the scene-selector timeline view.

### Phase 6 — Cleanup
- Deleted: `packages/shared/src/timeline.ts`, `timeline/tools.ts`, `timeline/translate.ts`, `agent.service.ts`, `agent.types.ts`, `use-timeline.ts`, `TimelineCanvas.tsx`, `StudioTimelineNext.tsx`.
- Removed `timeline` field from Job entity, DTO, mapper, repo, Prisma schema.
- Removed timeline/ai endpoints from studio controller/service.
- Removed `applyTimeline` from ffmpeg.service.
- Reverted `studio.module.ts` (no AgentService).
- Shared: 90 tests pass. API lint clean. Web lint clean.

## Deferred

- **Phase 5 (AI edits):** Evaluate `@openreel/agent` / `creation-agent` for prompt→edits. Our server agent (`agent.service.ts`) was removed; the existing `PromptTranslationService` + `StudioAction` flow remains for the per-scene prompt-translation use case.
- **Client-side export wiring:** `exportClip()` is ready but not yet wired into the UI export flow. The server-side `clip.worker` + ffmpeg path remains the primary export. Wire client-side export when ready.
- **Full multi-track editor UI:** The upstream OpenReel editor (`@openreel/web`) is a full React 19 app. Embedding it into Next.js would require significant effort. The current `StudioTimeline` scene selector is sufficient for the heatmap-driven clip extraction flow.

## Verification

- `pnpm install` resolves `@openreel/core` + deps.
- `pnpm --filter @spikeclip/shared build` + `test` → 90 tests pass.
- `pnpm --filter @spikeclip/api lint` → clean.
- `pnpm --filter @spikeclip/web lint` → clean.
- `pnpm --filter @spikeclip/api exec jest studio.service.spec` → 4 tests pass.
