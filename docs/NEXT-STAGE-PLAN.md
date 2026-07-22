# SpikeClip — Next Stage Plan

> Transform the editing process from boring manual configuration into "vibe editing" via natural language prompts.

This plan covers the evolution from the current working product into a prompt-driven editing studio with LLM-powered translation, server-side preview rendering, and full export pipeline.

---

## 0. Git Setup

Create a `develop` branch from `main` as the integration branch for all new work. All feature branches merge into `develop`; `main` remains stable for production releases.

```bash
git checkout main
git checkout -b develop
```

---

## 1. Current State Assessment

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

1. **Prompt-based chat interface** replacing current editor panels
2. **LLM translation layer** (natural language → structured actions)
3. **Standard action language** (intermediate representation)
4. **FFmpeg filter graph builder** (actions → filter_complex)
5. **Server-side preview rendering** (480p, cached)
6. **Quality/format export options** (480p/720p/1080p, mp4/webm)
7. **Platform-specific encoding rules**
8. **Pricing tier enforcement** (Free: 2, Pro: 10, Team: 20 clips)
9. **Additional FFmpeg capabilities** (text animations, styles, transitions, speed, overlays)

---

## 2. Stage 1: Analyze — Enhancement Tasks

The Analyze stage is largely functional. These refinements close remaining gaps:

### 2.1 Drag/Drop Scene Selection on Heatmap

**Current state:** `SceneEditor.tsx` and `EditableSceneCard.tsx` support adding/removing scenes. `HeatmapChart.tsx` supports click-to-add via `onChartClick`.

**Enhancement:** Enable drag-to-create on the heatmap chart — user drags horizontally on the engagement curve to define a new scene's start/end. The chart already renders scene overlay rectangles (`ReferenceArea`). Add `onMouseDown`/`onMouseUp` handlers to create new scenes from drag range.

**Files:** `apps/web/src/presentation/components/heatmap/HeatmapChart.tsx`

### 2.2 Auto-Update Seconds/Minutes Fields

**Current state:** `EditableSceneCard.tsx` has time inputs that update scene start/end.

**Enhancement:** Bidirectional sync — when user drags on chart, time fields update; when user types in time fields, chart selection updates. Already partially working via shared state in `use-scene-editor.ts`. Verify full round-trip sync.

**Files:** `apps/web/src/application/hooks/use-scene-editor.ts`, `EditableSceneCard.tsx`

### 2.3 Video Player Progress Bar Reflecting Selected Moments

**Current state:** `VideoScenePreview.tsx` embeds YouTube player via `react-youtube`, supports play/pause/skip, seeks to scene timestamps.

**Enhancement:** Show colored markers on the player's progress bar for each selected scene. Since YouTube's embedded player doesn't expose a customizable progress bar, build a custom progress bar below the embed that shows: (a) current playback position, (b) colored segments for each selected scene, (c) click-to-seek on scenes.

**Files:** `apps/web/src/presentation/components/video/VideoScenePreview.tsx`

### 2.4 Sidebar Video Metadata

**Current state:** Dashboard shows `videoTitle`, `videoThumbnail`, `videoDuration`, `videoViewCount`, `videoUploadDate`, `videoChannelName` from the Job entity.

**Enhancement:** Display as a styled sidebar card with thumbnail, channel avatar (if available), view count with formatting (e.g., "1.2M views"), upload date relative ("3 months ago"), and duration.

**Files:** `apps/web/src/app/dashboard/page.tsx` (or new `VideoMetadataSidebar.tsx` component)

---

## 3. Stage 2: Studio — Prompt-Based "Vibe Editing"

### 3.1 Standard Action Language (Intermediate Representation)

The bridge between natural language and FFmpeg. Every user prompt is translated by the LLM into an ordered array of **typed actions**.

#### 3.1.1 Action Schema

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

#### 3.1.2 Example Prompt-to-Action Translations

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

#### 3.1.3 Ambiguity Resolution

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

### 3.2 LLM Translation Service

#### 3.2.1 Architecture

```
UserPrompt + Context → LLM API → Validated Actions[] → ActionStore
```

New service: `apps/api/src/infrastructure/external/prompt-translation.service.ts`

#### 3.2.2 LLM System Prompt

