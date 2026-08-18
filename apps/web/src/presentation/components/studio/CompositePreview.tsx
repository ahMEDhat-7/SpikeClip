"use client";

import { memo, useState, useCallback, useEffect, useRef, useMemo } from "react";
import YouTube from "react-youtube";
import { Job } from "@/domain/entities/job";
import { Platform } from "@/domain/entities/platform";
import { Caption } from "@/domain/entities/caption";
import { EditTemplate } from "@/domain/entities/template";
import { MusicTrack } from "@/domain/entities/music";
import type { ScoredBlock } from "@spikeclip/shared";
import { CaptionOverlay } from "./CaptionOverlay";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";
import { formatTime } from "@/lib/format";
import { extractVideoId } from "@/lib/youtube";
import { FPS, VIDEO_UPDATE_INTERVAL_MS } from "@/lib/constants";

interface CompositePreviewProps {
  job: Job;
  platform: Platform | null;
  captions: Caption[];
  selectedTemplate: EditTemplate | null;
  scenes: ScoredBlock[];
  selectedScenes: number[];
  musicTrack: MusicTrack | null;
  onCaptionDrag?: (id: string, x: number, y: number) => void;
}

function CountdownOverlay({ elapsed, duration }: { elapsed: number; duration: number }) {
  const remaining = Math.max(0, Math.ceil(duration - elapsed));
  if (remaining <= 0 || remaining > 5) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none">
      <span
        className="text-6xl font-black text-white drop-shadow-lg"
        style={{ textShadow: "0 0 20px rgba(255,255,255,0.5)" }}
      >
        {remaining}
      </span>
    </div>
  );
}

function ProgressBarOverlay({ elapsed, duration }: { elapsed: number; duration: number }) {
  const pct = duration > 0 ? (elapsed / duration) * 100 : 0;
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-[5] pointer-events-none">
      <div className="h-full bg-primary transition-all duration-150" style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function QuoteMarksOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-[4] pointer-events-none">
      <span className="absolute top-[15%] left-[10%] text-4xl text-white/30 font-serif">&ldquo;</span>
      <span className="absolute bottom-[15%] right-[10%] text-4xl text-white/30 font-serif">&rdquo;</span>
    </div>
  );
}

function StepNumbersOverlay({ elapsed, duration }: { elapsed: number; duration: number }) {
  const step = duration > 0 ? Math.min(3, Math.ceil((elapsed / duration) * 3)) : 1;
  return (
    <div className="absolute top-4 left-4 z-[5] pointer-events-none">
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {step}
      </div>
    </div>
  );
}

function PhotoFlashOverlay({ elapsed }: { elapsed: number }) {
  if (elapsed > 0.15) return null;
  const opacity = 1 - elapsed / 0.15;
  return (
    <div
      className="absolute inset-0 bg-white z-[5] pointer-events-none"
      style={{ opacity: opacity * 0.6 }}
    />
  );
}

function SplitLabelsOverlay({ layout }: { layout: string }) {
  if (layout === "full") return null;
  return (
    <div className="absolute inset-0 z-[5] pointer-events-none">
      {layout === "split-horizontal" && (
        <>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] text-white/50 font-mono bg-black/40 px-1.5 py-0.5 rounded">
            TOP
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-white/50 font-mono bg-black/40 px-1.5 py-0.5 rounded">
            BOTTOM
          </div>
        </>
      )}
      {layout === "split-vertical" && (
        <>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-white/50 font-mono bg-black/40 px-1.5 py-0.5 rounded">
            LEFT
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-white/50 font-mono bg-black/40 px-1.5 py-0.5 rounded">
            RIGHT
          </div>
        </>
      )}
    </div>
  );
}

function GridSyncOverlay({ elapsed }: { elapsed: number }) {
  const pulse = Math.sin(elapsed * 4) * 0.3 + 0.5;
  return (
    <div className="absolute inset-0 z-[4] pointer-events-none">
      <div className="absolute left-0 right-0 top-1/2 h-px" style={{ backgroundColor: `rgba(255,255,255,${pulse * 0.3})` }} />
      <div className="absolute top-0 bottom-0 left-1/2 w-px" style={{ backgroundColor: `rgba(255,255,255,${pulse * 0.3})` }} />
    </div>
  );
}

function ReactionCamOverlay() {
  return (
    <div className="absolute bottom-16 right-3 w-16 h-12 rounded-lg border-2 border-white/40 bg-black/60 z-[5] pointer-events-none flex items-center justify-center">
      <span className="text-[8px] text-white/60 font-mono">REACTION</span>
    </div>
  );
}

