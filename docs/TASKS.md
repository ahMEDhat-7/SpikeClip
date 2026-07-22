# SpikeClip — Task Breakdown

> Complete task breakdown extracted from NEXT-STAGE-PLAN.md. All phases, tasks, hours, files, and deliverables.

---

## Phase 0: Git Setup

- [ ] **0.1** Create `develop` branch from `main` as integration branch
  - Command: `git checkout main && git checkout -b develop`
  - All feature branches merge into `develop`; `main` remains stable

**Deliverable:** Integration branch ready for development.

---

## Phase 1: Current State Assessment

### What Already Exists

| Area | Status | Details |
|---|---|---|
| Algorithm (merge, score, select) | ✅ Complete | 415 lines TS, 654+ tests, Python reference in sync |
| Database schema | ✅ Complete | User, Job, Clip with relations, indexes, 7 migrations |
| Auth (Google OAuth + JWT) | ✅ Complete | Cookie-based, guards, roles |
| yt-dlp integration | ✅ Complete | Metadata, heatmap, section download |
| FFmpeg integration | ⚠️ Partial | Trim, vertical crop, SRT/drawtext captions, audio mix, vignette. Missing: animations, styles, transitions, quality/format control |
| BullMQ workers | ✅ Complete | Heatmap (analysis queue), Clip (export queue) |
| Storage | ✅ Complete | Local + MinIO, HMAC-signed URLs |
| Payments (Stripe) | ✅ Complete | Checkout, portal, webhooks |
| Frontend — Dashboard | ✅ Complete | URL input, heatmap chart, scene editor, video preview, metadata sidebar |
| Frontend — Studio | ⚠️ Partial | Platform select, caption editor, music panel, template library, export panel. Missing: prompt-based chat interface, live preview |
| Pricing | ⚠️ Partial | UI exists, but scenesLimit defaults don't match new tiers |
| Tests | ✅ Substantial | 25 web test files, 6 API e2e files, 654+ algorithm tests |

### What Needs Building

1. [ ] **1.1** Prompt-based chat interface replacing current editor panels
2. [ ] **1.2** LLM translation layer (natural language → structured actions)
3. [ ] **1.3** Standard action language (intermediate representation)
4. [ ] **1.4** FFmpeg filter graph builder (actions → filter_complex)
5. [ ] **1.5** Server-side preview rendering (480p, cached)
6. [ ] **1.6** Quality/format export options (480p/720p/1080p, mp4/webm)
7. [ ] **1.7** Platform-specific encoding rules
8. [ ] **1.8** Pricing tier enforcement (Free: 2, Pro: 10, Team: 20 clips)
9. [ ] **1.9** Additional FFmpeg capabilities (text animations, styles, transitions, speed, overlays)

---

## Phase 2: Stage 1 Analyze — Enhancement Tasks

### 2.1 Drag/Drop Scene Selection on Heatmap

- [ ] **2.1.1** Add `onMouseDown`/`onMouseUp` handlers to `HeatmapChart.tsx`
- [ ] **2.1.2** Create new scenes from drag range on engagement curve
- [ ] **2.1.3** Leverage existing `ReferenceArea` for scene overlay rectangles

**Current state:** `SceneEditor.tsx` and `EditableSceneCard.tsx` support adding/removing scenes. `HeatmapChart.tsx` supports click-to-add via `onChartClick`.

**Files:** `apps/web/src/presentation/components/heatmap/HeatmapChart.tsx`

**Acceptance criteria:** User can drag horizontally on the heatmap to create a new scene with start/end times matching the drag range.

---

### 2.2 Auto-Update Seconds/Minutes Fields

- [ ] **2.2.1** Verify bidirectional sync between chart drag and time fields
- [ ] **2.2.2** Ensure chart selection updates when user types in time fields
- [ ] **2.2.3** Test full round-trip sync via `use-scene-editor.ts`

**Current state:** `EditableSceneCard.tsx` has time inputs that update scene start/end. Already partially working via shared state.

**Files:** `apps/web/src/application/hooks/use-scene-editor.ts`, `EditableSceneCard.tsx`

**Acceptance criteria:** Changes in chart reflect in time fields AND changes in time fields reflect in chart, with no state drift.

---

### 2.3 Video Player Progress Bar Reflecting Selected Moments

- [ ] **2.3.1** Build custom progress bar component below YouTube embed
- [ ] **2.3.2** Show current playback position on progress bar
- [ ] **2.3.3** Display colored segments for each selected scene
- [ ] **2.3.4** Implement click-to-seek on scene segments

**Current state:** `VideoScenePreview.tsx` embeds YouTube player via `react-youtube`, supports play/pause/skip, seeks to scene timestamps.

