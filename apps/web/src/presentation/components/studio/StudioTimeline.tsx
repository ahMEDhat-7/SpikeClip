"use client";

import { memo } from "react";
import { ScoredBlock } from "@/domain/entities/job";
import { formatTime } from "@/lib/format";

interface StudioTimelineProps {
  scenes: ScoredBlock[];
  selectedScenes: number[];
  totalDuration: number;
  onToggleScene: (index: number) => void;
}

export const StudioTimeline = memo(function StudioTimeline({
  scenes,
  selectedScenes,
  totalDuration,
  onToggleScene,
}: StudioTimelineProps) {
  if (totalDuration <= 0 || scenes.length === 0) return null;

  return (
    <div className="px-3 py-1.5">
      <div className="relative h-7 bg-muted rounded overflow-hidden">
        {scenes.map((scene, i) => {
          const left = (scene.start_time / totalDuration) * 100;
          const width = ((scene.end_time - scene.start_time) / totalDuration) * 100;
          const isSelected = selectedScenes.includes(i);

          return (
            <button
              key={`${scene.start_time}-${scene.end_time}-${i}`}
              className={`absolute top-0 h-full rounded-sm transition-all flex items-center justify-center text-[9px] font-mono border border-transparent ${
                isSelected
                  ? "bg-primary/70 text-primary-foreground border-primary/50"
                  : "bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30"
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
              onClick={() => onToggleScene(i)}
              title={`Scene ${i + 1}: ${formatTime(scene.start_time)} — ${formatTime(scene.end_time)} (${scene.duration.toFixed(1)}s)`}
              aria-label={`Toggle scene ${i + 1}`}
            >
              {width > 4 && <span className="font-semibold">S{i + 1}</span>}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] font-mono text-muted-foreground px-0.5 mt-0.5">
        <span>{formatTime(0)}</span>
        <span>{formatTime(totalDuration)}</span>
      </div>
    </div>
  );
});
