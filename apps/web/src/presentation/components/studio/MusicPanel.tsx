"use client";

import { useRef, useState, useEffect } from "react";
import { MusicTrack, createMusicTrack } from "@/domain/entities/music";
import { toastWarning, toastSuccess } from "@/lib/toast";
import { formatDuration } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Music,
  Upload,
  Trash2,
  Volume2,
  Loader2,
  Play,
  Pause,
  FileAudio,
  Scissors,
  ArrowLeftRight,
} from "lucide-react";

interface MusicPanelProps {
  musicTrack: MusicTrack | null;
  originalVolume: number;
  onSetMusic: (track: MusicTrack | null) => void;
  onSetOriginalVolume: (volume: number) => void;
  onUpload: (file: File) => Promise<{ id: string; name: string; url: string; size: number }>;
  onDelete: (key: string) => Promise<void>;
}

export function MusicPanel({
  musicTrack,
  originalVolume,
  onSetMusic,
  onSetOriginalVolume,
  onUpload,
  onDelete,
}: MusicPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current && musicTrack) {
      audioRef.current.volume = musicTrack.volume;
    }
  }, [musicTrack?.volume]);

  useEffect(() => {
    if (!audioRef.current || !isPlaying) return;
    const interval = setInterval(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await onUpload(file);
      onSetMusic(
        createMusicTrack({
          id: result.id,
          name: result.name,
          url: result.url,
          duration: 0,
        })
      );
      toastSuccess("Music uploaded successfully");
    } catch {
      toastWarning("Upload failed — music will play locally but won't be included in the exported clip.");
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => {
        onSetMusic(
          createMusicTrack({
            name: file.name,
            url,
            duration: audio.duration,
            trimEnd: audio.duration,
          })
        );
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
    if (musicTrack?.id && musicTrack.url && !musicTrack.url.startsWith("blob:")) {
      try {
        await onDelete(musicTrack.id);
      } catch {
        // ignore
      }
    }
    if (musicTrack?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(musicTrack.url);
    }
    onSetMusic(null);
  };

  const togglePlayPause = () => {
    if (!musicTrack?.url) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(musicTrack.url);
      audioRef.current.volume = musicTrack.volume;
      audioRef.current.addEventListener("ended", () => setIsPlaying(false));
      audioRef.current.addEventListener("loadedmetadata", () => {
        if (musicTrack.duration === 0) {
          onSetMusic({ ...musicTrack, duration: audioRef.current!.duration, trimEnd: audioRef.current!.duration });
        }
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const effectiveDuration = musicTrack
    ? (musicTrack.trimEnd || musicTrack.duration) - musicTrack.trimStart
    : 0;

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-base font-semibold">Background Music</h2>
      </div>

      <Card>
        <CardContent className="p-2.5 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Volume2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Original Audio</p>
              <p className="text-[10px] text-muted-foreground">Source video sound</p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              {Math.round(originalVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={originalVolume}
            onChange={(e) => onSetOriginalVolume(Number(e.target.value))}
            className="w-full accent-primary h-1"
            aria-label="Original audio volume"
          />
        </CardContent>
      </Card>

      {musicTrack ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-2.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <FileAudio className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{musicTrack.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {formatDuration(effectiveDuration)}
                    {musicTrack.trimStart > 0 || (musicTrack.trimEnd > 0 && musicTrack.trimEnd < musicTrack.duration) ? (
                      <span className="text-primary ml-1">(trimmed)</span>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button variant="ghost" size="sm" onClick={togglePlayPause} className="h-7 w-7 p-0" aria-label={isPlaying ? "Pause music" : "Play music"}>
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} className="h-7 w-7 p-0" aria-label="Remove music">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>

            {musicTrack.duration > 0 && (
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-primary/30 rounded-full"
                  style={{
                    left: `${(musicTrack.trimStart / musicTrack.duration) * 100}%`,
                    width: `${((musicTrack.trimEnd - musicTrack.trimStart) / musicTrack.duration) * 100}%`,
                  }}
                />
                <div
                  className="absolute h-full bg-primary rounded-full"
                  style={{
                    left: `${(musicTrack.trimStart / musicTrack.duration) * 100}%`,
                    width: `${((currentTime - musicTrack.trimStart) / musicTrack.duration) * 100}%`,
                  }}
                />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Music Volume</span>
                <span className="font-mono">{Math.round(musicTrack.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={musicTrack.volume}
                onChange={(e) =>
                  onSetMusic({ ...musicTrack, volume: Number(e.target.value) })
                }
                className="w-full accent-primary h-1"
                aria-label="Music volume"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Fade In</span>
                  <span className="font-mono">{musicTrack.fadeIn}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={musicTrack.fadeIn}
                  onChange={(e) =>
                    onSetMusic({ ...musicTrack, fadeIn: Number(e.target.value) })
                  }
                  className="w-full accent-primary h-1"
                  aria-label="Music fade in duration"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Fade Out</span>
                  <span className="font-mono">{musicTrack.fadeOut}s</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={musicTrack.fadeOut}
                  onChange={(e) =>
                    onSetMusic({ ...musicTrack, fadeOut: Number(e.target.value) })
                  }
                  className="w-full accent-primary h-1"
                  aria-label="Music fade out duration"
                />
              </div>
            </div>

            {musicTrack.duration > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-primary/20">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase">
                  <Scissors className="h-3 w-3" /> Trim
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Start ({formatDuration(musicTrack.trimStart)})</span>
                    <input
                      type="range"
                      min={0}
                      max={musicTrack.duration}
                      step={0.1}
                      value={musicTrack.trimStart}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val < musicTrack.trimEnd) {
                          onSetMusic({ ...musicTrack, trimStart: val });
                        }
                      }}
                      className="w-full accent-primary h-1"
                      aria-label="Music trim start"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">End ({formatDuration(musicTrack.trimEnd)})</span>
                    <input
                      type="range"
                      min={0}
                      max={musicTrack.duration}
                      step={0.1}
                      value={musicTrack.trimEnd}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val > musicTrack.trimStart) {
                          onSetMusic({ ...musicTrack, trimEnd: val });
                        }
                      }}
                      className="w-full accent-primary h-1"
                      aria-label="Music trim end"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ArrowLeftRight className="h-2.5 w-2.5" />
                  Effective: {formatDuration(effectiveDuration)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg p-2 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground/50 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium">
                  {isUploading ? "Uploading..." : "Upload Music"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  MP3, WAV, OGG, M4A (max 10MB)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
