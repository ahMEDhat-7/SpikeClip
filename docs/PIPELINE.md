SpikeClip — New End-to-End Pipeline
0. Objective
Replace the current:

URL
  ↓
Downloaded Clip
  ↓
Heatmap Analysis
  ↓
Studio
  ↓
Export
  ↓
Download

pipeline with a YouTube-account-first architecture:

YouTube Studio Account
        ↓
YouTube Studio MCP
        ↓
My Project: SpikeClip
        ↓
Extract
        ↓
Generate
        ↓
Editor
        ↓
Export
        ↓
Download

The core architectural change is:

SpikeClip should no longer treat a pasted YouTube URL as the primary source of truth. The authenticated YouTube account/channel becomes the source of videos, metadata, analytics and candidate content.

The existing video-processing capabilities remain useful, especially:

yt-dlp
FFmpeg
heatmap processing
scene selection
captions
vertical cropping
templates
LLM → StudioAction[]
BullMQ
MinIO/local storage
export workers
However, their responsibility moves downstream of the YouTube/MCP integration.

1. Target Architecture
┌──────────────────────────────┐
│       YouTube Account        │
│       Google OAuth           │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      YouTube Studio MCP      │
│                              │
│ channel                      │
│ videos                       │
│ metadata                     │
│ analytics                    │
│ thumbnails                   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       SpikeClip Project      │
│                              │
│ Project                      │
│ ├── Sources                  │
│ ├── Extracted Scenes         │
│ ├── Generated Clips          │
│ ├── Editor Configurations    │
│ └── Exports                  │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
   EXTRACT           GENERATE
       │                │
       └───────┬────────┘
               ▼
           EDITOR
               │
               ▼
            EXPORT
               │
               ▼
           DOWNLOAD

2. Important MCP Constraint
The referenced YouTube Studio MCP is a local MCP server. It runs over stdio and uses the user's own Google OAuth credentials.

The repository currently provides tools for:

authenticated channel overview
listing videos
getting individual videos
updating video metadata
uploading thumbnails
channel analytics
video analytics
posting comments
listing comments
It does not replace the actual media-processing system.

Therefore:

MCP = YouTube account/channel intelligence + control plane

SpikeClip backend = media acquisition + extraction + AI + editing + rendering

Do NOT attempt to force FFmpeg/video rendering responsibilities into MCP.

MCP should be treated as an integration boundary.

3. User Journey
The new UX should be:

Login / Connect YouTube
        ↓
Select YouTube Account / Channel
        ↓
Create or open SpikeClip Project
        ↓
Extract
        ↓
Select / inspect source videos
        ↓
Generate clips/scenes
        ↓
Open Editor
        ↓
Edit clips
        ↓
Export
        ↓
Download

The user should not need to paste a YouTube URL for the normal workflow.

URL-based ingestion may remain as an optional fallback/import feature.

4. Phase 0 — YouTube Connection
Goal
Connect the user's YouTube/Google account and make the authenticated channel available inside SpikeClip.

Flow
SpikeClip
   ↓
Connect YouTube
   ↓
Google OAuth
   ↓
YouTube Studio MCP
   ↓
Authenticated channel
   ↓
Store connection reference

Requirements
The MCP requires:

Google account with channel access
Google Cloud project
YouTube Data API v3
YouTube Analytics API
OAuth Desktop client
MCP-compatible client
The MCP uses OAuth scopes including:

youtube
youtube.force-ssl
youtube.readonly
yt-analytics.readonly

Credentials must never be exposed to the browser.

Backend model
Introduce:

YoutubeConnection

Suggested fields:

id
userId
channelId
channelTitle
provider
status
createdAt
updatedAt
lastSyncedAt

Do not store raw OAuth secrets in the browser.

Do not expose:

client_secret.json
token.json

to frontend code.

5. Phase 1 — Project
Introduce a first-class SpikeClip Project.

Project hierarchy
User
 └── YouTube Connection
      └── SpikeClip Project
           ├── Sources
           ├── Scenes
           ├── Generated Clips
           ├── Editor Sessions
           └── Exports

Project model
Suggested:

Project
-------
id
userId
youtubeConnectionId
name
description
status
createdAt
updatedAt

Possible statuses:

ACTIVE
ARCHIVED
DELETED

Project UX
Dashboard:

My Projects

+ Create Project

[ SpikeClip Project 1 ]
[ SpikeClip Project 2 ]
[ SpikeClip Project 3 ]

Opening a project leads to:

Project
├── Extract
├── Generate
├── Editor
├── Export
└── Downloads

6. Phase 2 — Extract
Objective
Extract usable YouTube source information into the SpikeClip project.

The Extract phase replaces the current:

URL Input
→ POST /api/jobs
→ yt-dlp metadata

flow.

New flow:

YouTube Account
      ↓
MCP
      ↓
List videos
      ↓
User selects video(s)
      ↓
SpikeClip creates Source
      ↓
Metadata synchronization
      ↓
Optional media acquisition

7. Extract — Source Discovery
Use the YouTube Studio MCP to discover videos associated with the authenticated account.

Conceptually:

youtube_channel_overview
youtube_list_videos
youtube_get_video

The exact MCP invocation must be isolated behind a SpikeClip adapter.