```markdown
You are SpikeClip's editing assistant. You translate natural language editing
instructions into structured JSON actions.

## Available Actions

### add_captions
Add text overlay to the video.
Parameters: text (required), font (inter|impact|bebas|playfair|mono),
size (12-120), color (hex), position (top|center|bottom), start (seconds),
end (seconds), animation (fade|slide|pop|typewriter|none),
style (normal|bold|outlined|shadow|neon), opacity (0-1),
backgroundColor (hex), backgroundEnabled (bool), strokeWidth (number),
shadowRadius (number), x (0-100%), y (0-100%).

### mix_audio
Mix background music/audio with the original.
Parameters: volume (0-1), originalVolume (0-1), fadeIn (seconds),
fadeOut (seconds), startTime (seconds), tone
(normal|bass_boost|treble_boost|warm).

### apply_effect
Apply visual effects.
Parameters: type (vignette|zoom_in|zoom_out|blur|sharpen|sepia|bw|glitch|glow),
intensity (0-1), startTime (seconds), endTime (seconds).

### set_speed
Change playback speed.
Parameters: rate (0.25-4.0), preservePitch (bool).

### add_overlay
Add image overlay/watermark.
Parameters: assetKey (string), x (0-100%), y (0-100%), scale (0.1-2.0),
opacity (0-1), startTime (seconds), endTime (seconds).

### set_transition
Add transition effect at clip start or end.
Parameters: type (fade|wipeleft|wiperight|wipeup|wipedown|slideleft|slideright|slideup|slidedown|circlecrop|fadeblack|fadewhite|radial|smoothleft|smoothright|circleopen|circleclose|dissolve|pixelize|zoomin|fadefast|fadeslow|coverleft|coverright|revealleft|revealright),
duration (seconds), position (start|end).
Note: 56 transition types available. Start/end uses `fade` filter. Between clips uses `xfade` filter.

### add_background
Add colored background segment.
Parameters: color (hex), startTime (seconds), endTime (seconds).

### trim
Trim the clip to a specific range.
Parameters: startTime (seconds), endTime (seconds).

## Context
- Platform: {{platform}} (aspect ratio: {{aspectRatio}}, max duration: {{maxDuration}}s)
- Scene: {{startTime}}s - {{endTime}}s (duration: {{duration}}s)
- Available assets: {{assets}}

## Rules
1. Return ONLY a JSON array of actions. No prose, no markdown.
2. If the user's request is ambiguous, return a clarification object instead.
3. Time values must be within the scene's range ({{startTime}}-{{endTime}}).
4. Respect platform duration limits.
5. Default font: "inter", default size: 48, default color: "#FFFFFF".
6. If the user doesn't specify timing, apply to the full scene duration.
7. Multiple actions of the same type are allowed (e.g., two caption blocks).
8. Order matters — actions execute sequentially.
```

#### 3.2.3 LLM Provider Configuration

| Config | Default | Notes |
|---|---|---|
| `LLM_PROVIDER` | `openai` | `openai` or `anthropic` |
| `LLM_MODEL` | `gpt-4o-mini` | Cost-effective for structured JSON |
| `LLM_MAX_TOKENS` | `2000` | Enough for complex multi-action prompts |
| `LLM_TEMPERATURE` | `0.2` | Low temperature for consistent JSON output |
| `LLM_TIMEOUT_MS` | `15000` | 15s timeout |

#### 3.2.4 Response Validation

After LLM returns, validate the JSON against the action schema:
1. Parse JSON (reject if malformed)
2. Validate each action against its type schema (Zod)
3. Clamp out-of-range values (e.g., volume > 1 → 1)
4. Validate timing within scene bounds
5. Return errors as clarification prompts if validation fails

---

### 3.3 FFmpeg Filter Graph Builder

New service: `apps/api/src/infrastructure/external/filter-graph-builder.ts`

Composes an array of `StudioAction` into a single FFmpeg command with `filter_complex`.

#### 3.3.1 Filter Chain Mapping

**Video filters (applied in order via numbered links `[v0]→[v1]→[v2]...`):**