**Files:** `apps/web/src/presentation/components/video/VideoScenePreview.tsx`

**Acceptance criteria:** Custom progress bar shows colored scene markers and allows click-to-seek.

---

### 2.4 Sidebar Video Metadata

- [ ] **2.4.1** Create styled sidebar card with video thumbnail
- [ ] **2.4.2** Display channel avatar (if available)
- [ ] **2.4.3** Format view count (e.g., "1.2M views")
- [ ] **2.4.4** Show relative upload date ("3 months ago")
- [ ] **2.4.5** Display video duration

**Current state:** Dashboard shows `videoTitle`, `videoThumbnail`, `videoDuration`, `videoViewCount`, `videoUploadDate`, `videoChannelName` from Job entity.

**Files:** `apps/web/src/app/dashboard/page.tsx` (or new `VideoMetadataSidebar.tsx` component)

**Acceptance criteria:** Metadata sidebar displays all video info with proper formatting.

---

## Phase 3: Stage 2 Studio — Prompt-Based "Vibe Editing"

### 3.1 Standard Action Language (Intermediate Representation)

#### 3.1.1 Action Schema

- [ ] **3.1.1.1** Create `studio-actions.ts` in `packages/shared/src/types/`
- [ ] **3.1.1.2** Define `StudioAction` union type (8 action types)
- [ ] **3.1.1.3** Define `AddCaptionsAction` interface with all fields
- [ ] **3.1.1.4** Define `MixAudioAction` interface
- [ ] **3.1.1.5** Define `ApplyEffectAction` interface
- [ ] **3.1.1.6** Define `SetSpeedAction` interface
- [ ] **3.1.1.7** Define `AddOverlayAction` interface
- [ ] **3.1.1.8** Define `SetTransitionAction` interface
- [ ] **3.1.1.9** Define `AddBackgroundAction` interface
- [ ] **3.1.1.10** Define `TrimAction` interface
- [ ] **3.1.1.11** Create Zod schemas for all action types
- [ ] **3.1.1.12** Add default values for optional fields

**Files:** `packages/shared/src/types/studio-actions.ts`

**Action types and their key parameters:**

| Action | Key Parameters |
|---|---|
| `add_captions` | text, font (5 options), size (12-120), color, position (top/center/bottom), start, end, animation (5 options), style (5 options), opacity |
| `mix_audio` | volume, originalVolume, fadeIn, fadeOut, startTime, tone (4 options) |
| `apply_effect` | type (9 options), intensity (0-1), startTime, endTime |
| `set_speed` | rate (0.25-4.0), preservePitch |
| `add_overlay` | assetKey, x, y, scale, opacity, startTime, endTime |
| `set_transition` | type (56 options), duration, position (start/end) |
| `add_background` | color, startTime, endTime |
| `trim` | startTime, endTime |

---

#### 3.1.2 Example Prompt-to-Action Translations

- [ ] **3.1.2.1** Implement caption prompt translation example
- [ ] **3.1.2.2** Implement audio mix prompt translation example
- [ ] **3.1.2.3** Implement multi-action prompt translation example
- [ ] **3.1.2.4** Implement timing-specific prompt translation example

---

#### 3.1.3 Ambiguity Resolution

- [ ] **3.1.3.1** Define clarification response schema
- [ ] **3.1.3.2** Add suggestion chips for ambiguous prompts
- [ ] **3.1.3.3** Handle system message display in chat UI

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

---

### 3.2 LLM Translation Service

#### 3.2.1 Architecture

- [ ] **3.2.1.1** Create `prompt-translation.service.ts`
- [ ] **3.2.1.2** Implement `UserPrompt + Context → LLM API → Validated Actions[] → ActionStore` pipeline

**New service:** `apps/api/src/infrastructure/external/prompt-translation.service.ts`

---

#### 3.2.2 LLM System Prompt

- [ ] **3.2.2.1** Write system prompt with all 8 action definitions
- [ ] **3.2.2.2** Include parameter descriptions and constraints
- [ ] **3.2.2.3** Add context variables (platform, scene, assets)
- [ ] **3.2.2.4** Define rules for JSON output, ambiguity handling, timing defaults

**System prompt includes:**
- All 8 action types with full parameter docs
- Context: platform, scene duration, available assets
- 8 rules for response format and constraints

---

#### 3.2.3 LLM Provider Configuration

