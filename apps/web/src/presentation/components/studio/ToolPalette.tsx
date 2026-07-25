"use client";

import { StudioStep } from "@/domain/entities/studio";
import { STEP_LABELS } from "@/presentation/constants/studio";
import {
  LayoutGrid,
  Film,
  MessageSquare,
  Type,
  Music,
  Sparkles,
  Download,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const TOOL_ICONS: Record<StudioStep, React.ElementType> = {
  platform: LayoutGrid,
  scenes: Film,
  chat: MessageSquare,
  captions: Type,
  music: Music,
  templates: Sparkles,
  export: Download,
};

const TOOLS: { step: StudioStep; icon: React.ElementType; label: string }[] = (
  Object.entries(STEP_LABELS) as [StudioStep, string][]
).map(([step, label]) => ({
  step,
  icon: TOOL_ICONS[step],
  label,
}));

interface ToolPaletteProps {
  currentStep: StudioStep;
  onStepChange: (step: StudioStep) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  canGoToStep?: (step: StudioStep) => boolean;
}

export function ToolPalette({ currentStep, onStepChange, expanded, onToggleExpand, canGoToStep }: ToolPaletteProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex flex-col gap-0.5 py-2 px-1.5 flex-1 overflow-hidden">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentStep === tool.step;
          const isAccessible = canGoToStep ? canGoToStep(tool.step) : true;

          return (
            <button
              key={tool.step}
              className={`relative flex items-center gap-2 rounded-lg transition-all ${
                expanded ? "px-2.5 py-2" : "justify-center px-0 py-2"
              } ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : isAccessible
                    ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                    : "text-muted-foreground/40 cursor-not-allowed"
              }`}
              onClick={() => isAccessible && onStepChange(tool.step)}
              disabled={!isAccessible}
              aria-label={tool.label}
              title={tool.label}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {expanded && (
                <span className="text-xs font-medium truncate">{tool.label}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-t p-1.5">
        <button
          className="flex items-center justify-center w-full py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          onClick={onToggleExpand}
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? (
            <ChevronsLeft className="h-4 w-4" />
          ) : (
            <ChevronsRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