| Action | Video Filter | Example |
|---|---|---|
| Crop + scale (vertical) | `crop=ih*9/16:ih,scale=1080:1920` | Always first |
| `add_captions` (fade) | `drawtext=...:alpha='if(between(t,$s,$s+0.3),clip((t-$s)/0.3,0,1),1)'` | Per caption block |
| `add_captions` (slide) | `drawtext=...:x='if(between(t,$s,$s+0.4),$sx+($ex-$sx)*clip((t-$s)/0.4,0,1),$ex)'` | Horizontal slide |
| `add_captions` (pop) | `drawtext=...:fontsize='if(between(t,$s,$s+0.15),$sz*0.5+$sz*2*clip((t-$s)/0.15,0,1),$sz)'` | Scale bounce |
| `add_captions` (typewriter) | Multiple drawtext with `enable='between(t,$charStart,$charEnd)'` per character | Character reveal |
| `add_captions` (outlined) | `drawtext=...:borderw=$strokeWidth:bordercolor=black` | Text outline |
| `add_captions` (shadow) | `drawtext=...:shadowx=2:shadowy=2:shadowcolor=black@0.5` | Drop shadow |
| `add_captions` (neon) | `drawtext=...:fontcolor=cyan:borderw=2:bordercolor=cyan` + duplicate pass with `boxblur=5:5` | Glow effect |
| `add_captions` (background box) | `drawtext=...:box=1:boxcolor=black@0.5:boxborderw=10` | Text with background box |
| `apply_effect` (vignette) | `vignette=angle=${intensity * PI / 2}` (intensity 0→no vignette, 1→max at PI/2) | Darkened edges |
| `apply_effect` (zoom_in) | `zoompan=z='min(zoom+0.001,${target})':d=1:s=1080x1920:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'` | Ken Burns in (d=1 for video) |
| `apply_effect` (zoom_out) | `zoompan=z='if(eq(on,1),${target},max(zoom-0.001,1.0))':d=1:s=1080x1920:fps=30:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'` | Ken Burns out (d=1 for video) |
| `apply_effect` (blur) | `boxblur=${radius}:${radius}` | Gaussian blur |
| `apply_effect` (sharpen) | `unsharp=5:5:${amount}:5:5:${amount}` | USM sharpening |
| `apply_effect` (sepia) | `colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131` | Sepia tone |
| `apply_effect` (bw) | `hue=s=0` | Desaturate |
| `apply_effect` (glitch) | `rgbashift=rh=3:bh=-3:enable='between(t,$s,$e)'` + `noise=alls=20:allf=t` | RGB shift + noise |
| `apply_effect` (glow) | `gblur=sigma=20,format=rgba,colorchannelmixer=aa=0.5,overlay` | Soft glow overlay |
| `add_overlay` | `overlay=x='${x}':y='${y}':enable='between(t,$s,$e)'` | Image on top |
| `add_background` | `drawbox=x=0:y=0:w=iw:h=ih:color=${color}@1:enable='between(t,$s,$e)'` | Colored box |
| `set_speed` | `setpts=PTS/${rate}` | Video speed |
| `set_transition` (fade start) | `fade=t=in:d=${duration}:st=0` | Fade in at clip start |
| `set_transition` (fade end) | `fade=t=out:d=${duration}:st=${fadeStart}` | Fade out at clip end |
| `set_transition` (between clips) | `xfade=transition=${type}:duration=${duration}:offset=${offset}` | 56 transition types between concatenated clips |

**Audio filters (applied via separate link chain `[a0]→[a1]...`):**

| Action | Audio Filter |
|---|---|
| `set_speed` | `atempo=${rate}` (range 0.5–100.0; for >2x chain: `atempo=sqrt(N),atempo=sqrt(N)` to avoid artifacts) |
| `mix_audio` (original) | `[0:a]volume=${originalVolume}[orig]` |
| `mix_audio` (music) | `[1:a]volume=${volume},afade=t=in:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut}[music]` |
| `mix_audio` (bass_boost) | `equalizer=f=60:t=q:w=1:g=10` |
| `mix_audio` (treble_boost) | `equalizer=f=8000:t=q:w=1:g=8` |
| `mix_audio` (warm) | `equalizer=f=200:t=q:w=1:g=5,equalizer=f=3000:t=q:w=1:g=-3` |
| `mix_audio` (combine) | `[orig][music]amix=inputs=2:duration=first:normalize=0[aout]` |

#### 3.3.2 Command Assembly Algorithm

```
1. Start with input file(s)
2. Build video filter chain:
   a. Always start with crop+scale for vertical format
   b. Append each video action's filter in order
   c. Assign numbered links: [v0]→[v1]→[v2]...
3. Build audio filter chain:
   a. Scale original audio volume
   b. Process music track (if mix_audio action exists)
   c. Apply speed change (if set_speed action exists)
   d. Mix streams with amix
4. Assemble filter_complex string
5. Set output codec params based on format + quality
6. Build final command array for execFile
```

