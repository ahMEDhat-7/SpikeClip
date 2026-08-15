import { StudioStep } from "@/domain/entities/studio";

export const STEP_LABELS: Record<StudioStep, string> = {
  platform: "Platform",
  scenes: "Scenes",
  chat: "Chat",
  export: "Export",
};

/* Cursor-inspired: AI Timeline pastel colors mapped to Studio steps */
export const STEP_TIMELINE_COLORS: Record<StudioStep, string> = {
  platform: "bg-timeline-thinking",
  scenes: "bg-timeline-read",
  chat: "bg-timeline-edit",
  export: "bg-timeline-done",
};