Do NOT let application code directly depend on MCP protocol details.

Create:

YoutubeStudioMcpService

or:

YoutubeStudioProvider

Interface:

interface YoutubeStudioProvider {
  getChannel(): Promise<YoutubeChannel>;
  listVideos(options?: ListVideosOptions): Promise<YoutubeVideo[]>;
  getVideo(videoId: string): Promise<YoutubeVideo>;
}

This creates a clean boundary between SpikeClip and MCP.

8. Source Entity
Introduce:

ProjectSource

Suggested schema:

ProjectSource
-------------
id
projectId
youtubeVideoId
youtubeUrl
title
description
thumbnailUrl
duration
publishedAt
viewCount
likeCount
commentCount
privacyStatus
metadataJson
analyticsJson
sourceStatus
mediaStatus
storageKey
createdAt
updatedAt

Statuses:

DISCOVERED
SELECTED
ACQUIRING
READY
FAILED

Media status:

NOT_DOWNLOADED
DOWNLOADING
AVAILABLE
FAILED

Important:

Do not automatically download every video returned by YouTube.

Metadata should be cheap.

Media acquisition should happen only when required.

9. Extract — Source Selection UI
The Extract page should display:

My YouTube Videos

┌─────────────────────────────────────────┐
│ Thumbnail                               │
│ Video title                             │
│ Duration                                │
│ Views                                   │
│ Published                               │
│ Status                                  │
│ [Select]                                │
└─────────────────────────────────────────┘

Filters:

Search
Date
Views
Duration
Privacy
Published

Optional:

Sort by:
- newest
- oldest
- most views
- highest engagement

Users select one or multiple videos.

10. Extract — Media Acquisition
Metadata acquisition and video downloading are separate operations.

When a source needs actual media:

ProjectSource
    ↓
Source Acquisition Job
    ↓
yt-dlp
    ↓
Storage
    ↓
ProjectSource.mediaStatus = AVAILABLE

Use the existing yt-dlp infrastructure where possible.

The MCP does not need to download the media.

The existing:

YtdlpService

can remain, but should become a media acquisition service rather than the primary YouTube integration.

Recommended:

YoutubeStudioMcpService
        ↓
metadata/account operations

YoutubeMediaService
        ↓
yt-dlp/media operations

11. Extract — Source Validation
The old validation:

age >= 3 days
views >= 1000
heatmap non-empty

must no longer be hardcoded into ingestion.

Instead:

Source validation policy

should be configurable.

Example:

interface SourceSelectionPolicy {
  minimumAgeDays?: number;
  minimumViews?: number;
  allowedPrivacyStatuses?: string[];
  minimumDurationSeconds?: number;
}

Default policy should be permissive.

Why:

A creator may want to clip:

new videos
private/unlisted videos
low-view videos
long-form videos
short videos
Do not silently reject them.

12. Phase 3 — Generate
Objective
Turn selected source videos into candidate scenes/clips.

This replaces the old:

POST /jobs/:id/process
ProcessHeatmapUseCase

with:

POST /projects/:projectId/generate

or an equivalent project-scoped generation job.

13. Generate Architecture
Project
  ↓
Selected Sources
  ↓
Media Acquisition
  ↓
Signal Extraction
  ↓
Heatmap / Scene Analysis
  ↓
Candidate Scene Generation
  ↓
Scene Ranking
  ↓
Generated Clips

Generation should be asynchronous.

Do NOT run the entire pipeline synchronously inside an HTTP request.

14. Generate — Analysis Pipeline
Retain the existing algorithms initially.

Current:

mergeHeatmapSpikes
        ↓
capAndScoreBlocks
        ↓
selectTopScenes
        ↓
padScenes

Move them into:

SceneGenerationService

Suggested:

extractSignals()
mergeHeatmapSpikes()
buildCandidateBlocks()
scoreCandidateBlocks()
selectTopScenes()
padScenes()
persistScenes()

15. Heatmap Algorithm
Preserve current behavior initially.

Merge spikes
gap <= 5 seconds
delta <= 0.25

Merge consecutive compatible spikes.

Block scoring
Current scoring:

score =
  peak * 0.4
  + average * 0.4
  + durationFit * 0.2

Keep this algorithm unchanged during migration unless tests demonstrate a regression.

Scene selection
Current:

greedy top-N
N = 3
minimum spacing = 5 seconds

Keep as the initial default.

Padding
Current:

+5 seconds padding

Then merge overlapping scenes.

16. Scene Entity
Introduce/retain:

ProjectScene

Suggested:

ProjectScene
------------
id
projectId
sourceId
startTime
endTime
duration
score
rank
analysisJson
status
createdAt
updatedAt

Status:

CANDIDATE
SELECTED
EDITING
EXPORTED
REJECTED

Do not store only the final clip.

The scene is the reusable source-level representation.

17. Generate — AI Enhancement
Generation may optionally use AI beyond heatmap analysis.

Possible future signals:

heatmap
transcript
audio energy
speech density
scene changes
engagement
video analytics
title
description
comments

MCP analytics can become an input to ranking.

For example:

YouTube performance
      +
Heatmap
      +
Transcript
      +
Audio
      ↓
Scene score

Do not make analytics mandatory for the first migration.