- [ ] **3.2.3.1** Support `LLM_PROVIDER` env var (`openai` | `anthropic`)
- [ ] **3.2.3.2** Support `LLM_MODEL` env var (default: `gpt-4o-mini`)
- [ ] **3.2.3.3** Support `LLM_MAX_TOKENS` env var (default: `2000`)
- [ ] **3.2.3.4** Support `LLM_TEMPERATURE` env var (default: `0.2`)
- [ ] **3.2.3.5** Support `LLM_TIMEOUT_MS` env var (default: `15000`)

---

#### 3.2.4 Response Validation

- [ ] **3.2.4.1** Parse JSON response (reject if malformed)
- [ ] **3.2.4.2** Validate each action against Zod schemas
- [ ] **3.2.4.3** Clamp out-of-range values (e.g., volume > 1 → 1)
- [ ] **3.2.4.4** Validate timing within scene bounds
- [ ] **3.2.4.5** Return errors as clarification prompts if validation fails

---

### 3.3 FFmpeg Filter Graph Builder

**New service:** `apps/api/src/infrastructure/external/filter-graph-builder.ts`

#### 3.3.1 Filter Chain Mapping

**Video filters (applied in order via numbered links `[v0]→[v1]→[v2]...`):**

- [ ] **3.3.1.1** Crop + scale filter: `crop=ih*9/16:ih,scale=1080:1920` (always first)
- [ ] **3.3.1.2** `add_captions` (fade): `drawtext` with alpha animation
- [ ] **3.3.1.3** `add_captions` (slide): `drawtext` with x-position animation
- [ ] **3.3.1.4** `add_captions` (pop): `drawtext` with fontsize bounce
- [ ] **3.3.1.5** `add_captions` (typewriter): Multiple `drawtext` with character timing
- [ ] **3.3.1.6** `add_captions` (outlined): `drawtext` with `borderw`
- [ ] **3.3.1.7** `add_captions` (shadow): `drawtext` with `shadowx/y`
- [ ] **3.3.1.8** `add_captions` (neon): Duplicate pass with `boxblur`
- [ ] **3.3.1.9** `add_captions` (background box): `drawtext` with `box=1`
- [ ] **3.3.1.10** `apply_effect` (vignette): `vignette=angle=${intensity * PI / 2}`
- [ ] **3.3.1.11** `apply_effect` (zoom_in): `zoompan` with d=1 for video
- [ ] **3.3.1.12** `apply_effect` (zoom_out): `zoompan` reverse direction
- [ ] **3.3.1.13** `apply_effect` (blur): `boxblur=${radius}:${radius}`
- [ ] **3.3.1.14** `apply_effect` (sharpen): `unsharp=5:5:${amount}:5:5:${amount}`
- [ ] **3.3.1.15** `apply_effect` (sepia): `colorchannelmixer` matrix
- [ ] **3.3.1.16** `apply_effect` (bw): `hue=s=0`
- [ ] **3.3.1.17** `apply_effect` (glitch): `rgbashift` + `noise`
- [ ] **3.3.1.18** `apply_effect` (glow): `gblur` + overlay
- [ ] **3.3.1.19** `add_overlay`: `overlay` with timing
- [ ] **3.3.1.20** `add_background`: `drawbox` with timing
- [ ] **3.3.1.21** `set_speed`: `setpts=PTS/${rate}`
- [ ] **3.3.1.22** `set_transition` (fade start): `fade=t=in`
- [ ] **3.3.1.23** `set_transition` (fade end): `fade=t=out`
- [ ] **3.3.1.24** `set_transition` (between clips): `xfade` with 56 types

**Audio filters (applied via separate link chain `[a0]→[a1]...`):**

- [ ] **3.3.1.25** `set_speed` audio: `atempo=${rate}` (chain for >2x)
- [ ] **3.3.1.26** `mix_audio` original: `volume=${originalVolume}`
- [ ] **3.3.1.27** `mix_audio` music: `volume` + `afade`
- [ ] **3.3.1.28** `mix_audio` bass_boost: `equalizer` low freq
- [ ] **3.3.1.29** `mix_audio` treble_boost: `equalizer` high freq
- [ ] **3.3.1.30** `mix_audio` warm: dual `equalizer`
- [ ] **3.3.1.31** `mix_audio` combine: `amix`

---

#### 3.3.2 Command Assembly Algorithm

- [ ] **3.3.2.1** Start with input file(s)
- [ ] **3.3.2.2** Build video filter chain (crop+scale first, then append actions)
- [ ] **3.3.2.3** Build audio filter chain (volume, music, speed, mix)
- [ ] **3.3.2.4** Assemble filter_complex string
- [ ] **3.3.2.5** Set output codec params based on format + quality
- [ ] **3.3.2.6** Build final command array for execFile

---

#### 3.3.3 Output Encoding

