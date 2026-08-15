import { useEffect, useRef } from "react";
import { useProjectStore } from "./stores/project-store";
import { useRouter } from "./hooks/use-router";

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "*";
const STUDIO_ACTIONS = new Set(["openreel:loadMedia", "openreel:loadProject"]);

async function urlToFile(url: string, filename: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch source (${res.status})`);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "video/mp4" });
}

/**
 * Studio host for the OpenReel editor when embedded in SpikeClip Studio.
 * Talks to the parent (SpikeClip) over postMessage:
 *   parent -> editor: openreel:loadMedia {url,start,end}, openreel:loadProject {project}
 *   editor -> parent: openreel:ready, openreel:exported {blob,meta}, openreel:projectChanged {project}, openreel:error {message}
 */
export function StudioBootstrap() {
  const booted = useRef(false);
  const { navigate } = useRouter();

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const params = new URLSearchParams(window.location.search);
    const start = parseFloat(params.get("start") ?? "0") || 0;
    const end = parseFloat(params.get("end") ?? "0") || 0;
    const store = useProjectStore;

    const emitExported = (blob: Blob, name?: string) => {
      try {
        window.parent.postMessage(
          { type: "openreel:exported", blob, meta: { name, duration: end - start || undefined } },
          ORIGIN
        );
      } catch {}
    };

    // Fallback capture: hook standard blob: anchor downloads (used by the
    // export fallback path when showSaveFilePicker is unavailable).
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      const href = this.href || "";
      if (this.download && href.startsWith("blob:")) {
        fetch(href)
          .then((r) => r.blob())
          .then((blob) => emitExported(blob, this.download))
          .catch(() => {});
      }
      // @ts-expect-error - apply with original args
      return originalClick.apply(this, arguments);
    };

    // Primary capture: the editor exports by streaming chunks to a writable
    // returned from showSaveFilePicker. We return an in-memory writable that
    // buffers the chunks and posts the assembled Blob to the parent on close
    // (no native save dialog, nothing written to disk).
    // @ts-expect-error - overriding native API
    const originalShowSave = window.showSaveFilePicker;
    if (typeof originalShowSave === "function") {
      const stub = async (opts: { suggestedName?: string; types?: unknown[] }) => {
        const chunks: BlobPart[] = [];
        const sink = {
          write(data: unknown) {
            if (data instanceof Uint8Array) chunks.push(data as BlobPart);
            else if (data instanceof ArrayBuffer) chunks.push(data);
            else if (ArrayBuffer.isView(data))
              chunks.push(new Uint8Array((data as ArrayBufferView).buffer as ArrayBuffer) as BlobPart);
            return Promise.resolve();
          },
          seek() {
            return Promise.resolve();
          },
          truncate() {
            return Promise.resolve();
          },
          async close() {
            emitExported(new Blob(chunks), opts.suggestedName);
          },
          abort() {
            return Promise.resolve();
          },
        };
        return sink as unknown as FileSystemWritableFileStream;
      };
      // @ts-expect-error - intentional override
      window.showSaveFilePicker = stub;
    }

    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== ORIGIN && event.origin !== window.location.origin) return;
      const data = event.data as {
        type: string;
        url?: string;
        project?: unknown;
        start?: number;
        end?: number;
      };
      if (!data || !STUDIO_ACTIONS.has(data.type)) return;

      if (data.type === "openreel:loadMedia" && data.url) {
        try {
          const loadStart = typeof data.start === "number" ? data.start : start;
          const loadEnd = typeof data.end === "number" ? data.end : end;
          const file = await urlToFile(data.url, "source.mp4");
          store.getState().createNewProject("SpikeClip Scene", {
            width: 1080,
            height: 1920,
            frameRate: 30,
          });
          const result = await store.getState().importMedia(file);
          if (!result.success) {
            throw new Error((result as { error?: { message?: string } }).error?.message || "import failed");
          }
          const items = store.getState().project.mediaLibrary.items;
          const mediaId = items[items.length - 1]?.id;
          if (mediaId) {
            await store.getState().addClipToNewTrack(mediaId);
            if (loadEnd > loadStart) {
              const proj = store.getState().project;
              const videoTrack = proj.timeline.tracks.find(
                (t) => t.type === "video" && t.clips.length > 0
              );
              if (videoTrack) {
                const clip = videoTrack.clips[videoTrack.clips.length - 1];
                const updatedClip = {
                  ...clip,
                  inPoint: loadStart,
                  outPoint: loadEnd,
                  duration: loadEnd - loadStart,
                };
                const tracks = proj.timeline.tracks.map((t) =>
                  t.id === videoTrack.id
                    ? {
                        ...t,
                        clips: t.clips.map((c) => (c.id === clip.id ? updatedClip : c)),
                      }
                    : t
                );
                store.setState({
                  project: { ...proj, timeline: { ...proj.timeline, tracks } },
                });
              }
            }
          }
          navigate("editor");
        } catch (err) {
          window.parent.postMessage(
            { type: "openreel:error", message: err instanceof Error ? err.message : "load failed" },
            ORIGIN
          );
        }
      } else if (data.type === "openreel:loadProject" && data.project) {
        store.getState().loadProject(data.project as never);
        navigate("editor");
      }
    };

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "openreel:ready" }, ORIGIN);

    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const unsub = store.subscribe(
      (s) => s.project,
      () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          try {
            window.parent.postMessage(
              { type: "openreel:projectChanged", project: store.getState().getFullProject() },
              ORIGIN
            );
          } catch {}
        }, 1500);
      }
    );

    return () => {
      window.removeEventListener("message", onMessage);
      unsub();
      HTMLAnchorElement.prototype.click = originalClick;
      if (originalShowSave) {
        // @ts-expect-error - restore native API
        window.showSaveFilePicker = originalShowSave;
      }
    };
  }, [navigate]);

  return null;
}