18. Generated Clip Entity
Separate a generated clip from a source scene.

GeneratedClip
-------------
id
projectId
sceneId
sourceId
status
platform
aspectRatio
duration
editorConfigId
outputStorageKey
fileUrl
size
createdAt
updatedAt

This allows one scene to generate multiple platform variants:

Scene #12
   ├── YouTube Short
   ├── Instagram Reel
   └── TikTok

19. Phase 4 — Editor
The Editor operates on a generated scene/clip.

Existing OpenReel editor can remain.

Flow:

Project
 ↓
Scene
 ↓
Generated Clip
 ↓
OpenReel Editor

The editor must never modify the original source.

Use:

source
scene
editorConfig

as immutable/reconstructable inputs.

20. Editor Configuration
Create:

EditorConfig

Suggested:

id
clipId
platform
width
height
fps
captionConfig
templateConfig
musicConfig
cropConfig
studioActions
filterGraph
createdAt
updatedAt

Example:

{
  "platform": "youtube_shorts",
  "width": 1080,
  "height": 1920,
  "captionConfig": {},
  "templateConfig": {},
  "musicConfig": {},
  "cropConfig": {},
  "studioActions": []
}

21. AI Editor Commands
Retain the existing architecture:

Natural language
      ↓
LLM
      ↓
StudioAction[]
      ↓
FilterGraphBuilder
      ↓
FFmpeg filter_complex

Example:

"Make the captions large and yellow,
zoom slightly on the speaker,
and add a dark vignette."

becomes:

StudioAction[]

then:

FilterGraphBuilder

then FFmpeg.

Important:

LLM must never directly produce arbitrary shell commands.

The LLM produces validated structured actions.

22. StudioAction
Maintain a strict schema.

Example conceptual structure:

type StudioAction =
  | {
      type: "CAPTION_STYLE";
      config: CaptionStyleConfig;
    }
  | {
      type: "ZOOM";
      config: ZoomConfig;
    }
  | {
      type: "CROP";
      config: CropConfig;
    }
  | {
      type: "VIGNETTE";
      config: VignetteConfig;
    }
  | {
      type: "LAYOUT";
      config: LayoutConfig;
    }
  | {
      type: "MUSIC";
      config: MusicConfig;
    };

Validate all actions before passing them to FFmpeg.

23. Editor Preview
The editor should preferably preview the transformation without rendering the final export every time.

Architecture:

Source media
    ↓
Scene trim
    ↓
Preview transformation
    ↓
OpenReel

Final FFmpeg rendering only occurs during Export.

24. Phase 5 — Export
Export becomes a project/clip rendering operation.

Flow:

Project
  ↓
Selected Clips
  ↓
Editor Config
  ↓
Export Job
  ↓
Source Job
  ↓
Clip Jobs
  ↓
FFmpeg
  ↓
Storage
  ↓
Completed Export

Continue using BullMQ.

25. Export Queue Architecture
Use separate queues:

source
export

Potential future:

source
analysis
generation
export
thumbnail
transcription
cleanup

Initial implementation can use:

source → export

with dependencies.

26. Source Worker
The Source Worker should:

Receive source ID.
Check whether source media already exists.
If available, reuse it.
Otherwise invoke YoutubeMediaService.
Download the required media.
Validate the media.
Store it in MinIO/local storage.
Update ProjectSource.mediaStatus.
Return storage reference.
Do not download the same source separately for every clip.

27. Clip Worker
Retain the existing 10-step pipeline.

27a — Source Acquisition
Get source media from the shared source object.

Prefer:

shared source

over:

new yt-dlp download

for every clip.

27b — Scene Trim
Trim only the selected scene:

startTime
endTime

Do not render the entire original video.

27c — Vertical Crop
Default:

crop=ih*9/16:ih
scale=1080:1920

Make platform dimensions configurable.

27d — Caption Overlay
Support:

drawtext

and/or:

SRT subtitles

depending on editor configuration.

27e — Template Effects
Existing effects:

vignette
split layouts
grid overlays

remain supported.

27f — Studio Actions
Execute the validated:

StudioAction[]

through:

FilterGraphBuilder

Do not duplicate filter construction logic inside the worker.

27g — Music Mix
If configured:

download music
+
original audio
→
amix

Music files should come from storage.

27h — Finalize
Generate deterministic output names.

Example:

{projectId}/{clipId}/final.mp4

Avoid random local-only filenames as the permanent identifier.

27i — Upload
Upload to:

MinIO

or configured object storage.

Do not rely on local filesystem as permanent production storage.

27j — Database Update
Set:

GeneratedClip.status = COMPLETED
GeneratedClip.outputStorageKey = ...
GeneratedClip.size = ...
GeneratedClip.duration = ...

27k — Cleanup
Delete temporary rendering files.

Only delete shared source media when:

no pending jobs
AND
no project/clip requires the source

Do not delete based solely on "last worker finished."

28. Phase 6 — Download
The final user flow:

Export complete
      ↓
Generated Clip
      ↓
Download

Existing download architecture can be retained.

GET /clips/:id/download

Flow:

Authentication
      ↓
Authorization
      ↓
Plan check
      ↓
Generate signed URL
      ↓
Storage
      ↓
Stream/download

Continue using HMAC-signed URLs or an equivalent secure signed-storage URL.

