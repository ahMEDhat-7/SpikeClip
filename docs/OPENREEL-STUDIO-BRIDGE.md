# OpenReel Editor Integration (iframe bridge)

SpikeClip embeds the **local OpenReel editor** inside Studio so users can use OpenReel's
full editing feature set on a SpikeClip scene. The editor is built separately (it is a
standalone Vite/React app vendored at `vendor/openreel-video`) and served from
`/openreel-editor/`. SpikeClip loads it in an `<iframe>` and communicates with it via
`postMessage`.

> No LLM / server-side agent is used. All AI/auto-editing lives inside OpenReel's own
> editor. SpikeClip only supplies the source video and receives the exported clip + the
> OpenReel `Project` JSON (for reload).

## Flow

1. User picks a scene in Studio and clicks **Open in OpenReel Editor**.
2. SpikeClip navigates to `/studio/editor?jobId=&start=&end=`.
3. SpikeClip calls `POST /api/studio/:jobId/source` → downloads (and caches) the requested
   section of the source video, returns a signed URL.
4. The editor iframe loads (`?studio=1`). On `openreel:ready`, SpikeClip posts
   `openreel:loadMedia` with the signed URL + in/out, and (if present) the saved project
   via `openreel:loadProject`.
5. The user edits in OpenReel. On export, the editor posts `openreel:exported` (Blob).
   SpikeClip uploads it via `POST /api/studio/:jobId/clips` and registers a `Clip`.
6. While editing, the editor posts `openreel:projectChanged`; SpikeClip persists it via
   `PATCH /api/studio/:jobId/project` so the edit survives a reload.

## postMessage protocol

All messages are JSON with a `type` string. Both sides must validate
`event.origin === <editor origin>` (same-origin by default, so `window.location.origin`).

### SpikeClip → editor (`iframe.contentWindow.postMessage(msg, editorOrigin)`)

| type                    | payload                                  | meaning                                  |
| ----------------------- | ---------------------------------------- | ---------------------------------------- |
| `openreel:loadMedia`    | `{ url: string, start: number, end: number }` | Import the signed source and open it at the in/out range |
| `openreel:loadProject`  | `{ project: unknown }`                   | Restore a previously saved OpenReel `Project` |
| `openreel:export`       | —                                        | (optional) trigger an export             |
| `openreel:saveProject`  | —                                        | (optional) ask the editor to emit `projectChanged` |

### editor → SpikeClip (`window.parent.postMessage(msg, editorOrigin)`)

| type                     | payload                                  | meaning                                  |
| ------------------------ | ---------------------------------------- | ---------------------------------------- |
| `openreel:ready`         | —                                        | Editor mounted and listening             |
| `openreel:exported`      | `{ blob: Blob, meta?: { duration?, peakIntensity? } }` | A finished export to upload         |
| `openreel:projectChanged`| `{ project: unknown }`                   | Project mutated; persist it              |
| `openreel:error`         | `{ message: string }`                    | Surface an error in the Studio UI        |

## SpikeClip-side (implemented)

- `apps/web/src/app/studio/editor/page.tsx` — full-screen iframe host + bridge.
- `apps/web/src/app/studio/page.tsx` — **Open in OpenReel Editor** button on the scenes step.
- `POST /api/studio/:jobId/source` — download+cache source section, return signed URL.
- `GET /api/studio/:jobId/project` + `PATCH /api/studio/:jobId/project` — persist OpenReel `Project` (new `Job.project Json?` column + migration `20260812000000_add_job_project`).
- `POST /api/studio/:jobId/clips` (multipart `file`) — upload exported clip, register `Clip`.
- Env: `NEXT_PUBLIC_OPENREEL_EDITOR_URL` (default `/openreel-editor/`).

## OpenReel-side (apply to `vendor/openreel-video/apps/web`)

The vendored editor is a **git submodule** and must be built + served by you (it is not
pushed by SpikeClip). Apply the two changes below, then build and serve the result at
`/openreel-editor/`.

### 1. `src/App.tsx` — add a `?studio=1` branch

Before the existing route handling (around the `useEffect` that calls `navigate`), add:

```ts
const isStudioHost =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("studio") === "1";

// inside the useEffect route handler, first branch:
if (isStudioHost) {
  hasHandledInitialRoute.current = true;
  // StudioBootstrap renders the editor with a pre-loaded project.
}
```

