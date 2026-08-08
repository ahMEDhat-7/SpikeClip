import type { StudioAction } from "@spikeclips/shared";

export interface TimelineState {
  scenes: Array<{
    id: string;
    startTime: number;
    endTime: number;
    selected: boolean;
  }>;
  captions: Array<{
    id: string;
    text: string;
    startFrame: number;
    endFrame: number;
    x: number;
    y: number;
    font: string;
    size: number;
    color: string;
    style: string;
  }>;
  actions: StudioAction[];
  currentSceneIndex: number;
  playbackPosition: number;
}

type TimelineAction =
  | { type: "ADD_SCENE"; scene: TimelineState["scenes"][0] }
  | { type: "REMOVE_SCENE"; sceneId: string }
  | { type: "UPDATE_SCENE"; sceneId: string; updates: Partial<TimelineState["scenes"][0]> }
  | { type: "SELECT_SCENE"; sceneId: string }
  | { type: "ADD_CAPTION"; caption: TimelineState["captions"][0] }
  | { type: "REMOVE_CAPTION"; captionId: string }
  | { type: "UPDATE_CAPTION"; captionId: string; updates: Partial<TimelineState["captions"][0]> }
  | { type: "SET_ACTIONS"; actions: StudioAction[] }
  | { type: "SET_PLAYBACK_POSITION"; position: number }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "RESET"; state: TimelineState };

interface HistoryEntry {
  state: TimelineState;
  timestamp: number;
}

export function timelineReducer(
  state: TimelineState,
  action: TimelineAction
): TimelineState {
  switch (action.type) {
    case "ADD_SCENE":
      return {
        ...state,
        scenes: [...state.scenes, action.scene],
      };

    case "REMOVE_SCENE":
      return {
        ...state,
        scenes: state.scenes.filter((s) => s.id !== action.sceneId),
      };

    case "UPDATE_SCENE":
      return {
        ...state,
        scenes: state.scenes.map((s) =>
          s.id === action.sceneId ? { ...s, ...action.updates } : s
        ),
      };

    case "SELECT_SCENE":
      return {
        ...state,
        scenes: state.scenes.map((s) => ({
          ...s,
          selected: s.id === action.sceneId,
        })),
        currentSceneIndex: state.scenes.findIndex(
          (s) => s.id === action.sceneId
        ),
      };

    case "ADD_CAPTION":
      return {
        ...state,
        captions: [...state.captions, action.caption],
      };

    case "REMOVE_CAPTION":
      return {
        ...state,
        captions: state.captions.filter((c) => c.id !== action.captionId),
      };

    case "UPDATE_CAPTION":
      return {
        ...state,
        captions: state.captions.map((c) =>
          c.id === action.captionId ? { ...c, ...action.updates } : c
        ),
      };

    case "SET_ACTIONS":
      return {
        ...state,
        actions: action.actions,
      };

    case "SET_PLAYBACK_POSITION":
      return {
        ...state,
        playbackPosition: action.position,
      };

    case "RESET":
      return action.state;

    default:
      return state;
  }
}

export class UndoRedoManager {
  private history: HistoryEntry[] = [];
  private currentIndex = -1;
  private maxHistory = 50;

  push(state: TimelineState): void {
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push({ state: structuredClone(state), timestamp: Date.now() });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  undo(): TimelineState | null {
    if (this.currentIndex <= 0) return null;
    this.currentIndex--;
    return structuredClone(this.history[this.currentIndex].state);
  }

  redo(): TimelineState | null {
    if (this.currentIndex >= this.history.length - 1) return null;
    this.currentIndex++;
    return structuredClone(this.history[this.currentIndex].state);
  }

  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}