29. API Changes
YouTube
Add:

GET /youtube/status
GET /youtube/channel
GET /youtube/videos
GET /youtube/videos/:videoId
POST /youtube/sync

The actual implementation must call the MCP adapter rather than expose MCP protocol details to the frontend.

Projects
Add:

POST   /projects
GET    /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id

Sources
Add:

GET  /projects/:projectId/sources
POST /projects/:projectId/sources/import
POST /projects/:projectId/sources/:sourceId/acquire
GET  /projects/:projectId/sources/:sourceId

Generate
Add:

POST /projects/:projectId/generate
GET  /projects/:projectId/generation-status

Generation must enqueue background work.

Scenes
Add:

GET   /projects/:projectId/scenes
GET   /scenes/:sceneId
PATCH /scenes/:sceneId
POST  /scenes/:sceneId/select

Clips
Add:

POST /projects/:projectId/clips
GET  /projects/:projectId/clips
GET  /clips/:clipId
PATCH /clips/:clipId

Editor
Add:

GET   /clips/:clipId/editor
PUT   /clips/:clipId/editor
POST  /clips/:clipId/editor/actions

Export
Use:

POST /projects/:projectId/export

Request:

{
  "clips": [
    {
      "clipId": "clip_123",
      "editorConfig": {}
    }
  ]
}

Response:

{
  "exportJobId": "export_123",
  "status": "QUEUED"
}

Download
Retain:

GET /clips/:id/download

and secure signed download URLs.

30. Database Migration
The current Job model should no longer be the central domain object.

Current:

Job
 ├── URL
 ├── metadata
 ├── heatmap
 ├── scenes
 └── completed clip

New:

YoutubeConnection
       ↓
Project
       ↓
ProjectSource
       ↓
ProjectScene
       ↓
GeneratedClip
       ↓
EditorConfig
       ↓
Export

Recommended new entities:

YoutubeConnection
Project
ProjectSource
ProjectScene
GeneratedClip
EditorConfig
ExportJob

Existing Job can be retained temporarily for backward compatibility.

31. Legacy Compatibility
Do NOT delete the existing pipeline immediately.

Create:

legacy/

or retain compatibility services.

Existing flow:

URL
 ↓
Job
 ↓
Heatmap
 ↓
Scene
 ↓
Export

should continue working until the new project pipeline is validated.

The migration strategy should be:

Phase A
New architecture behind feature flag

Phase B
New UI uses project architecture

Phase C
Legacy URL flow remains available

Phase D
Migrate existing jobs

Phase E
Remove old Job-centric pipeline

32. Recommended Service Architecture
Create these clear boundaries:

YoutubeStudioMcpService

Responsibilities:

channel
videos
metadata
analytics
comments
thumbnails

YoutubeMediaService

Responsibilities:

yt-dlp
media acquisition
media validation
storage

ProjectService

Responsibilities:

projects
sources
project lifecycle

SceneGenerationService

Responsibilities:

heatmap
analysis
scene detection
scene ranking

ClipGenerationService

Responsibilities:

scene → generated clip

EditorService

Responsibilities:

editor config
StudioAction[]
validation

FilterGraphBuilder

Responsibilities:

StudioAction[]
→
FFmpeg filter graph

ExportService

Responsibilities:

export orchestration
queueing
job dependencies

StorageService

Responsibilities:

put
get
delete
signed URL
exists

33. MCP Adapter Rule
Never scatter MCP calls throughout the application.

Bad:

controller → MCP
usecase → MCP
worker → MCP
service → MCP

Good:

Controllers
    ↓
Use Cases
    ↓
YoutubeStudioProvider
    ↓
YoutubeStudioMcpService
    ↓
MCP

This is critical because it allows the MCP implementation to change without rewriting the application.

34. MCP Availability / Failure Handling
MCP is an external integration boundary.

Every MCP operation must handle:

MCP unavailable
authentication expired
channel unavailable
YouTube API quota exceeded
video deleted
video private
permission denied
invalid response
timeout

Do not mark the entire Project as failed because one YouTube API call failed.

Example:

Project = ACTIVE

Source A = READY
Source B = FAILED
Source C = READY

35. Sync Strategy
Do not constantly query YouTube.

Use explicit synchronization:

Sync YouTube

or:

automatic sync every N minutes

Store:

lastSyncedAt

Use youtube_list_videos for discovery and youtube_get_video when detailed information is needed.

36. Analytics Integration
Analytics should become optional metadata attached to sources.

Example:

ProjectSource
   ├── metadataJson
   └── analyticsJson

Possible analytics:

views
watch time
engagement
likes
comments

Use analytics later to improve:

scene ranking
generation recommendations
project insights

Do not block generation if analytics are unavailable.

37. Caching
Cache:

channel metadata
video metadata
thumbnail URLs
analytics

Do not unnecessarily cache:

OAuth secrets
signed URLs
temporary FFmpeg files

Media should be object-storage-backed.

38. Storage Layout
Recommended:

projects/
  {projectId}/

    sources/
      {sourceId}/
        source.mp4

    scenes/
      {sceneId}/

    clips/
      {clipId}/
        final.mp4

    exports/
      {exportId}/

Keep logical IDs independent from local temporary paths.