- [ ] **3.3.3.1** Define `OutputConfig` interface (format, quality)
- [ ] **3.3.3.2** Define `QUALITY_PRESETS` (480p/720p/1080p with CRF values)
- [ ] **3.3.3.3** Define `FORMAT_CODECS` (mp4 with libx264, webm with libvpx-vp9)

```typescript
const QUALITY_PRESETS = {
  "480p":  { scale: "scale=-2:480",  crf: "28" },
  "720p":  { scale: "scale=-2:720",  crf: "26" },
  "1080p": { scale: "scale=-2:1080", crf: "23" },
};

const FORMAT_CODECS = {
  mp4:  ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac"],
  webm: ["-c:v", "libvpx-vp9", "-b:v", "2M", "-pix_fmt", "yuv420p", "-c:a", "libopus"],
};
```

---

### 3.4 Chat Interface (Frontend)

#### 3.4.1 UI Layout

- [ ] **3.4.1.1** Refactor Studio to 3-panel layout (Chat | Preview | SceneSelector)
- [ ] **3.4.1.2** Add StudioToolbar (platform select, export button)
- [ ] **3.4.1.3** Add ActionList at bottom (applied actions with edit/remove)

---

#### 3.4.2 Chat Components

- [ ] **3.4.2.1** Create `ChatPanel.tsx` — Message list + input field, scrollable
- [ ] **3.4.2.2** Create `ChatMessage.tsx` — Single message bubble (user or system)
- [ ] **3.4.2.3** Create `ChatInput.tsx` — Text input with send button
- [ ] **3.4.2.4** Create `ActionList.tsx` — List of applied actions with remove/edit
- [ ] **3.4.2.5** Create `ActionCard.tsx` — Single action display (icon + label + params)
- [ ] **3.4.2.6** Create `ClarificationCard.tsx` — System clarification with suggestions
- [ ] **3.4.2.7** Create `PreviewPanel.tsx` — Video player showing server-rendered preview

**New components:** `apps/web/src/presentation/components/studio/`

---

#### 3.4.3 Chat Flow

- [ ] **3.4.3.1** User types prompt in `ChatInput`
- [ ] **3.4.3.2** Message appears in `ChatPanel` as user bubble
- [ ] **3.4.3.3** Show loading indicator while LLM translates
- [ ] **3.4.3.4** System response: actions → `ActionList` + trigger preview render
- [ ] **3.4.3.5** System response: clarification → `ClarificationCard` with suggestions
- [ ] **3.4.3.6** Preview renders server-side, `PreviewPanel` loads URL
- [ ] **3.4.3.7** User can type another prompt (actions stack)
- [ ] **3.4.3.8** User can remove individual actions from `ActionList`
- [ ] **3.4.3.9** User can click "Export" when satisfied

---

#### 3.4.4 State Management

- [ ] **3.4.4.1** Extend `use-studio.ts` reducer with `messages: ChatMessage[]`
- [ ] **3.4.4.2** Add `actions: StudioAction[]` state
- [ ] **3.4.4.3** Add `previewUrl: string | null` state
- [ ] **3.4.4.4** Add `previewLoading: boolean` state
- [ ] **3.4.4.5** Add `previewError: string | null` state
- [ ] **3.4.4.6** Add `exportConfig: OutputConfig` state
- [ ] **3.4.4.7** Add reducer actions: `ADD_MESSAGE`, `SET_ACTIONS`, `REMOVE_ACTION`, `SET_PREVIEW_URL`, `SET_PREVIEW_LOADING`, `SET_EXPORT_CONFIG`

---

### 3.5 Server-Side Preview Rendering

#### 3.5.1 Preview Pipeline

- [ ] **3.5.1.1** Implement: `User Prompt → LLM → Actions[] → Validate → Cache Check → FFmpeg Render → Upload → Return URL`

---

#### 3.5.2 Preview Queue

- [ ] **3.5.2.1** Create new BullMQ queue: `preview`
- [ ] **3.5.2.2** Set concurrency: 2
- [ ] **3.5.2.3** Set timeout: 30s
- [ ] **3.5.2.4** Set attempts: 1 (no retry)
- [ ] **3.5.2.5** Set priority: 1 (high)

---

#### 3.5.3 Preview Caching

- [ ] **3.5.3.1** Create `preview-cache.service.ts`
- [ ] **3.5.3.2** Implement cache key generation: `SHA256(sceneId:platform:sortedActions)`
- [ ] **3.5.3.3** Store under `previews/` prefix in MinIO/local
- [ ] **3.5.3.4** Implement TTL: 1 hour
- [ ] **3.5.3.5** Implement invalidation on new action append

