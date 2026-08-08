import { StudioStep } from "@/domain/entities/studio";

export const STEP_LABELS: Record<StudioStep, string> = {
  platform: "Platform",
  scenes: "Scenes",
  chat: "Chat",
  captions: "Captions",
  music: "Music",
  templates: "Templates",
  export: "Export",
};

/* Cursor-inspired: AI Timeline pastel colors mapped to Studio steps */
export const STEP_TIMELINE_COLORS: Record<StudioStep, string> = {
  platform: "bg-timeline-thinking",
  scenes: "bg-timeline-read",
  chat: "bg-timeline-edit",
  captions: "bg-timeline-edit",
  music: "bg-timeline-grep",
  templates: "bg-timeline-thinking",
  export: "bg-timeline-done",
};