39. Job Idempotency
Every worker must be idempotent.

For example:

Source worker receives source_123

and media already exists:

→ do not download again
→ return existing storage key

Similarly:

Clip worker receives clip_123

and completed output exists:

→ do not render again

unless explicitly forced.

40. Job State Machines
Source
DISCOVERED
   ↓
ACQUIRING
   ↓
READY

Failure:

ACQUIRING
   ↓
FAILED

Scene
CANDIDATE
   ↓
SELECTED
   ↓
EDITING
   ↓
EXPORTED

Clip
DRAFT
 ↓
QUEUED
 ↓
PROCESSING
 ↓
UPLOADING
 ↓
COMPLETED

Failure:

PROCESSING
 ↓
FAILED

Export
QUEUED
 ↓
PROCESSING
 ↓
COMPLETED

or:

QUEUED
 ↓
FAILED

41. Frontend Information Architecture
Replace the old dashboard flow with:

Dashboard
│
├── YouTube
│   ├── Connection
│   ├── Channel
│   └── Sync
│
└── My Projects
    └── SpikeClip Project
        │
        ├── Extract
        ├── Generate
        ├── Editor
        ├── Export
        └── Download

42. Extract Screen
Primary actions:

[ Sync YouTube ]

Search videos

[ Select ]

[ Add to Project ]

No download should happen merely because the user browses videos.

43. Generate Screen
Show:

Selected Sources

Video A
Video B
Video C

Generation settings

Number of scenes:
[ 3 ]

Minimum spacing:
[ 5 sec ]

Padding:
[ 5 sec ]

[ Generate Clips ]

Then:

Generating...

Analyzing Video A
Analyzing Video B
Generating scenes
Ranking candidates

44. Generate Results
Display candidate scenes:

Scene 1
00:32 → 00:54
Score: 0.91

[Preview] [Edit] [Reject]

Scene 2
02:14 → 02:38
Score: 0.87

[Preview] [Edit] [Reject]

Allow:

select
reject
adjust start
adjust end

before entering Editor.

45. Editor Screen
Editor receives:

source
scene
clip
editorConfig

Controls:

Platform
Crop
Captions
Templates
Music
Effects
AI commands

AI command example:

"Make this more energetic"

LLM:

→ StudioAction[]

Validator:

→ validated actions

Builder:

→ FFmpeg graph

46. Export Screen
Show:

Ready to export

✓ Source
✓ Scene
✓ Captions
✓ Template
✓ Music

Platform:
YouTube Shorts

Resolution:
1080x1920

[ Export ]

After clicking:

Queued
 ↓
Rendering
 ↓
Uploading
 ↓
Completed

47. Download Screen
Show completed exports:

Video
Duration
Resolution
Platform
File size

[ Download ]

Use signed URLs.

Never expose raw storage credentials.

48. Security Requirements
OAuth
OAuth tokens must remain server-side/local MCP-side.

Never:

send token to browser
store token in localStorage
log token
return token through API

MCP
Treat MCP as privileged.

Only allow trusted backend/service processes to communicate with it.

FFmpeg
Never pass arbitrary user-generated strings directly into shell commands.

Use:

structured configuration
+
argument arrays
+
validated filters

LLM
Never allow:

LLM → raw shell command

Only:

LLM
 ↓
StudioAction[]
 ↓
schema validation
 ↓
FilterGraphBuilder
 ↓
FFmpeg

49. Quotas
Move quota accounting to the project/generation/export level.

Potential quota units:

source acquisition minutes
generated scenes
rendered clips
export minutes
AI generations
storage

Do not count a simple YouTube metadata lookup as a video render.

50. Observability
Every major operation should have:

requestId
userId
projectId
sourceId
sceneId
clipId
exportId

Logs should identify:

MCP call
yt-dlp call
FFmpeg job
BullMQ job
storage operation

but never log:

OAuth tokens
client secrets
signed URLs

51. Error Model
Standardize errors.

Example:

type PipelineError =
  | "YOUTUBE_AUTH_REQUIRED"
  | "YOUTUBE_AUTH_EXPIRED"
  | "YOUTUBE_CHANNEL_UNAVAILABLE"
  | "YOUTUBE_VIDEO_UNAVAILABLE"
  | "MCP_UNAVAILABLE"
  | "SOURCE_ACQUISITION_FAILED"
  | "SOURCE_MEDIA_INVALID"
  | "GENERATION_FAILED"
  | "EDITOR_CONFIG_INVALID"
  | "EXPORT_FAILED"
  | "STORAGE_FAILED";

Frontend should receive actionable messages.

52. Migration Mapping
Current component → new component:

Current	New
URL Input	YouTube Account / Video Browser
useAnalyzeVideo	Project/source hooks
JobsController	Project + Source controllers
YoutubeUrl VO	YoutubeVideoId / YoutubeSource
YtdlpService.extractMetadata	YoutubeStudioMcpService
yt-dlp metadata	MCP metadata
Job	Project / Source / Scene / Clip
ProcessHeatmapUseCase	SceneGenerationService
mergeHeatmapSpikes	Keep
capAndScoreBlocks	Keep
selectTopScenes	Keep
padScenes	Keep
Scene	ProjectScene
Studio	Editor
StudioAction[]	Keep
FilterGraphBuilder	Keep
ExportClipsUseCase	ExportService
Source Worker	Keep, modify input
Clip Worker	Keep, modify input
MinIO	Keep
HMAC download	Keep
Job status	Project/source/scene/clip/export state machines

