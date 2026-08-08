"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical } from "lucide-react";
import { EditableScene } from "@/application/hooks/use-scene-editor";
import { formatTime, parseTimeInput } from "@/lib/format";

interface EditableSceneCardProps {
  scene: EditableScene;
  index: number;
  onUpdate: (index: number, field: "start_time" | "end_time", time: number) => void;
  onRemove: (index: number) => void;
}

export function EditableSceneCard({ scene, index, onUpdate, onRemove }: EditableSceneCardProps) {
  const duration = scene.end_time - scene.start_time;

  return (
    <Card className={`transition-all ${scene.isCustom ? "border-green-500/30 bg-green-500/5 dark:border-green-500/20 dark:bg-green-500/5" : "border-orange-500/30 bg-orange-500/5 dark:border-orange-500/20 dark:bg-orange-500/5"}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="secondary"
                className={`text-xs font-mono ${scene.isCustom ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-orange-500/10 text-orange-600 dark:text-orange-400"}`}
              >
                {scene.isCustom ? "Custom" : "Suggested"}
              </Badge>
              <Badge variant="secondary" className="font-mono text-xs">
                {duration.toFixed(1)}s
              </Badge>
              {scene.peak_intensity > 0 && (
                <Badge variant="outline" className="font-mono text-xs">
                  {(scene.peak_intensity * 100).toFixed(0)}%
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Start</label>
              <input
                type="text"
                defaultValue={formatTime(scene.start_time)}
                onBlur={(e) => {
                  const t = parseTimeInput(e.target.value);
                  if (t !== null) onUpdate(index, "start_time", t);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-16 px-2 py-1 text-xs font-mono border rounded bg-background"
              />
              <span className="text-muted-foreground">→</span>
              <label className="text-xs text-muted-foreground">End</label>
              <input
                type="text"
                defaultValue={formatTime(scene.end_time)}
                onBlur={(e) => {
                  const t = parseTimeInput(e.target.value);
                  if (t !== null) onUpdate(index, "end_time", t);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-16 px-2 py-1 text-xs font-mono border rounded bg-background"
              />
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
