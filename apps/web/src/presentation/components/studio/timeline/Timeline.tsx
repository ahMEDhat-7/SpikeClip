"use client";

import { useRef, useState, useCallback, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Undo2,
  Redo2,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { formatTime } from "@/lib/format";
import { UndoRedoManager, type TimelineState } from "./timeline-state";
import type { ScoredBlock } from "@spikeclips/shared";

interface TimelineProps {
  scenes: ScoredBlock[];
  selectedScenes: number[];
  currentSceneIndex: number | null;
  onSceneSelect?: (index: number) => void;
  onSceneAdd?: (startTime: number, endTime: number) => void;
  onSceneRemove?: (index: number) => void;
  onSceneReorder?: (fromIndex: number, toIndex: number) => void;
  totalDuration: number;
}

export const Timeline = memo(function Timeline({
  scenes,
  selectedScenes,
  currentSceneIndex,
  onSceneSelect,
  onSceneAdd,
  onSceneRemove,
  onSceneReorder,
  totalDuration,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<TimelineState>({
    scenes: [],
    captions: [],
    actions: [],
    currentSceneIndex: 0,
    playbackPosition: 0,
  });
  const [historyManager] = useState(() => new UndoRedoManager<TimelineState>(history));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    const state: TimelineState = {
      scenes: scenes.map((s, i) => ({
        id: `scene-${i}`,
        startTime: s.start_time,
        endTime: s.end_time,
        selected: selectedScenes.includes(i),
      })),
      captions: [],
      actions: [],
      currentSceneIndex: currentSceneIndex ?? 0,
      playbackPosition: 0,
    };
    historyManager.push(state);
    setHistory(state);
  }, [scenes, selectedScenes, currentSceneIndex, historyManager]);

  const handleUndo = useCallback(() => {
    const prev = historyManager.undo();
    if (prev) {
      setHistory(prev);
      setCanUndo(historyManager.canUndo());
      setCanRedo(historyManager.canRedo());
    }
  }, [historyManager]);

  const handleRedo = useCallback(() => {
    const next = historyManager.redo();
    if (next) {
      setHistory(next);
      setCanUndo(historyManager.canUndo());
      setCanRedo(historyManager.canRedo());
    }
  }, [historyManager]);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      setDragOverIndex(index);
    },
    []
  );

  const handleDrop = useCallback(
    (index: number) => {
      if (dragIndex !== null && dragIndex !== index) {
        onSceneReorder?.(dragIndex, index);
      }
      setDragIndex(null);
      setDragOverIndex(null);
    },
    [dragIndex, onSceneReorder]
  );

  const pixelsPerSecond = totalDuration > 0 ? 800 / totalDuration : 10;

  return (
    <div className="flex flex-col h-full border-t bg-muted/30">
      <div className="flex items-center justify-between px-3 py-1.5 border-b">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleUndo}
            disabled={!canUndo}
          >
            <Undo2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleRedo}
            disabled={!canRedo}
          >
            <Redo2 className="h-3 w-3" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => {
              const lastScene = scenes[scenes.length - 1];
              const newStart = lastScene ? lastScene.end_time + 1 : 0;
              const newEnd = newStart + 5;
              onSceneAdd?.(newStart, newEnd);
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {scenes.length} scene{scenes.length !== 1 ? "s" : ""} ·{" "}
          {formatTime(totalDuration)}
        </span>
      </div>

      <div
        ref={timelineRef}
        className="flex-1 overflow-x-auto overflow-y-hidden px-3 py-2"
      >
        <div
          className="flex gap-1 h-full min-w-max items-end"
          style={{ minWidth: totalDuration * pixelsPerSecond + 40 }}
        >
          {scenes.map((scene, i) => {
            const width = (scene.end_time - scene.start_time) * pixelsPerSecond;
            const isSelected = selectedScenes.includes(i);
            const isCurrent = currentSceneIndex === i;
            const isDragOver = dragOverIndex === i;

            return (
              <div
                key={`scene-${i}`}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                className={`
                  relative flex-shrink-0 rounded-md border cursor-pointer transition-all
                  ${isSelected ? "border-primary bg-primary/10" : "border-border bg-muted/50 hover:bg-muted"}
                  ${isCurrent ? "ring-1 ring-primary" : ""}
                  ${isDragOver ? "border-dashed border-primary" : ""}
                  ${dragIndex === i ? "opacity-50" : ""}
                `}
                style={{ width: Math.max(width, 60), minHeight: 48 }}
                onClick={() => onSceneSelect?.(i)}
              >
                <div className="absolute top-1 left-1 cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-3 w-3 text-muted-foreground" />
                </div>

                <div className="flex flex-col items-center justify-center h-full px-2 py-1">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    S{i + 1}
                  </span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {formatTime(scene.start_time)} —{" "}
                    {formatTime(scene.end_time)}
                  </span>
                  <span className="text-[9px] text-primary font-medium">
                    {(scene.end_time - scene.start_time).toFixed(1)}s
                  </span>
                </div>

                {scenes.length > 1 && (
                  <button
                    className="absolute top-1 right-1 h-4 w-4 flex items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSceneRemove?.(i);
                    }}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                )}

                <div
                  className="absolute bottom-0 left-0 right-0 h-1 rounded-b-md"
                  style={{
                    background: `linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary) ${
                      ((scene.end_time - scene.start_time) / totalDuration) * 100
                    }%, transparent ${
                      ((scene.end_time - scene.start_time) / totalDuration) * 100
                    }%)`,
                    opacity: 0.3,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