```typescript
function previewCacheKey(sceneId: string, actions: StudioAction[], platform: PlatformId): string {
  const sorted = JSON.stringify(actions, Object.keys(actions[0] || {}).sort());
  const hash = createHash("sha256").update(`${sceneId}:${platform}:${sorted}`).digest("hex");
  return `preview/${hash}.mp4`;
}
```

---

#### 3.5.4 Preview Rendering

- [ ] **3.5.4.1** Set resolution: 480p (854×480)
- [ ] **3.5.4.2** Set FPS: 15
- [ ] **3.5.4.3** Set CRF: 32
- [ ] **3.5.4.4** Set timeout: 30s
- [ ] **3.5.4.5** Cap max preview length: 30s

---

#### 3.5.5 Preview API Endpoint

- [ ] **3.5.5.1** Create `POST /api/studio/preview` endpoint
- [ ] **3.5.5.2** Accept body: `{ sceneId, actions, platform }`
- [ ] **3.5.5.3** Return: `{ previewUrl, renderTime, cached }`

---

#### 3.5.6 Frontend Preview Component

- [ ] **3.5.6.1** Implement `PreviewPanel.tsx` with HTML5 `<video>` element
- [ ] **3.5.6.2** Auto-play on URL change
- [ ] **3.5.6.3** Transport controls (play/pause, seek, time display)
- [ ] **3.5.6.4** Scene time range indicator
- [ ] **3.5.6.5** Loading spinner during render
- [ ] **3.5.6.6** Error state with retry button

---

### 3.6 Platform-Specific Encoding

#### 3.6.1 Platform Rules

- [ ] **3.6.1.1** Define YouTube Shorts preset: 9:16, 1080×1920, 60s max, H.264, AAC 128kbps, 256MB max
- [ ] **3.6.1.2** Define Instagram Reels preset: 9:16, 1080×1920, 90s max, H.264, AAC 128kbps, 256MB max
- [ ] **3.6.1.3** Define TikTok preset: 9:16, 1080×1920, 180s max, H.264, AAC 128kbps, 287MB max

---

#### 3.6.2 Platform Encoding Service

- [ ] **3.6.2.1** Create `getPlatformEncodingPreset(platform)` function
- [ ] **3.6.2.2** Return preset with maxDuration, resolution, codecs, extraFlags

---

### 3.7 Quality & Format Export Options

#### 3.7.1 Export UI

- [ ] **3.7.1.1** Update `ExportPanel.tsx` with Quality selector (480p, 720p, 1080p)
- [ ] **3.7.1.2** Add Format selector (MP4, WebM)
- [ ] **3.7.1.3** Pre-select platform from step 1

---

#### 3.7.2 Export API Enhancement

- [ ] **3.7.2.1** Update `ExportClipsDto` with `platform`, `format`, `quality`, `actions` fields
- [ ] **3.7.2.2** Maintain backward compatibility with existing fields

---

#### 3.7.3 Export Pipeline Update

- [ ] **3.7.3.1** Download — yt-dlp downloads section
- [ ] **3.7.3.2** Crop — vertical reformat (if platform requires 9:16)
- [ ] **3.7.3.3** Apply actions — FFmpeg filter graph from `StudioAction[]`
- [ ] **3.7.3.4** Encode — platform-specific codec + quality settings
- [ ] **3.7.3.5** Upload — to MinIO/local storage
- [ ] **3.7.3.6** Update DB — clip record with file URL, size, duration

---

## Phase 4: Pricing Tier Enforcement

### 4.1 Updated Limits

- [ ] **4.1.1** Free: $0/month, 3 analyses/month, 2 clips, heatmap view only, basic export
- [ ] **4.1.2** Pro: $20/month, unlimited analyses, 10 clips, full studio, prompt editing, all formats
- [ ] **4.1.3** Team: $40/month, unlimited analyses, 20 clips, everything in Pro + team seats

---

### 4.2 Implementation

- [ ] **4.2.1** Update `scenesLimit` defaults in Prisma schema (Free=2, Pro=10, Team=20)
- [ ] **4.2.2** Add enforcement in `ExportClipsUseCase`
- [ ] **4.2.3** Implement `ScenesLimitExceededException`

```typescript
const totalClips = await clipRepository.countByUser(userId);
const user = await userRepository.findById(userId);
if (user.scenesLimit !== -1 && totalClips + requestedClips > user.scenesLimit) {
  throw new ScenesLimitExceededException(user.scenesLimit, totalClips, requestedClips);
}
```

---

### 4.3 Upgrade Prompt

- [ ] **4.3.1** Show inline upgrade prompt in Studio UI when limit reached
- [ ] **4.3.2** Link to `/pricing` page

---

## Phase 5: Testing Strategy

