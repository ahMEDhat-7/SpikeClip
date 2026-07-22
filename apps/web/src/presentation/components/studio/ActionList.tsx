"use client";

import type { StudioAction } from "@spikeclips/shared";
import { ActionCard } from "./ActionCard";

interface ActionListProps {
  actions: StudioAction[];
  onRemove: (index: number) => void;
}

export function ActionList({ actions, onRemove }: ActionListProps) {
  if (actions.length === 0) return null;

  return (
    <div className="border-t p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Applied Actions ({actions.length})
        </h4>
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
