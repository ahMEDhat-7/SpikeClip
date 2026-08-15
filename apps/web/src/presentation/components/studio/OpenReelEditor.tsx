"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toastError, toastSuccess } from "@/lib/toast";

const EDITOR_URL = process.env.NEXT_PUBLIC_OPENREEL_EDITOR_URL || "/openreel-editor/";
const SOURCE_TIMEOUT_MS = 8 * 60 * 1000;

export type EditorExportMeta = {
  duration?: number;
  peakIntensity?: number;
};

export type FromEditorMessage =
  | { type: "openreel:ready" }
  | { type: "openreel:exported"; blob: Blob; meta?: EditorExportMeta }
  | { type: "openreel:projectChanged"; project: unknown }
  | { type: "openreel:error"; message: string };

export type ToEditorMessage =
  | { type: "openreel:loadMedia"; url: string; start: number; end: number }
  | { type: "openreel:updateRange"; start: number; end: number }
  | { type: "openreel:loadProject"; project: unknown }
  | { type: "openreel:export" }
  | { type: "openreel:saveProject" };

export interface OpenReelEditorProps {
  jobId: string;
  start: number;
  end: number;
  onExport?: () => void;
}

export function OpenReelEditor({ jobId, start, end, onExport }: OpenReelEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const projectLoadedRef = useRef<unknown | null>(null);
  const editorReadyRef = useRef(false);
  const loadSentRef = useRef(false);
  const projectSentRef = useRef(false);
  const rangeRef = useRef({ start, end });

  const [phase, setPhase] = useState<"init" | "preparing" | "ready" | "error">("init");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const editorOrigin = useCallback(() => {
    try {
      return new URL(EDITOR_URL, window.location.origin).origin;
    } catch {
      return window.location.origin;
    }
  }, []);

  const postToEditor = useCallback(
    (msg: ToEditorMessage) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage(msg, editorOrigin());
    },
    [editorOrigin]
  );

  // Persist project to API (defined before useEffect that calls it)
  const persistProject = useCallback(
    async (project: unknown) => {
      if (!jobId) return;
      try {
        await fetch(`/api/studio/${jobId}/project`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ project }),
        });
      } catch {
        // Non-fatal: project persistence is best-effort.
      }
    },
    [jobId]
  );

  const maybeLoadEditor = useCallback(() => {
    if (!editorReadyRef.current) return;
    if (sourceUrlRef.current && !loadSentRef.current) {
      loadSentRef.current = true;
      postToEditor({
        type: "openreel:loadMedia",
        url: sourceUrlRef.current,
        start: rangeRef.current.start,
        end: rangeRef.current.end,
      });
    }
    if (projectLoadedRef.current && !projectSentRef.current) {
      projectSentRef.current = true;
      postToEditor({ type: "openreel:loadProject", project: projectLoadedRef.current });
    }
  }, [postToEditor]);

  // Send range updates when start/end change (without reloading iframe)
  useEffect(() => {
    if (editorReadyRef.current && rangeRef.current.start !== start && rangeRef.current.end !== end) {
      rangeRef.current = { start, end };
      postToEditor({ type: "openreel:updateRange", start, end });
    }
  }, [start, end, postToEditor]);

  // Load any previously persisted OpenReel project for this job.
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    fetch(`/api/studio/${jobId}/project`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.project) projectLoadedRef.current = data.project;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // Prepare a downloadable source section for the editor. Re-runs when the
  // selected range changes so the editor always reflects the chosen scene.
  useEffect(() => {
    if (!jobId || Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      setPhase("ready");
      return;
    }
    let cancelled = false;
    loadSentRef.current = false;
    setPhase("preparing");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);

    fetch(`/api/studio/${jobId}/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ start, end }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to prepare source (${res.status})`);
        const data = (await res.json()) as { url: string };
        if (!cancelled) {
          sourceUrlRef.current = data.url;
          rangeRef.current = { start, end };
          setErrorMsg("");
          setPhase("ready");
          maybeLoadEditor();
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Failed to prepare source video");
        setPhase("ready");
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [jobId, start, end, maybeLoadEditor]);

  // Listen for messages from the editor.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const origin = editorOrigin();
      if (event.origin !== origin && event.origin !== window.location.origin) return;
      const data = event.data as FromEditorMessage;
      if (!data || typeof data.type !== "string") return;

      switch (data.type) {
        case "openreel:ready": {
          editorReadyRef.current = true;
          maybeLoadEditor();
          break;
        }
        case "openreel:exported": {
          // Upload the exported blob to create a Clip record
          if (data.blob && jobId) {
            const formData = new FormData();
            formData.append("file", data.blob, `clip-${Date.now()}.mp4`);
            if (data.meta?.duration) formData.append("duration", String(data.meta.duration));
            if (data.meta?.peakIntensity) formData.append("peakIntensity", String(data.meta.peakIntensity));
            formData.append("startTime", String(rangeRef.current.start));
            formData.append("endTime", String(rangeRef.current.end));

            fetch(`/api/studio/${jobId}/clips`, {
              method: "POST",
              credentials: "include",
              body: formData,
            })
              .then((res) => {
                if (!res.ok) throw new Error(`Upload failed (${res.status})`);
                return res.json();
              })
              .then(() => {
                if (onExport) onExport();
                void toastSuccess("Export saved to your clips!");
              })
              .catch((err: unknown) => {
                console.error("[OpenReelEditor] Clip upload failed:", err);
                void toastError("Export captured but upload failed. Check your clips.");
              });
          } else {
            if (onExport) onExport();
            void toastSuccess("Export saved to your clips!");
          }
          break;
        }
        case "openreel:projectChanged": {
          void persistProject(data.project);
          break;
        }
        case "openreel:error": {
          toastError(data.message || "Editor error");
          break;
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [editorOrigin, postToEditor, maybeLoadEditor, onExport, persistProject, jobId]);

  // Build stable iframe src — no start/end in URL to avoid reloads on scene change
  const editorSrc = `${EDITOR_URL}${EDITOR_URL.includes("?") ? "&" : "?"}studio=1`;

  return (
    <div className="relative flex h-full w-full flex-col bg-background">
      {phase === "preparing" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80">
          <Loader2 className="mb-3 h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Preparing source video…</p>
        </div>
      )}

      {errorMsg && phase === "ready" && (
        <div className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          {errorMsg} — you can import media manually.
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={editorSrc}
        title="OpenReel Editor"
        className="h-full w-full flex-1 border-0"
        allow="autoplay; fullscreen; clipboard-write; cross-origin-isolated"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      />
    </div>
  );
}