### 5.1 Unit Tests

- [ ] **5.1.1** `prompt-translation.service.spec.ts` — LLM call formatting, response parsing, validation
- [ ] **5.1.2** `filter-graph-builder.spec.ts` — Action→filter mapping, filter_complex assembly, edge cases
- [ ] **5.1.3** `studio-actions.schema.spec.ts` — Zod schema validation for all action types
- [ ] **5.1.4** `preview-cache.spec.ts` — Cache key generation, hit/miss, TTL
- [ ] **5.1.5** `platform-encoding.spec.ts` — Platform preset selection, duration enforcement

---

### 5.2 Integration Tests

- [ ] **5.2.1** Prompt → Actions → FFmpeg command — full translation pipeline
- [ ] **5.2.2** Preview render (mocked FFmpeg) — end-to-end preview flow
- [ ] **5.2.3** Export with actions — full export with new action system
- [ ] **5.2.4** Platform encoding compliance — output matches platform specs

---

### 5.3 E2E Tests

- [ ] **5.3.1** Chat → preview → export — full user flow in studio
- [ ] **5.3.2** Multiple prompts stacking — actions accumulate correctly
- [ ] **5.3.3** Ambiguity resolution — clarification flow works
- [ ] **5.3.4** Pricing enforcement — limit blocks at threshold

---

### 5.4 Performance Tests

- [ ] **5.4.1** LLM translation response: < 5s (p95)
- [ ] **5.4.2** Preview render (480p, 15s clip): < 15s
- [ ] **5.4.3** Export render (1080p, 30s clip): < 60s
- [ ] **5.4.4** Preview cache hit: < 500ms
- [ ] **5.4.5** Chat input → first action: < 3s

---

## Phase 6: Deployment & Migration

### 6.1 Environment Variables

- [ ] **6.1.1** `LLM_PROVIDER` — `openai` | `anthropic`
- [ ] **6.1.2** `LLM_API_KEY` — API key
- [ ] **6.1.3** `LLM_MODEL` — model name (default: `gpt-4o-mini`)
- [ ] **6.1.4** `LLM_MAX_TOKENS` — max tokens (default: `2000`)
- [ ] **6.1.5** `LLM_TEMPERATURE` — temperature (default: `0.2`)
- [ ] **6.1.6** `PREVIEW_QUALITY` — preview quality (default: `480p`)
- [ ] **6.1.7** `PREVIEW_FPS` — preview FPS (default: `15`)
- [ ] **6.1.8** `PREVIEW_MAX_DURATION` — max preview duration (default: `30`)
- [ ] **6.1.9** `PREVIEW_CACHE_TTL_MS` — cache TTL (default: `3600000`)

---

### 6.2 Database Migration

- [ ] **6.2.1** Update `scenesLimit` default from 3 to 2 for new users
- [ ] **6.2.2** Existing free users keep current limit
- [ ] **6.2.3** Pro/Team users get limits via Stripe webhook

---

### 6.3 Redis Queue

- [ ] **6.3.1** Add `preview` queue alongside `analysis` and `export`
- [ ] **6.3.2** No new Redis infrastructure needed

---

### 6.4 Storage

- [ ] **6.4.1** Add `previews/` prefix in MinIO bucket
- [ ] **6.4.2** Add TTL cleanup job (delete files older than 1 hour)

---

### 6.5 CI/CD

- [ ] **6.5.1** `pnpm lint` (type-check)
- [ ] **6.5.2** `pnpm test` (all packages)
- [ ] **6.5.3** `pnpm build`
- [ ] **6.5.4** Deploy

---

### 6.6 Monitoring

- [ ] **6.6.1** LLM token usage/user/day — alert > 100K tokens
- [ ] **6.6.2** LLM API errors — alert > 5% error rate
- [ ] **6.6.3** Preview render time — alert p95 > 20s
- [ ] **6.6.4** Export render time — alert p95 > 90s
- [ ] **6.6.5** Preview cache hit rate — alert < 30% hit rate
- [ ] **6.6.6** BullMQ queue depth — alert preview > 10 pending

---

## Phase 7: Implementation Phases

### Phase A: Standard Language + LLM Layer (Weeks 1–2, 54 hours)

- [ ] **A.1** Define StudioAction types in shared (4h)
  - Create `studio-actions.ts` with all action interfaces + Zod schemas
- [ ] **A.2** Implement PromptTranslationService (12h)
  - LLM API integration, system prompt, response parsing, validation
- [ ] **A.3** Implement FilterGraphBuilder (16h)
  - Action→FFmpeg filter mapping, filter_complex assembly
