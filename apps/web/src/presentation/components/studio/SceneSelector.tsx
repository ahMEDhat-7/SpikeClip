"use client";

import { ScoredBlock } from "@/domain/entities/job";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Film } from "lucide-react";
import { formatTime } from "@/lib/format";
import { TimeRangeSelector } from "./TimeRangeSelector";

interface SceneSelectorProps {
  scenes: ScoredBlock[];
  videoDuration?: number;
  onEdit: (start: number, end: number) => void;
}

export function SceneSelector({
  scenes,
  videoDuration = 0,
  onEdit,
}: SceneSelectorProps) {
  if (scenes.length === 0 && !videoDuration) {
    return (
      <div className="space-y-2">
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Film className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              No scenes were detected. Try a different video.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {videoDuration > 0 && (
        <TimeRangeSelector videoDuration={videoDuration} onApply={(start, end) => onEdit(start, end)} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
        {scenes.map((scene, i) => (
          <Card
            key={`${scene.start_time}-${scene.end_time}-${i}`}
            className="group transition-all hover:border-muted-foreground/30 hover:bg-muted/30"
          >
            <CardContent className="p-2.5">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">Scene {i + 1}</span>
                    <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">
                      {scene.duration.toFixed(1)}s
                    </Badge>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {formatTime(scene.start_time)} — {formatTime(scene.end_time)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-secondary to-primary rounded-full"
                      style={{ width: `${scene.peak_intensity * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">
                    {(scene.peak_intensity * 100).toFixed(0)}%
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs shrink-0 opacity-80 group-hover:opacity-100"
                  onClick={() => onEdit(scene.start_time, scene.end_time)}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