53. What Must NOT Be Rewritten
Preserve working infrastructure wherever possible.

Do not rewrite these unless necessary:

FFmpeg rendering
BullMQ
MinIO/storage abstraction
FilterGraphBuilder
StudioAction schema
OpenReel editor
heatmap algorithms
caption rendering
music mixing
signed download URLs

The migration is primarily:

YouTube ingestion architecture
+
domain model
+
project workflow

not a complete rewrite of the rendering engine.

54. Recommended Implementation Order
Step 1 — MCP Integration
Implement:

YoutubeStudioProvider
YoutubeStudioMcpService

Verify:

channel
videos
video metadata
analytics

Step 2 — YouTube Connection
Implement:

YoutubeConnection

and connection/status UI.

Step 3 — Project Model
Implement:

Project
ProjectSource

Step 4 — Extract UI
Build:

YouTube video browser
→ select video
→ add to Project

Step 5 — Media Acquisition
Refactor yt-dlp:

YtdlpService
→ YoutubeMediaService

Make acquisition project/source based.

Step 6 — Scene Generation
Move:

mergeHeatmapSpikes
capAndScoreBlocks
selectTopScenes
padScenes

into:

SceneGenerationService

Step 7 — Scene UI
Build:

candidate scenes
preview
selection
trim adjustment

Step 8 — Generated Clips
Create:

GeneratedClip

and platform configuration.

Step 9 — Editor
Connect:

Scene
→ OpenReel
→ EditorConfig

Step 10 — AI Editing
Connect:

LLM
→ StudioAction[]
→ validation
→ FilterGraphBuilder

Step 11 — Export
Move current export worker architecture to:

ProjectSource
+
ProjectScene
+
GeneratedClip
+
EditorConfig

Step 12 — Download
Keep existing secure download mechanism.

Step 13 — Legacy Migration
Once the new pipeline is stable:

feature flag OFF for legacy

then remove legacy code.

55. Feature Flags
Introduce:

SPIKECLIP_PROJECT_PIPELINE
YOUTUBE_MCP_INTEGRATION
NEW_EXTRACT_UI
NEW_GENERATE_UI
NEW_EDITOR_PIPELINE
NEW_EXPORT_PIPELINE

This allows individual stages to be enabled independently.

56. Acceptance Criteria
The implementation is complete when a user can:

Connect a YouTube account.
See their authenticated YouTube channel.
Browse their videos.
Select a video without pasting a URL.
Add the video to a SpikeClip Project.
Acquire the source media only when necessary.
Generate candidate scenes.
See scene scores and timestamps.
Select a scene.
Open it in the editor.
Change platform/output settings.
Apply captions.
Apply templates.
Apply music.
Give natural-language editing instructions.
Convert those instructions to validated StudioAction[].
Preview the edit.
Export asynchronously.
Monitor export status.
Download the completed MP4.
Generate multiple clips from one source without downloading the source repeatedly.
Recover cleanly from MCP, YouTube, yt-dlp, FFmpeg, queue, and storage failures.
57. Final Target
The final system should conceptually look like:

                     ┌───────────────────┐
                     │   Google Account  │
                     │   YouTube Studio  │
                     └─────────┬─────────┘
                               │
                               ▼
                     ┌───────────────────┐
                     │ YouTube Studio    │
                     │ MCP               │
                     └─────────┬─────────┘
                               │
                               ▼
                     ┌───────────────────┐
                     │  SpikeClip        │
                     │  Project          │
                     └─────────┬─────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
        ┌───────────────┐             ┌───────────────┐
        │    EXTRACT    │             │    SOURCES    │
        │               │────────────▶│               │
        │ YouTube videos│             │ Media/Metadata│
        └───────┬───────┘             └───────┬───────┘
                │                             │
                └──────────────┬──────────────┘
                               ▼
                     ┌───────────────────┐
                     │     GENERATE      │
                     │                   │
                     │ Heatmap           │
                     │ Analysis          │
                     │ Scene Detection   │
                     │ Ranking           │
                     └─────────┬─────────┘
                               │
                               ▼
                     ┌───────────────────┐
                     │      EDITOR       │
                     │                   │
                     │ OpenReel          │
                     │ Captions          │
                     │ Templates         │
                     │ Music             │
                     │ AI Actions        │
                     └─────────┬─────────┘
                               │
                               ▼
                     ┌───────────────────┐
                     │      EXPORT       │
                     │                   │
                     │ BullMQ            │
                     │ FFmpeg            │
                     │ MinIO             │
                     └─────────┬─────────┘
                               │
                               ▼
                     ┌───────────────────┐
                     │     DOWNLOAD      │
                     │                   │
                     │ Signed URL        │
                     │ MP4               │
                     └───────────────────┘

58. Architectural Principle
The most important implementation rule is:

YouTube Studio MCP
        =
YouTube control plane

SpikeClip
        =
Video intelligence + media processing + editing + rendering

Do not make MCP responsible for:

FFmpeg
video rendering
scene generation
caption rendering
storage
export queues
editor state

