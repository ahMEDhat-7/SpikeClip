"use client";

import { useRef, useEffect, useState } from "react";
import { Loader2, AlertTriangle, RotateCcw } from "lucide-react";

import { formatTime } from "@/lib/format";

interface PreviewPanelProps {
  previewUrl: string | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  sceneStart?: number;
  sceneEnd?: number;
}

export function PreviewPanel({
  previewUrl,
  loading,
  error,
  onRetry,
  sceneStart = 0,
  sceneEnd = 15,
}: PreviewPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [previewUrl]);

  return (
    <div className="flex flex-col h-full border rounded-xl bg-background">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Preview</h3>
        <p className="text-xs text-muted-foreground">
          {sceneStart}s — {sceneEnd}s
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center bg-black/5 p-4">
        {loading && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Rendering preview...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-2 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg border hover:bg-muted transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Retry
              </button>
            )}
          </div>
        )}

        {!loading && !error && !previewUrl && (
          <div className="text-center text-muted-foreground text-sm">
            <p>No preview yet</p>
            <p className="text-xs mt-1">Type a prompt to see a preview</p>
          </div>
        )}

        {!loading && !error && previewUrl && (
          <video
            ref={videoRef}
            src={previewUrl}
            controls
            className="max-h-full max-w-full rounded-lg"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />
        )}
      </div>

      {previewUrl && !loading && (
        <div className="px-4 py-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <div className="flex-1 mx-3 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