And render `<StudioBootstrap />` instead of `<EditorInterface />` when `isStudioHost`:

```tsx
{isStudioHost ? (
  <Suspense fallback={<LoadingSpinner message="Loading editor..." />}>
    <StudioBootstrap />
  </Suspense>
) : showWelcome ? (
  <WelcomeScreen initialTab={initialTab} />
) : (
  <Suspense fallback={<LoadingSpinner message="Loading editor..." />}>
    <EditorInterface />
  </Suspense>
)}
```

### 2. `src/StudioBootstrap.tsx` (new file)

This component imports the signed source, builds an OpenReel `Project` (reuse the same
shape produced by `apps/web/src/lib/openreel/project.ts` `buildProjectFromJob`), seeds the
project store, jumps into the editor, and wires the postMessage bridge.

```tsx
"use client";
import { useEffect, useRef } from "react";
import { useProjectStore } from "./stores/project-store";
import { useUIStore } from "./stores/ui-store";
import { useRouter } from "./hooks/use-router";
import { getMediaImportService } from "@openreel/core";

const STUDIO_ACTIONS: Array<"loadMedia" | "loadProject" | "export" | "saveProject"> = [
  "loadMedia", "loadProject", "export", "saveProject",
];

export function StudioBootstrap() {
  const loadProject = useProjectStore((s) => s.loadProject);
  const getFullProject = useProjectStore((s) => s.getFullProject);
  const navigate = useRouter().navigate;
  const origin = typeof window !== "undefined" ? window.location.origin : "*";

  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const params = new URLSearchParams(window.location.search);
    const start = parseFloat(params.get("start") ?? "0");
    const end = parseFloat(params.get("end") ?? "0");

    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== origin) return;
      const data = event.data as { type: string; url?: string; project?: unknown };
      if (!data || !STUDIO_ACTIONS.includes(data.type as never)) return;

      if (data.type === "loadMedia" && data.url) {
        const svc = getMediaImportService();
        const item = await svc.importMedia(data.url);
        // Build a Project with one video track + clip [start, end] referencing `item.id`,
        // matching @openreel/core's Project shape (see apps/web/src/lib/openreel/project.ts).
        const project = buildProjectFromSource(item, start, end);
        loadProject(project);
        navigate("editor");
      } else if (data.type === "loadProject" && data.project) {
        loadProject(data.project as never);
        navigate("editor");
      }
    };
    window.addEventListener("message", onMessage);

    // Tell the host we are ready to receive media / project.
    window.parent.postMessage({ type: "openreel:ready" }, origin);

    // Expose export + autosave hooks (wire to your export runner / store subscription):
    const emitProjectChanged = () => {
      try {
        window.parent.postMessage(
          { type: "openreel:projectChanged", project: getFullProject() },
          origin
        );
      } catch {}
    };
    // Subscribe to project-store changes -> emitProjectChanged (debounced).

    // On export completion, post the Blob:
    // window.parent.postMessage({ type: "openreel:exported", blob, meta }, origin);

    return () => window.removeEventListener("message", onMessage);
  }, [loadProject, getFullProject, navigate, origin]);

  return null; // the editor renders once the project is loaded
}
```

> `buildProjectFromSource` should produce the same `Project` shape as
> `apps/web/src/lib/openreel/project.ts`. Adapt field names to the OpenReel `Project` type
> in `@openreel/core` (it is already a dependency of the web app).

## Build & serve the editor

```bash
cd vendor/openreel-video
pnpm install
pnpm --filter @openreel/web build      # outputs apps/web/dist
# Serve dist/ from your infra at /openreel-editor/
# (e.g. copy to apps/web/public/openreel-editor, or a static host / reverse proxy)
```

The editor must be **same-origin** with SpikeClip so the signed source URL can be fetched
and exports uploaded without CORS, and so `postMessage` origin checks pass.

## Limitations / status

- The OpenReel source edits above are applied in your local submodule build; they are not
  pushed by SpikeClip (the submodule has its own upstream).
- `POST /api/studio/:jobId/source` downloads via `yt-dlp` on demand; it is best-effort and
  may be slow/flaky (same caveat as live analysis). If it fails, the editor still loads and
  the user can import media manually.
- The exported clip upload has a 500MB limit (configurable in `studio.controller.ts`).