function BgOverlayOverlay() {
  return (
    <div className="absolute inset-0 bg-black/40 z-[4] pointer-events-none" />
  );
}

function ZoomShakeOverlay({ elapsed, duration }: { elapsed: number; duration: number }) {
  const progress = duration > 0 ? Math.min(elapsed / duration, 1) : 0;
  const scale = 1 + progress * 0.5;
  const shake = elapsed < 0.3 ? Math.sin(elapsed * 60) * 2 : 0;
  return (
    <div
      className="absolute inset-0 z-[4] pointer-events-none overflow-hidden"
      style={{
        transform: `scale(${scale}) translateX(${shake}px)`,
        transition: "transform 0.05s",
      }}
    />
  );
}

function ImpactTextOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-[4] pointer-events-none">
      <div className="text-white/5 text-8xl font-black uppercase tracking-tighter">IMPACT</div>
    </div>
  );
}

function CountdownNumbersOverlay({ elapsed }: { elapsed: number }) {
  const remaining = Math.max(0, Math.ceil(3 - elapsed));
  if (remaining <= 0 || remaining > 3 || elapsed > 3) return null;
  return (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5] pointer-events-none">
      <span className="text-5xl font-black text-primary" style={{ textShadow: "0 0 15px rgba(255,255,255,0.6)" }}>
        {remaining}
      </span>
    </div>
  );
}

function FlashTransitionOverlay({ elapsed, duration }: { elapsed: number; duration: number }) {
  const nearEnd = duration - elapsed < 0.2;
  const atStart = elapsed < 0.15;
  if (!nearEnd && !atStart) return null;
  const opacity = atStart ? (1 - elapsed / 0.15) * 0.5 : ((duration - elapsed) / 0.2) * 0.5;
  return (
    <div className="absolute inset-0 bg-white z-[5] pointer-events-none" style={{ opacity: Math.max(0, opacity) }} />
  );
}

