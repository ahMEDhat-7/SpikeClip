"use client";

import { useState, useCallback } from "react";
import { ScoredBlock, HeatmapSpike } from "@/domain/entities/job";
import { EditableScene, useSceneEditor } from "@/application/hooks/use-scene-editor";
import { HeatmapChart } from "@/presentation/components/heatmap/HeatmapChart";
import { EditableSceneCard } from "./EditableSceneCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RotateCcw, Scissors, Loader2 } from "lucide-react";
import { formatTime } from "@/lib/format";

interface SceneEditorProps {
  heatmap: HeatmapSpike[];
  suggestedScenes: ScoredBlock[];
  scenesLimit: number;
  onSceneSelect?: (index: number) => void;
  onScenesChange?: (scenes: EditableScene[]) => void;
  showExport?: boolean;
  onExport?: (scenes: Array<{ start_time: number; end_time: number; peak_intensity?: number }>) => void;
  isExporting?: boolean;
}

export function SceneEditor({
  heatmap,
  suggestedScenes,
  scenesLimit,
  showExport = false,
  onExport,
  isExporting = false,
  onSceneSelect,
  onScenesChange,
}: SceneEditorProps) {
  const {
    scenes,
    addMode,
    addStart,
    canAddMore,
    totalDuration,
    startAddScene,
    finishAddScene,
    cancelAddScene,
    updateSceneTime,
    removeScene,
    resetToSuggestions,
  } = useSceneEditor(suggestedScenes, scenesLimit, onScenesChange);

  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const handleChartClick = useCallback(
    (time: number) => {
      if (!canAddMore && addMode === "idle") return;
      if (addMode === "idle") {
        startAddScene(time);
      } else {
        finishAddScene(time);
      }
    },
    [addMode, canAddMore, startAddScene, finishAddScene]
  );

  const handleChartMouseMove = useCallback((time: number | null) => {
    setHoverTime(time);
  }, []);

  const handleExport = useCallback(() => {
    if (!onExport) return;
    onExport(
      scenes.map((s) => ({
        start_time: s.start_time,
        end_time: s.end_time,
        peak_intensity: s.peak_intensity > 0 ? s.peak_intensity : undefined,
      }))
    );
  }, [scenes, onExport]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Scene Editor</h3>
          <Badge variant="secondary" className="font-mono">
            {scenes.length}/{scenesLimit}
          </Badge>
        </div>
        <div className="flex gap-2">
          {addMode === "waiting_for_end" ? (
            <Button variant="outline" size="sm" onClick={cancelAddScene}>
              Cancel
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (hoverTime !== null) startAddScene(hoverTime);
              }}
              disabled={!canAddMore}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Scene
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={resetToSuggestions}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {addMode === "waiting_for_end" && (
        <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg dark:text-green-400 dark:bg-green-950 dark:border-green-800 font-mono">
          Click on the chart to set the end time (start: {formatTime(addStart ?? 0)})
        </div>
      )}

      <div className="w-full h-[200px] sm:h-[280px] relative rounded-xl border border-hairline bg-gradient-to-b from-card/80 to-card p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-300 animate-in fade-in zoom-in-95 duration-500">
        <div className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-gradient-to-r from-[#E63946] via-[#FF6B35] to-[#E63946] opacity-60" />
        <HeatmapChart
          heatmap={heatmap}
          scenes={scenes.map((s) => ({
            start_time: s.start_time,
            end_time: s.end_time,
            duration: s.end_time - s.start_time,
            peak_intensity: s.peak_intensity,
            avg_intensity: 0,
            score: s.score,
            confidence: "high" as const,
            capped: false,
          }))}
          interactive={canAddMore || addMode === "waiting_for_end"}
          addStartMarker={addMode === "waiting_for_end" ? addStart : null}
          hoverTime={hoverTime}
          onChartClick={handleChartClick}
          onChartMouseMove={handleChartMouseMove}
        />
      </div>

      <div className="space-y-2">
        {scenes.map((scene, i) => (
          <div key={`${scene.start_time}-${scene.end_time}-${scene.isCustom}`} onClick={() => onSceneSelect?.(i)}>
            <EditableSceneCard
              scene={scene}
              index={i}
              onUpdate={updateSceneTime}
              onRemove={removeScene}
            />
          </div>
        ))}
      </div>

      {showExport && scenes.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {scenes.length} clips
            </Badge>
            <span className="text-sm font-mono text-muted-foreground">
              {totalDuration.toFixed(1)}s total
            </span>
          </div>
          <Button onClick={handleExport} disabled={isExporting || scenes.length === 0}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Scissors className="h-4 w-4 mr-2" />
                Export {scenes.length} Clips
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
