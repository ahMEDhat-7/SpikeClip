"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Play, BarChart3, Download } from "lucide-react";

interface SceneItem {
  id: string;
  sourceId: string;
  startTime: number;
  endTime: number;
  duration: number;
  score: number | null;
  rank: number | null;
  status: string;
}

interface SceneResultsProps {
  scenes: SceneItem[];
  loading?: boolean;
  onRefresh?: () => void;
  onSelectScene?: (scene: SceneItem) => void;
  selectedSceneIds?: Set<string>;
  onToggleScene?: (sceneId: string) => void;
  onExport?: (sceneIds: string[]) => Promise<void>;
  exporting?: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 0.8) return "text-green-500";
  if (score >= 0.6) return "text-yellow-500";
  return "text-orange-500";
}

export function SceneResults({
  scenes,
  loading = false,
  onRefresh,
  onSelectScene,
  selectedSceneIds = new Set(),
  onToggleScene,
  onExport,
  exporting = false,
}: SceneResultsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">
          Scenes ({scenes.length})
        </CardTitle>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
          {onExport && selectedSceneIds.size > 0 && (
            <Button size="sm" onClick={() => onExport(Array.from(selectedSceneIds))} disabled={exporting}>
              {exporting ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Download className="mr-1 h-3 w-3" />
              )}
              Export {selectedSceneIds.size} Clip{selectedSceneIds.size !== 1 ? "s" : ""}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No scenes generated yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedSceneIds.size > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedSceneIds.size} selected for export
              </p>
            )}
            <div className="space-y-2">
              {scenes.map((scene) => {
                const isSelected = selectedSceneIds.has(scene.id);
                return (
                  <div
                    key={scene.id}
                    className={`flex items-center gap-3 rounded-md border p-3 transition-colors cursor-pointer hover:bg-accent ${
                      isSelected ? "border-primary bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      if (onToggleScene) {
                        onToggleScene(scene.id);
                      } else {
                        onSelectScene?.(scene);
                      }
                    }}
                  >
                    {onToggleScene && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleScene(scene.id)}
                        className="h-4 w-4 rounded border-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {scene.rank ?? "-"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {scene.duration.toFixed(1)}s
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${getScoreColor(scene.score)}`}>
                        {scene.score !== null ? (scene.score * 100).toFixed(0) : "-"}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
