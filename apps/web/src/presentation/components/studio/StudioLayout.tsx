"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ArrowLeft, Loader2, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChatPanel, type ChatMessage } from "./ChatPanel";
import { ActionListPanel } from "./ActionListPanel";
import { cn } from "@/lib/utils";
import type { StudioAction } from "@spikeclip/shared";

interface StudioLayoutProps {
  projectId: string;
  sceneId: string;
  jobId: string;
  sourceUrl: string;
  platform: string;
  sceneStart: number;
  sceneEnd: number;
  projectName: string;
}

interface TranslateResponse {
  actions: StudioAction[];
  ffmpegCommand: string;
  summary?: string;
  clarification?: { question: string; suggestions: string[] };
}

interface PreviewResponse {
  previewUrl: string;
  cached: boolean;
}

export function StudioLayout({
  projectId,
  sceneId,
  jobId,
  sourceUrl,
  platform,
  sceneStart,
  sceneEnd,
  projectName,
}: StudioLayoutProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [actions, setActions] = useState<StudioAction[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);

  const undoStack = useRef<StudioAction[][]>([[]]);
  const redoStack = useRef<StudioAction[][]>([]);
  const undoIndex = useRef(0);

  const pushUndo = useCallback((newActions: StudioAction[]) => {
    undoStack.current = undoStack.current.slice(0, undoIndex.current + 1);
    undoStack.current.push(newActions);
    undoIndex.current = undoStack.current.length - 1;
    redoStack.current = [];
  }, []);

  const handleUndo = useCallback(() => {
    if (undoIndex.current <= 0) return;
    undoIndex.current--;
    setActions(undoStack.current[undoIndex.current]);
  }, []);

  const handleRedo = useCallback(() => {
    if (undoIndex.current >= undoStack.current.length - 1) return;
    undoIndex.current++;
    setActions(undoStack.current[undoIndex.current]);
  }, []);

  const handleRemoveAction = useCallback(
    (index: number) => {
      const newActions = actions.filter((_, i) => i !== index);
      setActions(newActions);
      pushUndo(newActions);
    },
    [actions, pushUndo]
  );

  const handleSendMessage = useCallback(
    async (prompt: string) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/studio/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            prompt,
            sceneStart,
            sceneEnd,
            platform,
            currentActions: actions,
            history,
          }),
        });

        if (!res.ok) {
          throw new Error("Translation failed");
        }

        const data: TranslateResponse = await res.json();

        if (data.clarification) {
          const clarifyMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: "",
            timestamp: Date.now(),
            clarification: data.clarification,
          };
          setMessages((prev) => [...prev, clarifyMsg]);
        } else if (data.actions && data.actions.length > 0) {
          const newActions = [...actions, ...data.actions];
          setActions(newActions);
          pushUndo(newActions);

          const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: data.summary ?? `Applied ${data.actions.length} action(s)`,
            timestamp: Date.now(),
            actions: data.actions,
          };
          setMessages((prev) => [...prev, assistantMsg]);

          setHistory((prev) => [
            ...prev,
            { role: "user", content: prompt },
            { role: "assistant", content: data.summary ?? "Actions applied" },
          ]);
        }
      } catch {
        const errorMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [actions, sceneStart, sceneEnd, platform, history, pushUndo]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      handleSendMessage(suggestion);
    },
    [handleSendMessage]
  );

  const handleGeneratePreview = useCallback(async () => {
    if (actions.length === 0) return;
    setIsGeneratingPreview(true);
    try {
      const res = await fetch(`/api/studio/preview/${jobId}/0`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ actions, platform }),
      });

      if (!res.ok) throw new Error("Preview generation failed");

      const data: PreviewResponse = await res.json();
      setPreviewUrl(data.previewUrl);
    } catch {
      // Preview generation failed silently
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [actions, jobId, platform]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      // Generate final export
      const res = await fetch(`/api/studio/preview/${jobId}/0`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ actions, platform }),
      });

      if (!res.ok) throw new Error("Export failed");

      const data: PreviewResponse = await res.json();
      // Trigger download
      const link = document.createElement("a");
      link.href = data.previewUrl;
      link.download = `clip-${sceneId}.mp4`;
      link.click();
    } catch {
      // Export failed
    } finally {
      setIsExporting(false);
    }
  }, [actions, jobId, platform, sceneId]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const skipBack = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(sceneStart, videoRef.current.currentTime - 5);
    }
  }, [sceneStart]);

  const skipForward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(sceneEnd, videoRef.current.currentTime + 5);
    }
  }, [sceneEnd]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b bg-background/80 px-4 py-2 backdrop-blur-sm shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/projects/${projectId}`)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Project
        </Button>
        <span className="truncate text-sm font-medium text-foreground/80">
          {projectName}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {platform.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Chat Panel */}
        <div className="w-80 shrink-0">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onSuggestionClick={handleSuggestionClick}
            isLoading={isLoading}
          />
        </div>

        {/* Center: Video Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center bg-black/5 p-4">
            <div className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-2xl">
              {previewUrl ? (
                <video
                  ref={videoRef}
                  src={previewUrl}
                  className="w-full h-full object-contain"
                  controls={false}
                />
              ) : (
                <video
                  ref={videoRef}
                  src={sourceUrl}
                  className="w-full h-full object-contain"
                  controls={false}
                />
              )}

              {isGeneratingPreview && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Video Controls */}
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t">
            <Button variant="ghost" size="icon" onClick={skipBack}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={togglePlay}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={skipForward}>
              <SkipForward className="h-4 w-4" />
            </Button>
            <div className="ml-4 text-xs text-muted-foreground">
              {sceneStart.toFixed(1)}s — {sceneEnd.toFixed(1)}s
            </div>
            {actions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePreview}
                disabled={isGeneratingPreview}
                className="ml-auto"
              >
                {isGeneratingPreview ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : null}
                Preview Actions
              </Button>
            )}
          </div>
        </div>

        {/* Right: Actions Panel */}
        <div className="w-72 shrink-0">
          <ActionListPanel
            actions={actions}
            onRemoveAction={handleRemoveAction}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={undoIndex.current > 0}
            canRedo={undoIndex.current < undoStack.current.length - 1}
            onExport={handleExport}
            isExporting={isExporting}
            sceneLabel={`Scene: ${sceneStart.toFixed(1)}s — ${sceneEnd.toFixed(1)}s`}
          />
        </div>
      </div>
    </div>
  );
}