- [ ] **A.4** Enhance FFmpegService (8h)
  - Add new filter support (animations, styles, transitions, speed, overlays)
- [ ] **A.5** Add output quality/format encoding (4h)
  - CRF control, WebM/VP9, resolution presets
- [ ] **A.6** Unit tests for A.2–A.5 (10h)
  - Comprehensive test coverage

**Deliverable:** Prompt → FFmpeg pipeline works end-to-end via API.

---

### Phase B: Chat UI + Preview (Weeks 3–4, 62 hours)

- [ ] **B.1** Build ChatPanel, ChatMessage, ChatInput components (10h)
  - Conversational UI in Studio
- [ ] **B.2** Build ActionList, ActionCard components (6h)
  - Display and manage applied actions
- [ ] **B.3** Build ClarificationCard component (4h)
  - LLM ambiguity resolution UI
- [ ] **B.4** Refactor StudioLayout to 3-panel (6h)
  - Chat | Preview | SceneSelector
- [ ] **B.5** Implement PreviewPanel (6h)
  - Video player with transport controls
- [ ] **B.6** Implement preview queue (BullMQ) (8h)
  - Background preview rendering
- [ ] **B.7** Implement preview caching (MinIO) (4h)
  - Cache key generation, TTL, storage
- [ ] **B.8** POST /api/studio/preview endpoint (4h)
  - API endpoint for preview requests
- [ ] **B.9** Extend use-studio.ts reducer (6h)
  - New state: messages, actions, previewUrl
- [ ] **B.10** Integration tests (8h)
  - Chat → translate → preview → render flow

**Deliverable:** Full chat-based editing with live server-side preview.

---

### Phase C: Export + Pricing (Week 5, 38 hours)

- [ ] **C.1** Update ExportClipsDto for actions (4h)
  - Accept StudioAction[] in export request
- [ ] **C.2** Refactor ClipWorker pipeline (8h)
  - Replace separate caption/music/template passes with unified action pipeline
- [ ] **C.3** Platform-specific encoding (4h)
  - Encoding presets per platform
- [ ] **C.4** Quality/format selection in export (4h)
  - 480p/720p/1080p, mp4/webm
- [ ] **C.5** Pricing tier enforcement (6h)
  - scenesLimit check, upgrade prompts
- [ ] **C.6** Update ExportPanel UI (4h)
  - Quality/format/platform selectors
- [ ] **C.7** E2E tests (8h)
  - Full flow: chat → preview → export → download

**Deliverable:** Complete export pipeline with pricing enforcement.

---

### Phase D: Polish + Launch (Week 6, 22 hours)

- [ ] **D.1** Design pass on chat UI (6h)
  - NFR-8 compliance, elegant-brand bar
- [ ] **D.2** Error handling + retry (4h)
  - LLM failures, FFmpeg failures, timeout handling
- [ ] **D.3** Rate limiting for LLM calls (4h)
  - Per-user token limits
- [ ] **D.4** Sentry integration for new services (2h)
  - Error tracking
- [ ] **D.5** Documentation (2h)
  - API docs, prompt examples, architecture
- [ ] **D.6** Performance optimization (4h)
  - Preview render time, filter chain optimization

**Deliverable:** Production-ready prompt-based editing studio.

---

### Effort Summary

| Phase | Hours | Weeks (part-time) |
|---|---|---|
| A: Language + LLM | 54 | 1.5–2 |
| B: Chat UI + Preview | 62 | 2 |
| C: Export + Pricing | 38 | 1 |
| D: Polish + Launch | 22 | 0.5–1 |
| **Total** | **176** | **~5–6 weeks** |

At 20 hrs/week: ~9 weeks. At 30 hrs/week: ~6 weeks.

---

## Phase 8: Risk Mitigations

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

---

## Phase 9: File Impact Summary

### New Files (15)

| Path | Purpose |
|---|---|
| `packages/shared/src/types/studio-actions.ts` | Action type definitions + Zod schemas |
| `apps/api/src/infrastructure/external/prompt-translation.service.ts` | LLM integration |
| `apps/api/src/infrastructure/external/filter-graph-builder.ts` | FFmpeg filter_complex builder |
| `apps/api/src/infrastructure/external/preview-cache.service.ts` | Preview caching |
| `apps/api/src/infrastructure/workers/preview.worker.ts` | Preview render worker |
| `apps/api/src/modules/studio/studio.module.ts` | Studio module |
| `apps/api/src/modules/studio/studio.controller.ts` | Preview + translate endpoints |
| `apps/api/src/modules/studio/studio.service.ts` | Studio orchestration |
| `apps/web/src/presentation/components/studio/ChatPanel.tsx` | Chat UI |
| `apps/web/src/presentation/components/studio/ChatMessage.tsx` | Message bubble |
| `apps/web/src/presentation/components/studio/ChatInput.tsx` | Text input |
| `apps/web/src/presentation/components/studio/ActionList.tsx` | Applied actions |
| `apps/web/src/presentation/components/studio/ActionCard.tsx` | Single action |
| `apps/web/src/presentation/components/studio/ClarificationCard.tsx` | Clarification prompt |
| `apps/web/src/presentation/components/studio/PreviewPanel.tsx` | Preview player |

