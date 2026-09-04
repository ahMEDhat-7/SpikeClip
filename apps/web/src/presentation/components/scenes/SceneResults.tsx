"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Play, BarChart3 } from "lucide-react";

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

export function SceneResults({ scenes, loading = false, onRefresh, onSelectScene }: SceneResultsProps) {
  const selectedScenes = scenes.filter((s) => s.status === "selected");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">
          Scenes ({scenes.length})
        </CardTitle>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        )}
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
            <p className="text-sm text-muted-foreground">
              {selectedScenes.length} selected for export
            </p>
            <div className="space-y-2">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  className={`flex items-center gap-3 rounded-md border p-3 transition-colors cursor-pointer hover:bg-accent ${
                    scene.status === "selected" ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => onSelectScene?.(scene)}
                >
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
                    <Badge variant={scene.status === "selected" ? "default" : "secondary"}>
                      {scene.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
