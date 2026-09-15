"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2,
  AlertTriangle,
  RefreshCw,
  Download,
  Upload,
  Film,
  X,
  Check,
  MonitorPlay,
  ExternalLink,
  WifiOff,
  Clock,
} from "lucide-react";
import { toastError, toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";

const EDITOR_URL = process.env.NEXT_PUBLIC_OPENREEL_EDITOR_URL || "/openreel-editor";
const SOURCE_TIMEOUT_MS = 8 * 60 * 1000;
const EDITOR_READY_TIMEOUT_MS = 15_000;

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
  | { type: "openreel:loadMedia"; url: string; start: number; end: number; platform: string }
  | { type: "openreel:updateRange"; start: number; end: number }
  | { type: "openreel:loadProject"; project: unknown }
  | { type: "openreel:export" }
  | { type: "openreel:saveProject" };

export interface OpenReelEditorProps {
  jobId?: string;
  sourceUrl?: string;
  exportUrl?: string;
  start: number;
  end: number;
  platform?: string;
  onExport?: () => void;
  onExportComplete?: () => void;
}

type PrepareStep = "download" | "upload" | "loading" | "ready";

export function OpenReelEditor({ jobId, sourceUrl: preloadedSourceUrl, exportUrl, start, end, platform = "youtube-shorts", onExport, onExportComplete }: OpenReelEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const projectLoadedRef = useRef<unknown | null>(null);
  const editorReadyRef = useRef(false);
  const loadSentRef = useRef(false);
  const projectSentRef = useRef(false);
  const rangeRef = useRef({ start, end });
  const abortRef = useRef<AbortController | null>(null);

  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [editorFailed, setEditorFailed] = useState(false);
  const [prepareStep, setPrepareStep] = useState<PrepareStep | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [retryKey, setRetryKey] = useState(0);
  const [sceneChanged, setSceneChanged] = useState(false);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        // Non-fatal
      }
    },
    [jobId]
  );

  const maybeLoadEditor = useCallback(() => {
    if (!editorReadyRef.current) return;
    if (sourceUrlRef.current && !loadSentRef.current) {
      loadSentRef.current = true;
      setPrepareStep("loading");
      postToEditor({
        type: "openreel:loadMedia",
        url: sourceUrlRef.current,
        start: rangeRef.current.start,
        end: rangeRef.current.end,
        platform,
      });
    }
    if (projectLoadedRef.current && !projectSentRef.current) {
      projectSentRef.current = true;
      postToEditor({ type: "openreel:loadProject", project: projectLoadedRef.current });
    }
  }, [postToEditor]);

  // Handle scene range changes
  useEffect(() => {
    if (editorReadyRef.current && (rangeRef.current.start !== start || rangeRef.current.end !== end)) {
      rangeRef.current = { start, end };
      postToEditor({ type: "openreel:updateRange", start, end });
      setSceneChanged(true);
      const t = setTimeout(() => setSceneChanged(false), 1500);
      return () => clearTimeout(t);
    }
  }, [start, end, postToEditor]);

  // Load persisted project
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    fetch(`/api/studio/${jobId}/project`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.project) projectLoadedRef.current = data.project;
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [jobId]);

  // Prepare source — core download flow
  useEffect(() => {
    if (preloadedSourceUrl) {
      sourceUrlRef.current = preloadedSourceUrl;
      rangeRef.current = { start, end };
      setPrepareStep("ready");
      setErrorMsg("");
      loadSentRef.current = false;
      maybeLoadEditor();
      return;
    }
    if (!jobId || Number.isNaN(start) || Number.isNaN(end) || end <= start) {
      setPrepareStep(null);
      return;
    }
    let cancelled = false;
    loadSentRef.current = false;
    setErrorMsg("");
    setPrepareStep("download");

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);

    fetch(`/api/studio/${jobId}/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ start, end }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || `Failed to prepare source (${res.status})`);
        }
        const data = (await res.json()) as { url: string };
        if (!cancelled) {
          sourceUrlRef.current = data.url;
          rangeRef.current = { start, end };
          setPrepareStep("ready");
          setErrorMsg("");
          maybeLoadEditor();
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") {
          setErrorMsg("Download timed out. The video may be too long or unavailable.");
        } else if (err instanceof Error && err.message.includes("Failed to fetch")) {
          setErrorMsg("Network error. Check your connection and try again.");
        } else {
          setErrorMsg(err instanceof Error ? err.message : "Failed to prepare source video");
        }
        setPrepareStep(null);
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, start, end, retryKey, maybeLoadEditor, preloadedSourceUrl]);

  // Listen for editor messages + detect editor ready via postMessage
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const origin = editorOrigin();
      if (event.origin !== origin && event.origin !== window.location.origin) return;
      const data = event.data as FromEditorMessage;
      if (!data || typeof data.type !== "string") return;

      switch (data.type) {
        case "openreel:ready": {
          editorReadyRef.current = true;
          setEditorReady(true);
          setEditorFailed(false);
          if (readyTimeoutRef.current) {
            clearTimeout(readyTimeoutRef.current);
            readyTimeoutRef.current = null;
          }
          maybeLoadEditor();
          break;
        }
        case "openreel:exported": {
          if (data.blob && (jobId || exportUrl)) {
            setPrepareStep("upload");
            const formData = new FormData();
            formData.append("file", data.blob, `clip-${Date.now()}.mp4`);
            if (data.meta?.duration) formData.append("duration", String(data.meta.duration));
            if (data.meta?.peakIntensity) formData.append("peakIntensity", String(data.meta.peakIntensity));
            formData.append("startTime", String(rangeRef.current.start));
            formData.append("endTime", String(rangeRef.current.end));

            const uploadUrl = exportUrl || `/api/studio/${jobId}/clips`;
            fetch(uploadUrl, {
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
                if (onExportComplete) onExportComplete();
                void toastSuccess("Export saved to your clips!");
              })
              .catch((err: unknown) => {
                console.error("[OpenReelEditor] Clip upload failed:", err);
                void toastError("Export captured but upload failed. Check your clips.");
              })
              .finally(() => setPrepareStep("ready"));
          } else {
            if (onExport) onExport();
            if (onExportComplete) onExportComplete();
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
  }, [editorOrigin, postToEditor, maybeLoadEditor, onExport, onExportComplete, persistProject, jobId, exportUrl]);

  // Detect iframe load failure: if editor doesn't send "ready" within timeout after iframe load
  useEffect(() => {
    if (!iframeLoaded || editorReady) return;
    readyTimeoutRef.current = setTimeout(() => {
      if (!editorReadyRef.current) {
        setEditorFailed(true);
      }
    }, EDITOR_READY_TIMEOUT_MS);
    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
    };
  }, [iframeLoaded, editorReady]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setPrepareStep(null);
    setErrorMsg("Download cancelled.");
  }, []);

  const handleRetry = useCallback(() => {
    setErrorMsg("");
    setEditorFailed(false);
    setIframeLoaded(false);
    setEditorReady(false);
    editorReadyRef.current = false;
    loadSentRef.current = false;
    setPrepareStep("download");
    setRetryKey((k) => k + 1);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
    setEditorFailed(false);
  }, []);

  const editorSrc = `${EDITOR_URL}${EDITOR_URL.includes("?") ? "&" : "?"}studio=1`;

  const showPreparing = prepareStep && prepareStep !== "ready";
  const showError = errorMsg && prepareStep === null;
  const showIframeError = editorFailed && !showPreparing;
  const showSkeleton = !iframeLoaded && !editorReady && !editorFailed && !showPreparing;

  return (
    <div className="relative flex h-full w-full flex-col bg-background overflow-hidden">
      {/* Preparing source overlay */}
      {showPreparing && <PreparingOverlay step={prepareStep!} onCancel={handleCancel} />}

      {/* Source error banner */}
      {showError && <ErrorBanner message={errorMsg} onRetry={handleRetry} />}

      {/* Iframe loading skeleton */}
      {showSkeleton && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-muted/20">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-muted-foreground/20 bg-muted/10 p-8">
            <MonitorPlay className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground/60">Loading editor…</p>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
          </div>
        </div>
      )}

      {/* Iframe error state — editor failed to initialize */}
      {showIframeError && (
        <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center bg-background/95">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 max-w-sm shadow-sm">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <WifiOff className="h-6 w-6 text-destructive" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-medium text-foreground">Editor failed to connect</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The video editor couldn&apos;t initialize. This may be due to a browser security restriction or network issue.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRetry} className="text-xs h-8">
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Retry
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(editorSrc, "_blank")}
                className="text-xs h-8"
              >
                <ExternalLink className="h-3 w-3 mr-1.5" />
                Open in Tab
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Scene change indicator */}
      {sceneChanged && (
        <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-1.5 rounded-full bg-foreground/80 px-3 py-1 text-xs text-background shadow-lg">
            <Film className="h-3 w-3" />
            Scene updated — {start.toFixed(1)}s – {end.toFixed(1)}s
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={editorSrc}
        title="OpenReel Editor"
        className="h-full w-full flex-1 border-0"
        allow="autoplay; fullscreen; clipboard-write; cross-origin-isolated"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
        onLoad={handleIframeLoad}
      />
    </div>
  );
}

function PreparingOverlay({ step, onCancel }: { step: PrepareStep; onCancel: () => void }) {
  const steps: { key: PrepareStep; label: string; icon: React.ReactNode }[] = [
    { key: "download", label: "Downloading source from YouTube", icon: <Download className="h-4 w-4" /> },
    { key: "upload", label: "Uploading exported clip", icon: <Upload className="h-4 w-4" /> },
    { key: "loading", label: "Loading into editor", icon: <Film className="h-4 w-4" /> },
  ];

  const activeIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 p-8 rounded-2xl bg-background/95 border shadow-xl max-w-xs">
        {/* Spinner */}
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-primary/20" />
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex flex-col gap-2.5 w-full">
          {steps.map((s, i) => {
            const isActive = i === activeIdx;
            const isDone = i < activeIdx;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300 ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : isDone
                      ? "text-muted-foreground/60"
                      : "text-muted-foreground/40"
                }`}
              >
                <div className="flex-shrink-0">
                  {isDone ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : isActive ? (
                    <span className="text-primary">{s.icon}</span>
                  ) : (
                    <span className="opacity-40">{s.icon}</span>
                  )}
                </div>
                <span className="flex-1">{s.label}</span>
                {isActive && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/60" />
                )}
              </div>
            );
          })}
        </div>

        {/* Cancel button */}
        {step === "download" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1.5" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-2.5 shadow-lg max-w-lg backdrop-blur-sm">
      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-destructive" />
      <p className="text-xs text-foreground/80 flex-1">{message}</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        className="h-6 px-2 text-xs text-destructive hover:text-destructive"
      >
        <RefreshCw className="h-3 w-3 mr-1" />
        Retry
      </Button>
    </div>
  );
}
