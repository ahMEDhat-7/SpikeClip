"use client";

import { memo, useCallback } from "react";
import { Undo2, Redo2, Trash2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionCard } from "./ActionCard";
import { cn } from "@/lib/utils";
import type { StudioAction } from "@spikeclip/shared";

interface ActionListPanelProps {
  actions: StudioAction[];
  onRemoveAction: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport?: () => void;
  isExporting?: boolean;
  sceneLabel?: string;
}

export const ActionListPanel = memo(function ActionListPanel({
  actions,
  onRemoveAction,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  isExporting = false,
  sceneLabel,
}: ActionListPanelProps) {
  const handleClearAll = useCallback(() => {
    if (window.confirm("Remove all actions?")) {
      actions.forEach((_, i) => onRemoveAction(0));
    }
  }, [actions, onRemoveAction]);

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Actions</span>
          {sceneLabel && (
            <span className="text-[11px] text-muted-foreground">{sceneLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          {actions.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClearAll}
              title="Clear all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
            <p className="text-xs">No actions applied yet</p>
            <p className="text-[11px] mt-1">
              Use the AI chat to describe edits
            </p>
          </div>
        ) : (
          actions.map((action, i) => (
            <ActionCard key={i} action={action} index={i} onRemove={onRemoveAction} />
          ))
        )}
      </div>

      {onExport && (
        <div className="px-3 py-3 border-t">
          <Button
            onClick={onExport}
            disabled={isExporting || actions.length === 0}
            className="w-full"
            size="sm"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-3.5 w-3.5" />
                Export Clip
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
});