And do not make SpikeClip responsible for recreating YouTube Studio account functionality that the MCP already exposes.

The resulting separation should be:

                YOUTUBE
                   │
                   ▼
             ┌───────────┐
             │    MCP    │
             └─────┬─────┘
                   │
             account/video
              intelligence
                   │
                   ▼
             ┌───────────┐
             │ SpikeClip │
             └─────┬─────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
     Extract    Generate    Editor
                             │
                             ▼
                           Export
                             │
                             ▼
                          Download

This should be the target architecture for the implementation.

One important implementation detail: the referenced MCP currently advertises metadata/analytics/channel-management capabilities, not video-media downloading or FFmpeg processing, so the cleanest architecture is to use MCP as the YouTube control/information plane and keep yt-dlp as SpikeClip's media acquisition layer.

---

## Implementation Details (Verified)

### 59. MCP Server — Verified Tool Schemas

Source: `github.com/i1s-abhishek/youtube-studio-mcp` (Python, stdio, JSON-RPC 2.0, protocol `2024-11-05`).

| Tool | Required Params | Optional Params |
|------|-----------------|-----------------|
| `youtube_auth_status` | — | — |
| `youtube_start_auth` | — | — |
| `youtube_channel_overview` | — | — |
| `youtube_list_videos` | — | `max_results` (int, 1–25), `page_token` (string) |
| `youtube_get_video` | `video_id` (string) | — |
| `youtube_update_video` | `video_id` (string) | `title`, `description`, `tags` (string[]), `category_id`, `default_language`, `privacy_status` |
| `youtube_upload_thumbnail` | `video_id` (string), `image_path` (string) | — |
| `youtube_channel_analytics` | `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD) | — |
| `youtube_video_analytics` | `video_id` (string), `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD) | — |
| `youtube_post_comment` | `video_id` (string), `text` (string) | — |
| `youtube_list_comments` | `video_id` (string) | `max_results` (int, 1–100, default 20) |

MCP OAuth scopes: `youtube`, `youtube.force-ssl`, `youtube.readonly`, `yt-analytics.readonly`.

MCP uses Desktop OAuth flow (PKCE S256), local callback on `127.0.0.1:8765`, tokens stored in `secrets/token.json`.

**MCP is completely separate from SpikeClip user auth.** MCP manages its own `client_secret.json` + `token.json`. The app's Google auth (passport-google-oauth20) handles user login only.

### 60. OpenReel Integration — Verified

`@openreel/core` resolves from `file:../../vendor/openreel-video/packages/core` (browser-only library).

**PostMessage protocol (host ↔ iframe):**

| Direction | Message | Purpose |
|-----------|---------|---------|
| Host → Editor | `openreel:loadMedia` | Load source video with trim range |
| Host → Editor | `openreel:updateRange` | Change scene start/end |
| Host → Editor | `openreel:loadProject` | Restore saved project state |
| Host → Editor | `openreel:export` | Trigger export |
| Editor → Host | `openreel:ready` | Editor initialized |
| Editor → Host | `openreel:exported` | Export complete (with Blob) |
| Editor → Host | `openreel:projectChanged` | Project state changed (auto-save) |
| Editor → Host | `openreel:error` | Error occurred |

**Export presets for social media:**
- `tiktok-1080p`: 1080×1920, H.264, 15Mbps
- `youtube-1080p`: 1920×1080, H.264
- ExportEngine uses WebCodecs/WebGPU (browser-only)

### 61. Database Schema — Prisma

```prisma
model YoutubeConnection {
  id               String    @id @default(uuid())
  userId           String
  channelId        String
  channelTitle     String?
  channelThumbnail String?
  provider         String    @default("youtube-studio-mcp")
  status           String    @default("active")
  lastSyncedAt     DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  projects         Project[]
  @@unique([userId, channelId])
  @@index([userId])
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
  analyticsJson   Json?
  sourceStatus    String   @default("discovered")
  mediaStatus     String   @default("not_downloaded")
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
  score        Float?
  rank         Int?
  analysisJson Json?
  status       String   @default("candidate")
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
  @@index([projectId])
  @@index([sceneId])
  @@index([status])
}
```

### 62. API Endpoints — Complete Reference

**YouTube:**
```
GET  /api/youtube/status          — Connection status
GET  /api/youtube/channel         — Channel overview (via MCP)
GET  /api/youtube/videos          — List videos (paginated, via MCP)
GET  /api/youtube/videos/:id      — Single video details (via MCP)
POST /api/youtube/sync            — Sync channel data
```

**Projects:**
```
POST   /api/projects              — Create project
GET    /api/projects              — List user's projects
GET    /api/projects/:id          — Project detail
PATCH  /api/projects/:id          — Update project
DELETE /api/projects/:id          — Delete project
```

**Sources:**
```
GET  /api/projects/:pid/sources              — List sources
POST /api/projects/:pid/sources/import       — Add videos as sources
POST /api/projects/:pid/sources/:sid/acquire — Trigger media download
GET  /api/projects/:pid/sources/:sid         — Source detail
```

**Generate:**
```
POST /api/projects/:pid/generate             — Start scene generation
GET  /api/projects/:pid/generation-status    — Check generation progress
```