#### 3.3.3 Output Encoding

```typescript
interface OutputConfig {
  format: "mp4" | "webm";
  quality: "480p" | "720p" | "1080p";
}

// Resolution + CRF mapping
const QUALITY_PRESETS = {
  "480p": { scale: "scale=-2:480",  crf: "28" },
  "720p": { scale: "scale=-2:720",  crf: "26" },
  "1080p": { scale: "scale=-2:1080", crf: "23" },
};

// Format codec mapping
const FORMAT_CODECS = {
  mp4:  ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac"],
  webm: ["-c:v", "libvpx-vp9", "-b:v", "2M", "-pix_fmt", "yuv420p", "-c:a", "libopus"],
};
```

#### 3.3.4 Example Assembled Command

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

### 3.4 Chat Interface (Frontend)

#### 3.4.1 UI Layout

The Studio page becomes a **3-panel layout**:

```
┌──────────────────────────────────────────────────────────────┐
│  StudioToolbar (platform select, export button)              │
├──────────────┬─────────────────────────┬─────────────────────┤
│              │                         │                     │
│   Chat Panel │   Preview Panel (1/3)   │   Scene Selector    │
│   (1/3)      │   Live preview video    │   (collapsible)     │
│              │                         │                     │
│  [messages]  │   [video player]        │   [scene list]      │
│  [input]     │   [transport controls]  │                     │
│              │                         │                     │
├──────────────┴─────────────────────────┴─────────────────────┤
│  ActionList (applied actions with edit/remove)               │
└──────────────────────────────────────────────────────────────┘
```

#### 3.4.2 Chat Components

New components in `apps/web/src/presentation/components/studio/`:

| Component | Purpose |
|---|---|
| `ChatPanel.tsx` | Message list + input field, scrollable |
| `ChatMessage.tsx` | Single message bubble (user or system) |
| `ChatInput.tsx` | Text input with send button, placeholder text |
| `ActionList.tsx` | Horizontal/vertical list of applied actions with remove/edit buttons |
| `ActionCard.tsx` | Single action display (icon + label + params) |
| `ClarificationCard.tsx` | System clarification prompt with clickable suggestions |
| `PreviewPanel.tsx` | Video player showing server-rendered preview |

#### 3.4.3 Chat Flow

1. User types prompt in `ChatInput`
2. Message appears in `ChatPanel` as user bubble
3. Loading indicator while LLM translates
4. System response appears:
   - If actions: shows parsed actions in `ActionList`, triggers preview render
   - If clarification: shows `ClarificationCard` with suggestions
5. Preview renders server-side, `PreviewPanel` loads the preview URL
6. User can:
   - Type another prompt (actions stack/add to existing)
   - Remove individual actions from `ActionList`
   - Click "Export" when satisfied

#### 3.4.4 State Management

Extend `use-studio.ts` reducer with new state:

```typescript
interface StudioState {
  // Existing
  platform: PlatformId;
  selectedScenes: Scene[];
  // New
  messages: ChatMessage[];
  actions: StudioAction[];
  previewUrl: string | null;
  previewLoading: boolean;
  previewError: string | null;
  exportConfig: OutputConfig;
}

type StudioAction =
  | { type: "ADD_MESSAGE"; message: ChatMessage }
  | { type: "SET_ACTIONS"; actions: StudioAction[] }
  | { type: "REMOVE_ACTION"; index: number }
  | { type: "SET_PREVIEW_URL"; url: string }
  | { type: "SET_PREVIEW_LOADING"; loading: boolean }
  | { type: "SET_EXPORT_CONFIG"; config: Partial<OutputConfig> };
```

---

### 3.5 Server-Side Preview Rendering

#### 3.5.1 Preview Pipeline

```
User Prompt → LLM → Actions[] → Validate → Cache Check → FFmpeg Render → Upload → Return URL
```

#### 3.5.2 Preview Queue

New BullMQ queue: `preview`

| Config | Value |
|---|---|
| Concurrency | 2 (preview renders are lighter than exports) |
| Timeout | 30s |
| Attempts | 1 (no retry for previews) |
| Priority | 1 (high — user is waiting) |