### Modified Files (10)

| Path | Changes |
|---|---|
| `apps/api/src/infrastructure/external/ffmpeg.service.ts` | Add animation, style, transition, speed, overlay filters |
| `apps/api/src/infrastructure/workers/clip.worker.ts` | Unified action pipeline |
| `apps/api/src/application/dto/export-clips.dto.ts` | Add actions field, quality/format |
| `apps/api/src/main.ts` | Register preview queue |
| `apps/web/src/application/hooks/use-studio.ts` | New state for chat/actions/preview |
| `apps/web/src/app/studio/page.tsx` | 3-panel layout |
| `apps/web/src/domain/entities/studio.ts` | New types |
| `apps/web/src/domain/ports/job-api.port.ts` | Add preview endpoint |
| `apps/web/src/infrastructure/api/job-api.client.ts` | Add preview API call |
| `apps/api/prisma/schema.prisma` | Update scenesLimit default |

---

## Phase 10: UI/UX Overhaul

### 10.1 Color System

**Dark mode (primary):**
- [ ] **10.1.1** Background: `hsl(222, 47%, 5%)` — near-black
- [ ] **10.1.2** Card: `hsl(222, 47%, 8%)`
- [ ] **10.1.3** Border: `hsl(217, 20%, 15%)`
- [ ] **10.1.4** Surface: `hsl(222, 47%, 10%)`
- [ ] **10.1.5** Primary accent: `hsl(354, 79%, 65%)` — crimson

**Light mode:**
- [ ] **10.1.6** Background: `hsl(0, 0%, 98%)`
- [ ] **10.1.7** Card: `hsl(0, 0%, 100%)`
- [ ] **10.1.8** Border: `hsl(220, 13%, 91%)`

---

### 10.2 Components

- [ ] **10.2.1** `DotsBackground` — CSS `radial-gradient` dot pattern (24px grid, 0.4 opacity)
- [ ] **10.2.2** `FloatingIcon` — CSS keyframe floating animation (4-6s loops)
- [ ] **10.2.3** `GlowOrb` — Pulsing radial gradient effect
- [ ] **10.2.4** `HeatmapWave` — SVG path morphing with crimson gradient

---

### 10.3 Page Updates

- [ ] **10.3.1** Home — Floating icons (film, scissors, play), glow orbs, heatmap wave divider, dots background
- [ ] **10.3.2** About — Hero + 3-column grid (What/Why/Who) + monetization data section
- [ ] **10.3.3** Login — Dots background + dual glow orbs
- [ ] **10.3.4** Pricing — Hero section with glow, dots background on tiers
- [ ] **10.3.5** Features — Dots backgrounds on hero and feature grid
- [ ] **10.3.6** Privacy/Terms — Subtle dots background

---

### 10.4 Logo/Favicon

- [ ] **10.4.1** Filled dark background (`#09090b` / `#171717` gradient)
- [ ] **10.4.2** SVG glow filter on stroke paths
- [ ] **10.4.3** Refined gradient transitions
- [ ] **10.4.4** Animated opacity on favicon/icon variants

---

## Example User Journey

1. User pastes YouTube URL → Analyze stage runs → Heatmap chart shows engagement data
2. User drags on chart to select a 15s high-engagement moment → Scene added to list
3. User clicks "Open in Studio" → Navigates to Studio with scene loaded
4. User selects platform → "YouTube Shorts" (9:16 locked)
5. User types: _"Add bold white captions saying 'Wait for it...' from 0-2s, then 'HERE WE GO!' in neon style from 5-8s with a pop animation"_
6. LLM translates → 2 `add_captions` actions returned
7. System renders preview → 480p preview appears in sidebar, user watches it
8. User types: _"Also mix in some chill beats at 30% volume with a 2s fade in"_
9. LLM translates → 1 `mix_audio` action appended (total: 3 actions)
10. Preview re-renders → Updated preview with captions + music
11. User types: _"And add a vignette effect"_
12. Actions stack → 4 total actions, preview updates
13. User satisfied → Clicks "Export" → Selects 1080p MP4 → Export renders
14. User downloads → 1080p MP4 clip with all effects applied
