"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, RotateCcw } from "lucide-react";

interface SceneAdjusterProps {
  sceneId: string;
  startTime: number;
  endTime: number;
  duration: number;
  onSave?: (data: { startTime: number; endTime: number }) => void;
  onReset?: () => void;
}

export function SceneAdjuster({ sceneId, startTime, endTime, duration, onSave, onReset }: SceneAdjusterProps) {
  const [newStart, setNewStart] = useState(startTime);
  const [newEnd, setNewEnd] = useState(endTime);
  const [hasChanges, setHasChanges] = useState(false);

  const handleStartChange = (value: number) => {
    const val = Math.max(0, Math.min(value, newEnd - 0.5));
    setNewStart(val);
    setHasChanges(true);
  };

  const handleEndChange = (value: number) => {
    const val = Math.max(newStart + 0.5, Math.min(value, duration));
    setNewEnd(val);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave?.({ startTime: newStart, endTime: newEnd });
    setHasChanges(false);
  };

  const handleReset = () => {
    setNewStart(startTime);
    setNewEnd(endTime);
    setHasChanges(false);
    onReset?.();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Adjust Scene</CardTitle>
          {hasChanges && <Badge variant="secondary">Modified</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Start Time (seconds)</label>
          <Input
            type="number"
            value={newStart.toFixed(1)}
            onChange={(e) => handleStartChange(parseFloat(e.target.value) || 0)}
            step={0.1}
            min={0}
            max={newEnd - 0.5}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">End Time (seconds)</label>
          <Input
            type="number"
            value={newEnd.toFixed(1)}
            onChange={(e) => handleEndChange(parseFloat(e.target.value) || 0)}
            step={0.1}
            min={newStart + 0.5}
            max={duration}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Duration: {(newEnd - newStart).toFixed(1)}s
          </span>
          {hasChanges && (
            <span className="text-yellow-500">
              {(newEnd - newStart) !== duration ? "Changed" : ""}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="mr-1 h-3 w-3" />
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
