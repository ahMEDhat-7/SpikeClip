"use client";

import { memo } from "react";
import { X } from "lucide-react";
import type { StudioAction } from "@spikeclip/shared";
import { describeAction } from "@spikeclip/shared";

const ACTION_ICONS: Record<string, string> = {
  add_captions: "Aa",
  mix_audio: "♪",
  apply_effect: "✦",
  set_speed: "⚡",
  add_overlay: "◻",
  set_transition: "→",
  add_background: "■",
  trim: "✂",
};

const ACTION_LABELS: Record<string, string> = {
  add_captions: "Caption",
  mix_audio: "Audio Mix",
  apply_effect: "Effect",
  set_speed: "Speed",
  add_overlay: "Overlay",
  set_transition: "Transition",
  add_background: "Background",
  trim: "Trim",
};

interface ActionCardProps {
  action: StudioAction;
  index: number;
  onRemove: (index: number) => void;
}

export const ActionCard = memo(function ActionCard({ action, index, onRemove }: ActionCardProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border text-sm group">
      <span className="text-lg w-6 text-center">{ACTION_ICONS[action.action]}</span>
      <div className="flex-1 min-w-0">
        <span className="font-medium">{ACTION_LABELS[action.action]}</span>
        <span className="text-muted-foreground ml-2 text-xs truncate">
          {describeAction(action)}
        </span>
      </div>
      <button
        onClick={() => onRemove(index)}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"
        aria-label="Remove action"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
});
