"use client";

import { useRef, useState, useCallback, useEffect, memo } from "react";
import { Job } from "@/domain/entities/job";
import { Platform } from "@/domain/entities/platform";
import { Caption } from "@/domain/entities/caption";
import { EditTemplate } from "@/domain/entities/template";
import { MusicTrack } from "@/domain/entities/music";
import type { ScoredBlock } from "@spikeclips/shared";
import type { StudioAction } from "@spikeclips/shared";
import { demuxVideo } from "@/lib/video/demuxer";
import { VideoDecoderService } from "@/lib/video/decoder";
import { CanvasRenderer, type RenderState } from "@/lib/video/renderer";
import { AudioSyncService } from "@/lib/video/audio-sync";
import {
  processActions,
  buildRenderState,
  type PipelineResult,
} from "@/lib/video/effect-pipeline";
import { extractVideoId } from "@/lib/youtube";
import { formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2 } from "lucide-react";

interface VideoPreviewProps {
  job: Job;
  platform: Platform | null;
  captions: Caption[];
  selectedTemplate: EditTemplate | null;
  scenes: ScoredBlock[];
  selectedScenes: number[];
  musicTrack: MusicTrack | null;
  studioActions: StudioAction[];
  onCaptionDrag?: (id: string, x: number, y: number) => void;
}

export const VideoPreview = memo(function VideoPreview({
  job,
  platform,
  captions,
  selectedTemplate,
  scenes,
  selectedScenes,
  musicTrack,
  studioActions,
  onCaptionDrag,
}: VideoPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const decoderRef = useRef<VideoDecoderService | null>(null);
  const audioRef = useRef<AudioSyncService | null>(null);
  const animFrameRef = useRef<number>(0);
  const pipelineRef = useRef<PipelineResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const videoId = extractVideoId(job.url);

  const orderedScenes = selectedScenes
    .map((i) => scenes[i])
    .filter(Boolean) as ScoredBlock[];
  const activeScene = orderedScenes[0] ?? null;
  const sceneDuration = activeScene
    ? activeScene.end_time - activeScene.start_time
    : 0;

  const loadVideo = useCallback(async () => {
    if (!activeScene || !videoId) return;

    setIsLoading(true);
    setError(null);

    try {
      const previewUrl = `/api/studio/preview/${job.id}/${selectedScenes[0]}/file`;
      const { videoChunks, audioChunks, videoConfig, audioConfig } =
        await demuxVideo(previewUrl);

      const decoder = new VideoDecoderService();
      await decoder.initialize(videoChunks, audioChunks, videoConfig, audioConfig);
      decoder.setRange(activeScene.start_time, activeScene.end_time);
      decoderRef.current = decoder;

      const audio = new AudioSyncService();
      audioRef.current = audio;

      const canvas = canvasRef.current;
      if (canvas) {
        rendererRef.current = new CanvasRenderer(canvas);
      }

      decoder.onFrameCallback((frame) => {
        const elapsed = decoder.getCurrentTime() / 1000;
        const sceneElapsed = Math.max(0, elapsed - activeScene.start_time);

        if (pipelineRef.current && rendererRef.current) {
          const renderState = buildRenderState(
            pipelineRef.current,
            sceneElapsed,
            sceneDuration
          );
          rendererRef.current.renderFrame(frame, renderState);
        }

        frame.close();
      });

      const pipeline = processActions(studioActions, activeScene.start_time, activeScene.end_time);
      pipelineRef.current = pipeline;

      setIsLoading(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load video preview"
      );
      setIsLoading(false);
    }
  }, [activeScene, videoId, job.id, selectedScenes, sceneDuration]);

  useEffect(() => {
    loadVideo();
    return () => {
      decoderRef.current?.destroy();
      audioRef.current?.destroy();
      rendererRef.current?.destroy();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [loadVideo]);

  useEffect(() => {
    if (activeScene && !isLoading) {
      const pipeline = processActions(studioActions, activeScene.start_time, activeScene.end_time);
      pipelineRef.current = pipeline;
    }
  }, [studioActions, activeScene, isLoading]);

  const togglePlay = useCallback(async () => {
    const decoder = decoderRef.current;
    if (!decoder) return;

    if (isPlaying) {
      cancelAnimationFrame(animFrameRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      decoder.seekTo(activeScene?.start_time ?? 0);

      const tick = async () => {
        if (!decoderRef.current || !rendererRef.current) return;

        const frames = await decoderRef.current.decodeNextBatch(3);
        for (const frame of frames) {
          const elapsed = decoderRef.current.getCurrentTime() / 1000;
          const sceneElapsed = Math.max(
            0,
            elapsed - (activeScene?.start_time ?? 0)
          );

          if (pipelineRef.current) {
            const renderState = buildRenderState(
              pipelineRef.current,
              sceneElapsed,
              sceneDuration
            );
            rendererRef.current.renderFrame(frame, renderState);
          }

          setCurrentTime(elapsed);
          frame.close();
        }

        if (!decoderRef.current.isAtEnd()) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          setIsPlaying(false);
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);
    }
  }, [isPlaying, activeScene, sceneDuration]);

  if (!videoId) return null;

  const supportsWebCodecs = typeof VideoDecoder !== "undefined";

  if (!supportsWebCodecs) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-xs font-medium text-muted-foreground">
            Preview
          </span>
          {platform && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {platform.name}
            </span>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center p-3">
          <div className="text-center text-muted-foreground text-sm">
            <p>WebCodecs not supported in this browser.</p>
            <p className="text-xs mt-1">Use Chrome, Edge, or Firefox for preview.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-medium text-muted-foreground">
          Preview
        </span>
        {platform && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
            {platform.name}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-3 min-h-0">
        <div className="relative w-full max-w-full flex-shrink min-h-0">
          <div
            className={`relative w-full overflow-hidden rounded-lg border bg-black ${
              platform ? "aspect-[9/16]" : "aspect-video"
            }`}
            style={{ maxHeight: "60vh" }}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />

            {isLoading && (
              <div className="absolute inset-0 z-[4] flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <span className="text-[10px] text-muted-foreground">
                    Loading preview…
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 z-[4] flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center gap-2 text-center px-4">
                  <span className="text-xs text-red-400">{error}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadVideo}
                    className="h-7 text-xs"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {activeScene && (
              <div className="absolute top-1.5 left-1.5 right-1.5 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded z-[6] flex items-center justify-between">
                <span>
                  S1: {formatTime(activeScene.start_time)} —{" "}
                  {formatTime(activeScene.end_time)}
                </span>
                <span className="text-primary font-semibold">
                  {sceneDuration.toFixed(1)}s
                </span>
              </div>
            )}

            {activeScene && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-[8]">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{
                    width: `${
                      sceneDuration > 0
                        ? (currentTime / sceneDuration) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlay}
            className="h-7 w-7 p-0"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
});
