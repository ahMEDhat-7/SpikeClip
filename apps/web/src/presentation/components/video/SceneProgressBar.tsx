"use client";

import { useCallback, useRef } from "react";
import { formatTime } from "@/lib/format";

interface SceneMarker {
  startTime: number;
  endTime: number;
  color?: string;
  label?: string;
}

interface SceneProgressBarProps {
  currentTime: number;
  duration: number;
  scenes: SceneMarker[];
  onSeek?: (time: number) => void;
  onSceneClick?: (index: number) => void;
  selectedSceneIndex?: number;
}

const DEFAULT_COLORS = [
  "#FF6B35",
  "#E63946",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
];

export function SceneProgressBar({
  currentTime,
  duration,
  scenes,
  onSeek,
  onSceneClick,
  selectedSceneIndex,
}: SceneProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!barRef.current || !onSeek || duration <= 0) return;
      const rect = barRef.current.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      onSeek(fraction * duration);
    },
    [duration, onSeek]
  );

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full px-2 py-1">
      <div
        ref={barRef}
        className="relative h-6 rounded-full bg-muted/30 cursor-pointer group overflow-hidden"
        onClick={handleClick}
      >
        {scenes.map((scene, i) => {
          const startPercent = duration > 0 ? (scene.startTime / duration) * 100 : 0;
          const widthPercent = duration > 0 ? ((scene.endTime - scene.startTime) / duration) * 100 : 0;
          const color = scene.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          const isSelected = selectedSceneIndex === i;

          return (
            <div
              key={i}
              className="absolute top-0 h-full transition-opacity duration-150"
              style={{
                left: `${startPercent}%`,
                width: `${widthPercent}%`,
                backgroundColor: color,
                opacity: isSelected ? 0.5 : 0.3,
                borderRight: i < scenes.length - 1 ? "1px solid rgba(255,255,255,0.2)" : undefined,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSceneClick?.(i);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = isSelected ? "0.5" : "0.3";
              }}
            >
              {isSelected && (
                <div
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: "4px solid transparent",
                    borderRight: "4px solid transparent",
                    borderTop: `4px solid ${color}`,
                  }}
                />
              )}
            </div>
          );
        })}

        <div
          className="absolute top-0 h-full bg-white/10 pointer-events-none"
          style={{ width: `${progressPercent}%` }}
        />

        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md border-2 border-primary pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progressPercent}% - 6px)` }}
        />
      </div>

      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] font-mono text-muted-foreground">
          {formatTime(currentTime)}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