#### 3.5.3 Preview Caching

```typescript
function previewCacheKey(sceneId: string, actions: StudioAction[], platform: PlatformId): string {
  const sorted = JSON.stringify(actions, Object.keys(actions[0] || {}).sort());
  const hash = createHash("sha256").update(`${sceneId}:${platform}:${sorted}`).digest("hex");
  return `preview/${hash}.mp4`;
}
```

Cache invalidation: TTL-based (1 hour) + on new action append. Store in MinIO/local storage under `previews/` prefix.

#### 3.5.4 Preview Rendering

| Parameter | Value | Rationale |
|---|---|---|
| Resolution | 480p (854×480) | Fast render, good enough for preview |
| FPS | 15 | Reduces frame count by 2.5× |
| CRF | 32 | Lower quality = faster encode |
| Timeout | 30s | Kill if too slow |
| Max preview length | 30s | Cap for long scenes |

#### 3.5.5 Preview API Endpoint

```
POST /api/studio/preview
Body: {
  sceneId: string,
  actions: StudioAction[],
  platform: PlatformId
}
Response: {
  previewUrl: string,   // signed URL, 1hr expiry
  renderTime: number,   // ms
  cached: boolean
}
```

#### 3.5.6 Frontend Preview Component

`PreviewPanel.tsx` uses HTML5 `<video>` element with:
- Auto-play on URL change
- Transport controls (play/pause, seek, time display)
- Scene time range indicator
- Loading spinner during render
- Error state with retry button

---

### 3.6 Platform-Specific Encoding

#### 3.6.1 Platform Rules

| Platform | Aspect | Resolution | Max Duration | Codec | Audio | Max Size |
|---|---|---|---|---|---|---|
| YouTube Shorts | 9:16 | 1080×1920 | 60s | H.264 | AAC 128kbps | 256MB |
| Instagram Reels | 9:16 | 1080×1920 | 90s | H.264 | AAC 128kbps | 256MB |
| TikTok | 9:16 | 1080×1920 | 180s | H.264 | AAC 128kbps | 287MB |

#### 3.6.2 Platform Encoding Service

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

### 3.7 Quality & Format Export Options

#### 3.7.1 Export UI

`ExportPanel.tsx` provides:

| Control | Options | Default |
|---|---|---|
| Quality | 480p, 720p, 1080p | 1080p |
| Format | MP4, WebM | MP4 |
| Platform | YouTube Shorts, Instagram Reels, TikTok | (pre-selected from step 1) |

#### 3.7.2 Export API Enhancement

Update `ExportClipsDto` to accept:

```typescript
class ExportClipsDto {
  scenes: ExportSceneDto[];
  platform?: string;         // "youtube-shorts" | "instagram-reels" | "tiktok"
  format?: string;           // "mp4" | "webm"
  quality?: string;          // "480p" | "720p" | "1080p"
  actions?: StudioAction[];  // structured actions from prompt translation
  // Keep backward compat with existing fields
  captions?: CaptionDto[];
  music?: MusicConfigDto;
  templateId?: string;
  templateConfig?: TemplateConfigDto;
}
```

#### 3.7.3 Export Pipeline Update

The ClipWorker pipeline becomes:

1. **Download** — yt-dlp downloads section
2. **Crop** — vertical reformat (if platform requires 9:16)
3. **Apply actions** — FFmpeg filter graph from `StudioAction[]` (replaces separate caption/music/template passes)
4. **Encode** — platform-specific codec + quality settings
5. **Upload** — to MinIO/local storage
6. **Update DB** — clip record with file URL, size, duration

---

## 4. Pricing Tier Enforcement

### 4.1 Updated Limits

| Tier | Price | Analyses/month | Clips (scenes) | Features |
|---|---|---|---|---|
| Free | $0 | 3 | 2 | Heatmap view only, basic export |
| Pro | $20/mo | Unlimited | 10 | Full studio, prompt editing, all formats |
| Team | $40/mo | Unlimited | 20 | Everything in Pro + team seats |

### 4.2 Implementation

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

### 4.3 Upgrade Prompt

When limit is reached, show inline upgrade prompt in the Studio UI with link to `/pricing`.

---

## 5. Testing Strategy

### 5.1 Unit Tests