**Scenes:**
```
GET   /api/projects/:pid/scenes             — List scenes
GET   /api/scenes/:sid                      — Scene detail
PATCH /api/scenes/:sid                      — Update scene (adjust times)
POST  /api/scenes/:sid/select               — Select scene
```

**Clips (Generated):**
```
POST /api/projects/:pid/clips               — Create clip from scene
GET  /api/projects/:pid/clips               — List clips
GET  /api/clips/:cid                        — Clip detail
PATCH /api/clips/:cid                       — Update clip
```

**Editor:**
```
GET   /api/clips/:cid/editor                — Get editor config
PUT   /api/clips/:cid/editor                — Save editor config
POST  /api/clips/:cid/editor/actions        — Translate AI prompt
```

**Export:**
```
POST /api/projects/:pid/export              — Start export
GET  /api/projects/:pid/export-status       — Check export progress
```

**Download (retained):**
```
GET /api/clips/:cid/download                — Signed URL redirect
GET /api/clips/download/:key                — Serve clip file
```

### 63. Service Architecture — Concrete Files

**MCP Integration (backend):**
```
apps/api/src/
├── domain/ports/youtube-studio.provider.ts        — Provider interface
├── infrastructure/youtube/
│   ├── types.ts                                   — YouTube domain types
│   ├── mcp-client.ts                              — JSON-RPC transport (child process)
│   ├── youtube-studio-mcp.service.ts              — Provider implementation
│   └── youtube.module.ts                          — NestJS module
```

**YouTube Connection:**
```
apps/api/src/
├── domain/entities/youtube-connection.entity.ts
├── domain/repositories/youtube-connection.repository.ts
├── infrastructure/database/repositories/prisma-youtube-connection.repository.ts
├── presentation/youtube/
│   ├── youtube.controller.ts
│   ├── youtube.service.ts
│   └── youtube.module.ts
```

**Project + Source + Scene + Clip:**
```
apps/api/src/
├── domain/entities/{project,project-source,project-scene,generated-clip}.entity.ts
├── domain/repositories/{project,project-source,project-scene,generated-clip}.repository.ts
├── infrastructure/database/repositories/prisma-{project,project-source,project-scene,generated-clip}.repository.ts
├── presentation/{projects,sources,scenes,clips}/
│   ├── {name}.controller.ts
│   ├── {name}.service.ts  (or use-case)
│   └── {name}.module.ts
```

**Scene Generation:**
```
apps/api/src/
├── application/services/scene-generation.service.ts
├── infrastructure/external/youtube-media.service.ts
```

**Frontend:**
```
apps/web/src/
├── presentation/components/youtube/
│   ├── YouTubeConnectButton.tsx
│   └── YouTubeStatus.tsx
├── presentation/components/extract/
│   ├── VideoBrowser.tsx
│   ├── VideoCard.tsx
│   └── SourceList.tsx
├── presentation/components/projects/
│   ├── ProjectCard.tsx
│   └── CreateProjectDialog.tsx
├── presentation/components/scenes/
│   ├── SceneResults.tsx
│   ├── ScenePreview.tsx
│   └── SceneAdjuster.tsx
├── application/hooks/
│   ├── use-youtube-connection.ts
│   ├── use-youtube-videos.ts
│   ├── use-project-sources.ts
│   └── use-project-scenes.ts
├── app/
│   ├── projects/[id]/page.tsx
│   ├── projects/[id]/extract/page.tsx
│   ├── projects/[id]/generate/page.tsx
│   ├── projects/[id]/editor/page.tsx
│   ├── projects/[id]/export/page.tsx
│   └── projects/[id]/downloads/page.tsx
```

### 64. Storage Layout

```
projects/
  {projectId}/
    sources/
      {sourceId}/
        source.mp4
    clips/
      {clipId}/
        final.mp4
    exports/
      {exportId}/
```

### 65. State Machines

**Source:**
```
discovered → acquiring → ready
                 ↓
              failed
```

**Scene:**
```
candidate → selected → editing → exported
    ↓
 rejected
```

**Clip:**
```
draft → queued → processing → uploading → completed
                  ↓
               failed
```

### 66. Feature Flags

```typescript
const FEATURE_FLAGS = {
  SPIKECLIP_PROJECT_PIPELINE: true,
  YOUTUBE_MCP_INTEGRATION: true,
  NEW_EXTRACT_UI: true,
  NEW_GENERATE_UI: true,
  NEW_EDITOR_PIPELINE: true,
  NEW_EXPORT_PIPELINE: true,
  LEGACY_URL_FLOW: true,
};
```

### 67. Implementation Order (13 Steps)

| Step | Scope | New Files | Modified Files |
|------|-------|-----------|----------------|
| 1 | MCP Integration | 5 | 0 |
| 2 | YouTube Connection | 6 | 1 |
| 3 | Project + Source models | 12 | 0 |
| 4 | Extract UI | 5 | 1 |
| 5 | Media Acquisition | 1 | 2 |
| 6 | Scene Generation | 1 | 2 |
| 7 | Scene UI | 3 | 0 |
| 8 | Editor connection | 1 | 1 |
| 9 | Export | 0 | 3 |
| 10 | Frontend IA | 6 | 2 |
| **Total** | | **~40** | **~12** |