export const CompositePreview = memo(function CompositePreview({
  job,
  platform,
  captions,
  selectedTemplate,
  scenes,
  selectedScenes,
  musicTrack,
  onCaptionDrag,
}: CompositePreviewProps) {
  const playerRef = useRef<YouTube | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [containerSize, setContainerSize] = useState({ width: 300, height: 533 });
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const timeUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoId = extractVideoId(job.url);

  const orderedScenes = useMemo(
    () => selectedScenes.map((i) => scenes[i]).filter(Boolean),
    [selectedScenes, scenes]
  );

  const activeScene = orderedScenes[currentSceneIdx] ?? null;

  const sceneElapsed = useMemo(() => {
    if (!activeScene) return 0;
    const elapsed = currentTime - activeScene.start_time;
    return isNaN(elapsed) ? 0 : Math.max(0, elapsed);
  }, [currentTime, activeScene]);

  const rawSceneDuration = activeScene ? activeScene.end_time - activeScene.start_time : 0;
  const sceneDuration = isNaN(rawSceneDuration) ? 0 : rawSceneDuration;

  const activeCaptions = useMemo(() => {
    if (!activeScene) return [];
    const fps = FPS;
    return captions.filter((c) => {
      if (c.sceneIndex !== undefined && c.sceneIndex !== currentSceneIdx) return false;
      const captionStart = c.startFrame / fps;
      const captionEnd = c.endFrame / fps;
      return sceneElapsed >= captionStart && sceneElapsed <= captionEnd;
    });
  }, [captions, sceneElapsed, currentSceneIdx, activeScene]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!musicTrack?.url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    if (!audioRef.current || audioRef.current.src !== musicTrack.url) {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(musicTrack.url);
    }

    const audio = audioRef.current;

    if (!isPlaying) {
      audio.pause();
      return;
    }

    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [musicTrack?.url, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !musicTrack) return;

    let volume = musicTrack.volume;

    if (activeScene) {
      const elapsed = currentTime - activeScene.start_time;

      if (musicTrack.fadeIn > 0 && elapsed < musicTrack.fadeIn) {
        volume = musicTrack.volume * (elapsed / musicTrack.fadeIn);
      }
      if (musicTrack.fadeOut > 0 && elapsed > sceneDuration - musicTrack.fadeOut) {
        volume = musicTrack.volume * ((sceneDuration - elapsed) / musicTrack.fadeOut);
      }
    }

    audio.volume = Math.max(0, Math.min(1, volume));
  }, [currentTime, musicTrack, activeScene, sceneDuration]);

  const opts = useMemo(
    () => ({
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 0,
        modestbranding: 1,
        rel: 0,
        controls: 0,
        disablekb: 1,
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    }),
    []
  );

  const seekTo = useCallback((time: number) => {
    const player = playerRef.current?.getInternalPlayer?.();
    if (player) {
      try {
        player.seekTo(time, true);
        setCurrentTime(time);
      } catch {
        // player not ready
      }
    }
  }, []);

  const playScene = useCallback(
    (index: number) => {
      const scene = orderedScenes[index];
      if (scene) {
        setCurrentSceneIdx(index);
        seekTo(scene.start_time);
        const player = playerRef.current?.getInternalPlayer?.();
        if (player) {
          try {
            player.playVideo();
          } catch {
            // not ready
          }
        }
      }
    },
    [orderedScenes, seekTo]
  );

  const togglePlay = useCallback(() => {
    const player = playerRef.current?.getInternalPlayer?.();
    if (!player) return;
    try {
      if (isPlaying) {
        player.pauseVideo();
      } else {
        if (activeScene && currentTime < activeScene.start_time) {
          seekTo(activeScene.start_time);
        }
        player.playVideo();
      }
    } catch {
      // not ready
    }
  }, [isPlaying, activeScene, currentTime, seekTo]);

  const handleReady = useCallback(() => {
    setIsPlayerReady(true);
  }, []);

  const handleStateChange = useCallback((event: { data: number }) => {
    const state = event.data;
    if (state === 1) {
      setIsPlaying(true);
      if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
      timeUpdateRef.current = setInterval(() => {
        const player = playerRef.current?.getInternalPlayer?.();
        if (player) {
          try {
            const t = player.getCurrentTime();
            if (typeof t === "number" && !isNaN(t)) {
              setCurrentTime(t);
            }
          } catch {
            // not ready
          }
        }
      }, VIDEO_UPDATE_INTERVAL_MS);
    } else {
      setIsPlaying(false);
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
        timeUpdateRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay]);

  useEffect(() => {
    if (!isPlaying || !activeScene) return;
    if (currentTime >= activeScene.end_time) {
      if (currentSceneIdx < orderedScenes.length - 1) {
        playScene(currentSceneIdx + 1);
      } else {
        const player = playerRef.current?.getInternalPlayer?.();
        if (player) {
          try {
            player.pauseVideo();
          } catch {
            // ignore
          }
        }
        setCurrentSceneIdx(0);
        setIsPlaying(false);
      }
    }
  }, [currentTime, isPlaying, activeScene, currentSceneIdx, orderedScenes.length, playScene]);

  const layout = selectedTemplate?.config?.layout ?? "full";
  const overlayEffects = selectedTemplate?.config?.overlayEffects ?? [];

  const layoutOverlay = useMemo(() => {
    switch (layout) {
      case "split-horizontal":
        return (
          <div className="absolute inset-0 pointer-events-none z-[4]">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-white/30" />
          </div>
        );
      case "split-vertical":
        return (
          <div className="absolute inset-0 pointer-events-none z-[4]">
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/30" />
          </div>
        );
      case "grid":
        return (
          <div className="absolute inset-0 pointer-events-none z-[4]">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-white/30" />
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/30" />
          </div>
        );
      default:
        return null;
    }
  }, [layout]);

  const hasVignette = overlayEffects.includes("vignette");
  const hasPovLabel = selectedTemplate?.category === "pov";
  const hasWordByWord = overlayEffects.includes("word-by-word");
  const hasCountdownNumbers = overlayEffects.includes("countdown-numbers");
  const hasProgressBar = overlayEffects.includes("progress-bar");
  const hasQuoteMarks = overlayEffects.includes("quote-marks");
  const hasStepNumbers = overlayEffects.includes("step-numbers");
  const hasPhotoFlash = overlayEffects.includes("photo-flash");
  const hasSplitLabels = overlayEffects.includes("split-labels");
  const hasGridSync = overlayEffects.includes("grid-sync");
  const hasReactionCam = overlayEffects.includes("reaction-cam");
  const hasBgOverlay = overlayEffects.includes("bg-overlay");
  const hasZoomShake = overlayEffects.includes("zoom-shake");
  const hasImpactText = overlayEffects.includes("impact-text");
  const hasFlashTransition = overlayEffects.includes("flash-transition");

  if (!videoId) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-medium text-muted-foreground">Preview</span>
        {platform && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
            {platform.name}
          </span>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-3 min-h-0">
        <div className="relative w-full max-w-full flex-shrink min-h-0">
          <div
            ref={containerRef}
            className={`relative w-full overflow-hidden rounded-lg border bg-black ${platform ? "aspect-[9/16]" : "aspect-video"}`}
            style={{ maxHeight: "60vh" }}
          >
            <YouTube
              ref={playerRef}
              videoId={videoId}
              opts={opts}
              onReady={handleReady}
              onStateChange={handleStateChange}
              className="absolute inset-0 w-full h-full [&_iframe]:pointer-events-none"
            />

            {!isPlayerReady && (
              <div className="absolute inset-0 z-[4] flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-muted-foreground">Loading video…</span>
                </div>
              </div>
            )}

            <div
              className="absolute inset-0 z-[3] cursor-pointer pointer-events-auto"
              onClick={togglePlay}
              role="button"
              aria-label={isPlaying ? "Pause" : "Play"}
            />

            {platform && (
              <div className="absolute inset-0 pointer-events-none z-[2]">
                <div className="absolute top-0 bottom-0 left-0 w-[21.875%] bg-black/60" />
                <div className="absolute top-0 bottom-0 right-0 w-[21.875%] bg-black/60" />
                <div className="absolute top-0 bottom-0 left-[21.875%] right-[21.875%] border-x border-white/10" />
              </div>
            )}

            {!platform && (
              <div className="absolute inset-0 pointer-events-none z-[2]">
                <div className="absolute left-0 right-0 top-[12.5%] h-[75%] border-2 border-primary/40 rounded" />
                <div className="absolute top-0 bottom-0 left-0 right-0 bg-black/30" />
                <div className="absolute left-0 right-0 top-[12.5%] h-[75%] bg-transparent" />
              </div>
            )}

            {layoutOverlay}

            {activeCaptions.map((caption) => (
              <CaptionOverlay
                key={caption.id}
                caption={caption}
                sceneElapsed={sceneElapsed}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
                isDraggable={true}
                onDrag={onCaptionDrag}
              />
            ))}

            {hasPovLabel && (
              <div className="absolute top-4 left-0 right-0 text-center z-[6] pointer-events-none">
                <span className="inline-block px-3 py-1 bg-black/60 rounded text-white text-xs font-bold uppercase tracking-wider">
                  POV:
                </span>
              </div>
            )}

            {hasVignette && (
              <div
                className="absolute inset-0 pointer-events-none z-[4]"
                style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)" }}
              />
            )}

            {hasQuoteMarks && <QuoteMarksOverlay />}
            {hasStepNumbers && <StepNumbersOverlay elapsed={sceneElapsed} duration={sceneDuration} />}
            {hasProgressBar && <ProgressBarOverlay elapsed={sceneElapsed} duration={sceneDuration} />}
            {hasPhotoFlash && <PhotoFlashOverlay elapsed={sceneElapsed} />}
            {hasSplitLabels && <SplitLabelsOverlay layout={layout} />}
            {hasGridSync && <GridSyncOverlay elapsed={sceneElapsed} />}
            {hasReactionCam && <ReactionCamOverlay />}
            {hasBgOverlay && <BgOverlayOverlay />}
            {hasZoomShake && <ZoomShakeOverlay elapsed={sceneElapsed} duration={sceneDuration} />}
            {hasImpactText && <ImpactTextOverlay />}
            {hasCountdownNumbers && <CountdownNumbersOverlay elapsed={sceneElapsed} />}
            {hasFlashTransition && <FlashTransitionOverlay elapsed={sceneElapsed} duration={sceneDuration} />}

            {activeScene && (
              <div className="absolute top-1.5 left-1.5 right-1.5 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded z-[6] flex items-center justify-between">
                <span>S{currentSceneIdx + 1}: {formatTime(activeScene.start_time)} — {formatTime(activeScene.end_time)}</span>
                <span className="text-primary font-semibold">{sceneElapsed.toFixed(1)}s / {sceneDuration.toFixed(1)}s</span>
              </div>
            )}

            {activeScene && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-[8]">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{ width: `${sceneDuration > 0 ? (sceneElapsed / sceneDuration) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={togglePlay} className="h-7 w-7 p-0" aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
});