| Test File | What It Tests |
|---|---|
| `prompt-translation.service.spec.ts` | LLM call formatting, response parsing, validation |
| `filter-graph-builder.spec.ts` | Action→filter mapping, filter_complex assembly, edge cases |
| `studio-actions.schema.spec.ts` | Zod schema validation for all action types |
| `preview-cache.spec.ts` | Cache key generation, hit/miss, TTL |
| `platform-encoding.spec.ts` | Platform preset selection, duration enforcement |

### 5.2 Integration Tests

| Test | What It Tests |
|---|---|
| Prompt → Actions → FFmpeg command | Full translation pipeline |
| Preview render (mocked FFmpeg) | End-to-end preview flow |
| Export with actions | Full export with new action system |
| Platform encoding compliance | Output matches platform specs |

### 5.3 E2E Tests

| Test | What It Tests |
|---|---|
| Chat → preview → export | Full user flow in studio |
| Multiple prompts stacking | Actions accumulate correctly |
| Ambiguity resolution | Clarification flow works |
| Pricing enforcement | Limit blocks at threshold |

### 5.4 Performance Tests

| Metric | Target |
|---|---|
| LLM translation response | < 5s (p95) |
| Preview render (480p, 15s clip) | < 15s |
| Export render (1080p, 30s clip) | < 60s |
| Preview cache hit | < 500ms |
| Chat input → first action | < 3s |

---

## 6. Deployment & Migration

### 6.1 Environment Variables

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

### 6.2 Database Migration

```prisma
// Update default scenesLimit
model User {
  scenesLimit     Int      @default(2)  // was 3
  // ... rest unchanged
}
```

Note: Existing free users keep their current limit. New users get 2. Pro/Team users get their respective limits via Stripe webhook.

### 6.3 Redis Queue

Add `preview` queue alongside existing `analysis` and `export` queues. No new Redis infrastructure needed.

### 6.4 Storage

Add `previews/` prefix in MinIO bucket for cached preview files. Add TTL cleanup job (delete files older than 1 hour).

### 6.5 CI/CD

Add to pipeline:
1. `pnpm lint` (type-check)
2. `pnpm test` (all packages)
3. `pnpm build`
4. Deploy

### 6.6 Monitoring

| Metric | Tool | Alert Threshold |
|---|---|---|
| LLM token usage/user/day | Custom counter | > 100K tokens |
| LLM API errors | Sentry | > 5% error rate |
| Preview render time | Custom histogram | p95 > 20s |
| Export render time | Custom histogram | p95 > 90s |
| Preview cache hit rate | Custom counter | < 30% hit rate |
| BullMQ queue depth | Redis info | preview > 10 pending |

---

## 7. Task Breakdown

### Phase A: Standard Language + LLM Layer (Weeks 1–2)

| Task | Hours | Description |
|---|---|---|
| A.1 Define StudioAction types in shared | 4 | Create `studio-actions.ts` with all action interfaces + Zod schemas |
| A.2 Implement PromptTranslationService | 12 | LLM API integration, system prompt, response parsing, validation |
| A.3 Implement FilterGraphBuilder | 16 | Action→FFmpeg filter mapping, filter_complex assembly |
| A.4 Enhance FFmpegService | 8 | Add new filter support (animations, styles, transitions, speed, overlays) |
| A.5 Add output quality/format encoding | 4 | CRF control, WebM/VP9, resolution presets |
| A.6 Unit tests for A.2–A.5 | 10 | Comprehensive test coverage |

**Deliverable:** Prompt → FFmpeg pipeline works end-to-end via API.

### Phase B: Chat UI + Preview (Weeks 3–4)

| Task | Hours | Description |
|---|---|---|
| B.1 Build ChatPanel, ChatMessage, ChatInput components | 10 | Conversational UI in Studio |
| B.2 Build ActionList, ActionCard components | 6 | Display and manage applied actions |
| B.3 Build ClarificationCard component | 4 | LLM ambiguity resolution UI |
| B.4 Refactor StudioLayout to 3-panel | 6 | Chat | Preview | SceneSelector |
| B.5 Implement PreviewPanel | 6 | Video player with transport controls |
| B.6 Implement preview queue (BullMQ) | 8 | Background preview rendering |
| B.7 Implement preview caching (MinIO) | 4 | Cache key generation, TTL, storage |
| B.8 POST /api/studio/preview endpoint | 4 | API endpoint for preview requests |
| B.9 Extend use-studio.ts reducer | 6 | New state: messages, actions, previewUrl |
| B.10 Integration tests | 8 | Chat → translate → preview → render flow |

