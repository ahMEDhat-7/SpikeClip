"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Platform } from "@/domain/entities/platform";
import { EditTemplate } from "@/domain/entities/template";
import { Caption } from "@/domain/entities/caption";
import { MusicTrack } from "@/domain/entities/music";
import { ScoredBlock } from "@/domain/entities/job";
import { CLIP_STATUS } from "@/domain/entities/job";
import { ClipResponse } from "@/domain/ports/job-api.port";
import { formatTime } from "@/lib/format";
import { OutputFormat, OutputQuality, DEFAULT_OUTPUT_FORMAT, DEFAULT_OUTPUT_QUALITY } from "@/domain/entities/export";
import { OUTPUT_FORMATS, OUTPUT_QUALITIES } from "@/presentation/constants/export";
import {
  Download,
  Loader2,
  Check,
  Film,
  Music,
  Type,
  Sparkles,
  Clock,
  LayoutGrid,
  Image,
  AlertCircle,
} from "lucide-react";

interface ExportPanelProps {
  platform: Platform | null;
  scenes: ScoredBlock[];
  selectedScenes: number[];
  captions: Caption[];
  musicTrack: MusicTrack | null;
  originalVolume: number;
  selectedTemplate: EditTemplate | null;
  onExport: (config: { format: OutputFormat; quality: OutputQuality }) => void;
  isExporting?: boolean;
  clips?: ClipResponse[];
  exportError?: string | null;
  initialFormat?: OutputFormat;
  initialQuality?: OutputQuality;
  onFormatChange?: (format: OutputFormat) => void;
  onQualityChange?: (quality: OutputQuality) => void;
}

export function ExportPanel({
  platform,
  scenes,
  selectedScenes,
  captions,
  musicTrack,
  originalVolume,
  selectedTemplate,
  onExport,
  isExporting,
  clips = [],
  exportError,
  initialFormat = DEFAULT_OUTPUT_FORMAT,
  initialQuality = DEFAULT_OUTPUT_QUALITY,
  onFormatChange,
  onQualityChange,
}: ExportPanelProps) {
  const [quality, setQuality] = useState<OutputQuality>(initialQuality);
  const [format, setFormat] = useState<OutputFormat>(initialFormat);

  useEffect(() => {
    setQuality(initialQuality);
  }, [initialQuality]);

  useEffect(() => {
    setFormat(initialFormat);
  }, [initialFormat]);

  const handleFormatChange = (f: OutputFormat) => {
    setFormat(f);
    onFormatChange?.(f);
  };

  const handleQualityChange = (q: OutputQuality) => {
    setQuality(q);
    onQualityChange?.(q);
  };

  const selectedSceneData = selectedScenes.map((i) => scenes[i]).filter(Boolean);
  const totalDuration = selectedSceneData.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Export Settings</h2>
      </div>

      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground">Platform</div>
                <div className="text-xs font-medium truncate">{platform?.name ?? "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground">Aspect Ratio</div>
                <div className="text-xs font-mono font-medium">{platform?.aspectRatio ?? "—"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Film className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground">Scenes</div>
                <div className="text-xs font-mono font-medium">{selectedScenes.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground">Duration</div>
                <div className="text-xs font-mono font-medium">{formatTime(totalDuration)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground">Template</div>
                <div className="text-xs font-medium truncate">{selectedTemplate?.name ?? "None"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Type className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground">Captions</div>
                <div className="text-xs font-mono font-medium">{captions.length}</div>
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Music className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] text-muted-foreground">Music</div>
                <div className="text-xs font-medium truncate">{musicTrack?.name ?? "Original audio"}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 pt-3">
          <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Output</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 space-y-2">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase">Format</label>
            <div className="flex gap-1">
              {OUTPUT_FORMATS.map((f) => (
                <Button
                  key={f.id}
                  variant={format === f.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFormatChange(f.id)}
                  className="h-7 px-2.5 text-xs font-mono"
                >
                  {format === f.id && <Check className="h-3 w-3 mr-1" />}
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase">Quality</label>
            <div className="flex gap-1">
              {OUTPUT_QUALITIES.map((q) => (
                <Button
                  key={q.id}
                  variant={quality === q.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleQualityChange(q.id)}
                  className="h-7 px-2.5 text-xs font-mono"
                >
                  {quality === q.id && <Check className="h-3 w-3 mr-1" />}
                  {q.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button
          className="bg-gradient-to-r from-secondary to-primary hover:from-secondary/90 hover:to-primary/90 text-primary-foreground font-semibold px-6"
          size="sm"
          onClick={() => onExport({ format, quality })}
          disabled={isExporting || selectedScenes.length === 0}
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export Clip
            </>
          )}
        </Button>
      </div>

      {exportError && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{exportError}</span>
        </div>
      )}

      {clips.length > 0 && (
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
              Clips ({clips.filter((c) => c.status === CLIP_STATUS.COMPLETED).length}/{clips.length} ready)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1.5">
            {clips.map((clip) => (
              <div
                key={clip.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {clip.status === CLIP_STATUS.COMPLETED && (
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  )}
                  {clip.status === CLIP_STATUS.PROCESSING && (
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                  )}
                  {clip.status === CLIP_STATUS.PENDING && (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  {clip.status === CLIP_STATUS.FAILED && (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-mono truncate">
                      Scene {clip.sceneIndex + 1}: {formatTime(clip.startTime)} — {formatTime(clip.endTime)}
                    </div>
                    {clip.errorMessage && (
                      <div className="text-[10px] text-destructive truncate">{clip.errorMessage}</div>
                    )}
                  </div>
                </div>
                {clip.status === CLIP_STATUS.COMPLETED && clip.fileUrl && (
                  <a
                    href={`/api/clips/${clip.id}/download`}
                    download
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
