"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, AlertTriangle, ArrowLeft, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";

const EDITOR_URL = process.env.NEXT_PUBLIC_OPENREEL_EDITOR_URL || "/openreel-editor/";
const SOURCE_TIMEOUT_MS = 8 * 60 * 1000;

type EditorExportMeta = {
  duration?: number;
  peakIntensity?: number;
};

type FromEditorMessage =
  | { type: "openreel:ready" }
  | { type: "openreel:exported"; blob: Blob; meta?: EditorExportMeta }
  | { type: "openreel:projectChanged"; project: unknown }
  | { type: "openreel:error"; message: string };

type ToEditorMessage =
  | { type: "openreel:loadMedia"; url: string; start: number; end: number }
  | { type: "openreel:loadProject"; project: unknown }
  | { type: "openreel:export" }
  | { type: "openreel:saveProject" };

function EditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const startNum = start !== null ? parseFloat(start) : NaN;
  const endNum = end !== null ? parseFloat(end) : NaN;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const projectLoadedRef = useRef<unknown | null>(null);

  const [phase, setPhase] = useState<"init" | "preparing" | "ready" | "error">("init");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [exporting, setExporting] = useState(false);

  const editorOrigin = useCallback(() => {
    try {
      return new URL(EDITOR_URL, window.location.origin).origin;
    } catch {
      return window.location.origin;
    }
  }, []);

  const postToEditor = useCallback((msg: ToEditorMessage) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(msg, editorOrigin());
  }, [editorOrigin]);

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

  // Prepare a downloadable source section for the editor.
  useEffect(() => {
    if (!jobId || Number.isNaN(startNum) || Number.isNaN(endNum) || endNum <= startNum) {
      setPhase("ready");
      return;
    }
    let cancelled = false;
    setPhase("preparing");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);

    fetch(`/api/studio/${jobId}/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ start: startNum, end: endNum }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to prepare source (${res.status})`);
        const data = (await res.json()) as { url: string };
        if (!cancelled) {
          sourceUrlRef.current = data.url;
          setPhase("ready");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Source prep is best-effort: still load the editor so the user can
        // import media manually.
        setErrorMsg(err instanceof Error ? err.message : "Failed to prepare source video");
        setPhase("ready");
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [jobId, startNum, endNum]);

  // Listen for messages from the editor.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const origin = editorOrigin();
      if (event.origin !== origin && event.origin !== window.location.origin) return;
      const data = event.data as FromEditorMessage;
      if (!data || typeof data.type !== "string") return;

      switch (data.type) {
        case "openreel:ready": {
          if (sourceUrlRef.current) {
            postToEditor({
              type: "openreel:loadMedia",
              url: sourceUrlRef.current,
              start: startNum,
              end: endNum,
            });
          }
          if (projectLoadedRef.current) {
            postToEditor({ type: "openreel:loadProject", project: projectLoadedRef.current });
          }
          break;
        }
        case "openreel:exported": {
          void handleExported(data.blob, data.meta);
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
  }, [editorOrigin, postToEditor, startNum, endNum]);

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

  const handleExported = useCallback(
    async (blob: Blob, meta?: EditorExportMeta) => {
      if (!jobId) return;
      setExporting(true);
      try {
        const fd = new FormData();
        const ext = (blob.type.includes("webm") ? "webm" : "mp4");
        fd.append("file", blob, `export.${ext}`);
        fd.append("startTime", String(startNum || 0));
        fd.append("endTime", String(endNum || (meta?.duration ?? 0)));
        if (meta?.duration) fd.append("duration", String(meta.duration));
        if (meta?.peakIntensity) fd.append("peakIntensity", String(meta.peakIntensity));

        const res = await fetch(`/api/studio/${jobId}/clips`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (!res.ok) throw new Error(`Upload failed (${res.status})`);
        toastSuccess("Export saved to your clips!");
      } catch {
        toastError("Failed to upload exported clip. Please try again.");
      } finally {
        setExporting(false);
      }
    },
    [jobId, startNum, endNum]
  );

  if (!jobId) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-8 text-center">
        <div>
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Missing job identifier.</p>
          <Button asChild>
            <span onClick={() => router.push("/studio")}>Back to Studio</span>
          </Button>
        </div>
      </div>
    );
  }

  const editorSrc = `${EDITOR_URL}${EDITOR_URL.includes("?") ? "&" : "?"}studio=1&start=${startNum}&end=${endNum}`;

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/studio")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <span className="text-xs text-muted-foreground">
          OpenReel Editor
          {exporting && <span className="ml-2 inline-flex items-center"><Loader2 className="h-3 w-3 animate-spin mr-1" />Saving…</span>}
        </span>
      </div>

      {phase === "preparing" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Preparing source video…</p>
        </div>
      )}

      {errorMsg && phase === "ready" && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          {errorMsg} — you can import media manually.
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={editorSrc}
        title="OpenReel Editor"
        className="flex-1 w-full border-0"
        allow="autoplay; fullscreen; clipboard-write; cross-origin-isolated"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
      />
    </div>
  );
}

export default function StudioEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EditorContent />
    </Suspense>
  );
}