**Deliverable:** Full chat-based editing with live server-side preview.

### Phase C: Export + Pricing (Week 5)

| Task | Hours | Description |
|---|---|---|
| C.1 Update ExportClipsDto for actions | 4 | Accept StudioAction[] in export request |
| C.2 Refactor ClipWorker pipeline | 8 | Replace separate caption/music/template passes with unified action pipeline |
| C.3 Platform-specific encoding | 4 | Encoding presets per platform |
| C.4 Quality/format selection in export | 4 | 480p/720p/1080p, mp4/webm |
| C.5 Pricing tier enforcement | 6 | scenesLimit check, upgrade prompts |
| C.6 Update ExportPanel UI | 4 | Quality/format/platform selectors |
| C.7 E2E tests | 8 | Full flow: chat → preview → export → download |

**Deliverable:** Complete export pipeline with pricing enforcement.

### Phase D: Polish + Launch (Week 6)

| Task | Hours | Description |
|---|---|---|
| D.1 Design pass on chat UI | 6 | NFR-8 compliance, elegant-brand bar |
| D.2 Error handling + retry | 4 | LLM failures, FFmpeg failures, timeout handling |
| D.3 Rate limiting for LLM calls | 4 | Per-user token limits |
| D.4 Sentry integration for new services | 2 | Error tracking |
| D.5 Documentation | 2 | API docs, prompt examples, architecture |
| D.6 Performance optimization | 4 | Preview render time, filter chain optimization |

**Deliverable:** Production-ready prompt-based editing studio.

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

## 8. Risk Mitigations

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

## 9. File Impact Summary

### New Files

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

### Modified Files

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

## 10. Example User Journey

1. **User pastes YouTube URL** → Analyze stage runs → Heatmap chart shows engagement data
2. **User drags on chart** to select a 15s high-engagement moment → Scene added to list
3. **User clicks "Open in Studio"** → Navigates to Studio with scene loaded
4. **User selects platform** → "YouTube Shorts" (9:16 locked)
5. **User types in chat:** _"Add bold white captions saying 'Wait for it...' from 0-2s, then 'HERE WE GO!' in neon style from 5-8s with a pop animation"_
6. **LLM translates** → 2 `add_captions` actions returned
7. **System renders preview** → 480p preview appears in sidebar, user watches it
8. **User types:** _"Also mix in some chill beats at 30% volume with a 2s fade in"_
9. **LLM translates** → 1 `mix_audio` action appended (total: 3 actions)
10. **Preview re-renders** → Updated preview with captions + music
11. **User types:** _"And add a vignette effect"_
12. **Actions stack** → 4 total actions, preview updates
13. **User satisfied** → Clicks "Export" → Selects 1080p MP4 → Export renders
14. **User downloads** → 1080p MP4 clip with all effects applied

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

## 11. UI/UX Overhaul

Comprehensive visual refresh across all public-facing pages. Focus on refined dark mode, animated elements, and consistent design system.

### 11.1 Color System

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

### 11.2 Components

| Component | File | Purpose |
|-----------|------|---------|
| `DotsBackground` | `layout/DotsBackground.tsx` | CSS `radial-gradient` dot pattern (24px grid, 0.4 opacity) |
| `FloatingIcon` | `features/FloatingIcon.tsx` | CSS keyframe floating animation (4-6s loops) |
| `GlowOrb` | `features/GlowOrb.tsx` | Pulsing radial gradient effect |
| `HeatmapWave` | `features/HeatmapWave.tsx` | SVG path morphing with crimson gradient |

### 11.3 Page Updates

| Page | Changes |
|------|---------|
| Home | Floating icons (film, scissors, play), glow orbs, heatmap wave divider, dots background |
| About | Hero + 3-column grid (What/Why/Who) + monetization data section |
| Login | Dots background + dual glow orbs |
| Pricing | Hero section with glow, dots background on tiers |
| Features | Dots backgrounds on hero and feature grid |
| Privacy/Terms | Subtle dots background |

### 11.4 Logo/Favicon

All SVGs updated with:
- Filled dark background (`#09090b` / `#171717` gradient)
- SVG glow filter on stroke paths
- Refined gradient transitions
- Animated opacity on favicon/icon variants
