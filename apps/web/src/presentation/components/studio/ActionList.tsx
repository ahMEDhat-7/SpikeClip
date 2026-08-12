"use client";

import type { StudioAction } from "@spikeclips/shared";
import { ActionCard } from "./ActionCard";
import { Undo2, Redo2 } from "lucide-react";

interface ActionListProps {
  actions: StudioAction[];
  onRemove: (index: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  revisionDepth?: number;
}

export function ActionList({
  actions,
  onRemove,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  revisionDepth = 0,
}: ActionListProps) {
  if (actions.length === 0) return null;

  return (
    <div className="border-t p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Applied Actions ({actions.length})
          {revisionDepth > 0 && (
            <span className="ml-1 normal-case tracking-normal text-[10px] text-muted-foreground/70">
              · {revisionDepth} {revisionDepth === 1 ? "edit" : "edits"} undone-able
            </span>
          )}
        </h4>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action, index) => (
          <ActionCard
            key={`${action.action}-${index}`}
            action={action}
            index={index}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
