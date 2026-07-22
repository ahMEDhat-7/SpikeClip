"use client";

import { useReducer, useCallback, useMemo } from "react";
import { Platform } from "@/domain/entities/platform";
import { Caption, createCaption } from "@/domain/entities/caption";
import { MusicTrack } from "@/domain/entities/music";
import { EditTemplate } from "@/domain/entities/template";
import { ScoredBlock } from "@/domain/entities/job";
import { StudioStep, STUDIO_STEPS } from "@/domain/entities/studio";
import { OutputFormat, OutputQuality, DEFAULT_OUTPUT_FORMAT, DEFAULT_OUTPUT_QUALITY } from "@/domain/entities/export";
import type { StudioAction as StudioActionType } from "@spikeclips/shared";

export interface ChatMessage {
  id: string;
  role: "user" | "system";
  content: string;
  timestamp: Date;
}

export interface SceneEditState {
  captions: Caption[];
  musicTrack: MusicTrack | null;
  originalVolume: number;
  selectedTemplate: EditTemplate | null;
  studioActions: StudioActionType[];
  previewUrl: string | null;
  previewLoading: boolean;
  previewError: string | null;
}

export interface StudioState {
  platform: Platform | null;
  scenes: ScoredBlock[];
  selectedSceneIndex: number | null;
  sceneEdits: Map<number, SceneEditState>;
  currentStep: StudioStep;
  outputFormat: OutputFormat;
  outputQuality: OutputQuality;
  customTimeRange: { start: number; end: number } | null;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
}

type StudioAction =
  | { type: "SET_PLATFORM"; platform: Platform | null }
  | { type: "SET_STEP"; step: StudioStep }
  | { type: "SET_OUTPUT_FORMAT"; format: OutputFormat }
  | { type: "SET_OUTPUT_QUALITY"; quality: OutputQuality }
  | { type: "INIT_FROM_JOB"; scenes: ScoredBlock[] }
  | { type: "SELECT_SCENE"; index: number }
  | { type: "ADD_CUSTOM_SCENE"; scene: ScoredBlock; replace: boolean; start: number; end: number }
  | { type: "UPDATE_SCENE_EDIT"; index: number; updates: Partial<SceneEditState> }
  | { type: "ADD_CAPTION"; index: number; caption: Caption }
  | { type: "UPDATE_CAPTION"; index: number; id: string; updates: Partial<Caption> }
  | { type: "REMOVE_CAPTION"; index: number; id: string }
  | { type: "SET_MUSIC"; index: number; track: MusicTrack | null }
  | { type: "SET_ORIGINAL_VOLUME"; index: number; volume: number }
  | { type: "SET_TEMPLATE"; index: number; template: EditTemplate | null }
  | { type: "ADD_CHAT_MESSAGE"; message: ChatMessage }
  | { type: "SET_CHAT_LOADING"; loading: boolean }
  | { type: "SET_STUDIO_ACTIONS"; index: number; actions: StudioActionType[] }
  | { type: "ADD_STUDIO_ACTION"; index: number; action: StudioActionType }
  | { type: "REMOVE_STUDIO_ACTION"; index: number; actionIndex: number }
  | { type: "SET_PREVIEW_URL"; index: number; url: string | null }
  | { type: "SET_PREVIEW_LOADING"; index: number; loading: boolean }
  | { type: "SET_PREVIEW_ERROR"; index: number; error: string | null }
  | { type: "RESET" };

const STEPS = STUDIO_STEPS;

function createDefaultSceneEdit(): SceneEditState {
  return {
    captions: [],
    musicTrack: null,
    originalVolume: 1,
    selectedTemplate: null,
    studioActions: [],
    previewUrl: null,
    previewLoading: false,
    previewError: null,
  };
}

const initialState: StudioState = {
  platform: null,
  scenes: [],
  selectedSceneIndex: null,
  sceneEdits: new Map(),
  currentStep: "platform",
  outputFormat: DEFAULT_OUTPUT_FORMAT,
  outputQuality: DEFAULT_OUTPUT_QUALITY,
  customTimeRange: null,
  chatMessages: [],
  chatLoading: false,
};

function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case "SET_PLATFORM":
      return { ...state, platform: action.platform };

    case "SET_STEP":
      return { ...state, currentStep: action.step };

    case "SET_OUTPUT_FORMAT":
      return { ...state, outputFormat: action.format };

    case "SET_OUTPUT_QUALITY":
      return { ...state, outputQuality: action.quality };

    case "INIT_FROM_JOB": {
      return {
        ...state,
        scenes: action.scenes,
        selectedSceneIndex: null,
        sceneEdits: new Map(),
      };
    }

    case "SELECT_SCENE": {
      const nextEdits = new Map(state.sceneEdits);
      if (!nextEdits.has(action.index)) {
        nextEdits.set(action.index, createDefaultSceneEdit());
      }
      return {
        ...state,
        selectedSceneIndex: action.index,
        sceneEdits: nextEdits,
      };
    }

    case "ADD_CUSTOM_SCENE": {
      const customScene = action.scene;
      if (action.replace) {
        return {
          ...state,
          scenes: [customScene],
          selectedSceneIndex: 0,
          sceneEdits: new Map([[0, createDefaultSceneEdit()]]),
          currentStep: "captions",
          customTimeRange: { start: action.start, end: action.end },
        };
      }
      const nextIndex = state.scenes.length;
      const nextScenes = [...state.scenes, customScene];
      const nextEdits = new Map(state.sceneEdits);
      nextEdits.set(nextIndex, createDefaultSceneEdit());
      return {
        ...state,
        scenes: nextScenes,
        selectedSceneIndex: nextIndex,
        sceneEdits: nextEdits,
      };
    }

    case "UPDATE_SCENE_EDIT": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, { ...existing, ...action.updates });
      return { ...state, sceneEdits: nextEdits };
    }

    case "ADD_CAPTION": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, {
        ...existing,
        captions: [...existing.captions, action.caption],
      });
      return { ...state, sceneEdits: nextEdits };
    }

    case "UPDATE_CAPTION": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, {
        ...existing,
        captions: existing.captions.map((c) =>
          c.id === action.id ? { ...c, ...action.updates } : c
        ),
      });
      return { ...state, sceneEdits: nextEdits };
    }

    case "REMOVE_CAPTION": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, {
        ...existing,
        captions: existing.captions.filter((c) => c.id !== action.id),
      });
      return { ...state, sceneEdits: nextEdits };
    }

    case "SET_MUSIC": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, { ...existing, musicTrack: action.track });
      return { ...state, sceneEdits: nextEdits };
    }

    case "SET_ORIGINAL_VOLUME": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, { ...existing, originalVolume: action.volume });
      return { ...state, sceneEdits: nextEdits };
    }

    case "SET_TEMPLATE": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, { ...existing, selectedTemplate: action.template });
      return { ...state, sceneEdits: nextEdits };
    }

    case "ADD_CHAT_MESSAGE":
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.message],
      };

    case "SET_CHAT_LOADING":
      return { ...state, chatLoading: action.loading };

    case "SET_STUDIO_ACTIONS": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, { ...existing, studioActions: action.actions });
      return { ...state, sceneEdits: nextEdits };
    }

    case "ADD_STUDIO_ACTION": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, {
        ...existing,
        studioActions: [...existing.studioActions, action.action],
      });
      return { ...state, sceneEdits: nextEdits };
    }

    case "REMOVE_STUDIO_ACTION": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, {
        ...existing,
        studioActions: existing.studioActions.filter((_, i) => i !== action.actionIndex),
      });
      return { ...state, sceneEdits: nextEdits };
    }

    case "SET_PREVIEW_URL": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, { ...existing, previewUrl: action.url });
      return { ...state, sceneEdits: nextEdits };
    }

    case "SET_PREVIEW_LOADING": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, { ...existing, previewLoading: action.loading });
      return { ...state, sceneEdits: nextEdits };
    }

    case "SET_PREVIEW_ERROR": {
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(action.index) ?? createDefaultSceneEdit();
      nextEdits.set(action.index, { ...existing, previewError: action.error });
      return { ...state, sceneEdits: nextEdits };
    }

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

export function useStudio() {
  const [state, dispatch] = useReducer(studioReducer, initialState);

  const { platform, scenes, selectedSceneIndex, sceneEdits, currentStep, outputFormat, outputQuality, customTimeRange } = state;

  const currentStepIndex = STEPS.indexOf(currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const canGoNext = useMemo(() => {
    if (currentStep === "platform") return platform !== null;
    if (currentStep === "scenes") return selectedSceneIndex !== null;
    return true;
  }, [currentStep, platform, selectedSceneIndex]);

  const canGoPrev = currentStepIndex > 0;

  const canGoToStep = useCallback((step: StudioStep): boolean => {
    if (step === "platform") return true;
    if (step === "scenes") return platform !== null;
    return selectedSceneIndex !== null;
  }, [platform, selectedSceneIndex]);

  const currentSceneEdit = useMemo(
    () => (selectedSceneIndex !== null ? sceneEdits.get(selectedSceneIndex) ?? createDefaultSceneEdit() : null),
    [selectedSceneIndex, sceneEdits]
  );

  const goNext = useCallback(() => {
    if (canGoNext && !isLastStep) {
      dispatch({ type: "SET_STEP", step: STEPS[currentStepIndex + 1] });
    }
  }, [canGoNext, isLastStep, currentStepIndex]);

  const goPrev = useCallback(() => {
    if (canGoPrev) {
      dispatch({ type: "SET_STEP", step: STEPS[currentStepIndex - 1] });
    }
  }, [canGoPrev, currentStepIndex]);

  const goToStep = useCallback((step: StudioStep) => {
    if (canGoToStep(step)) {
      dispatch({ type: "SET_STEP", step });
    }
  }, [canGoToStep]);

  const setPlatform = useCallback((platform: Platform | null) => {
    dispatch({ type: "SET_PLATFORM", platform });
  }, []);

  const initFromJob = useCallback((jobScenes: ScoredBlock[]) => {
    dispatch({ type: "INIT_FROM_JOB", scenes: jobScenes });
  }, []);

  const selectScene = useCallback((index: number) => {
    dispatch({ type: "SELECT_SCENE", index });
  }, []);

  const addCaption = useCallback((caption?: Partial<Caption>) => {
    if (selectedSceneIndex === null) return;
    const newCaption = createCaption({ ...caption, sceneIndex: selectedSceneIndex });
    dispatch({ type: "ADD_CAPTION", index: selectedSceneIndex, caption: newCaption });
  }, [selectedSceneIndex]);

  const updateCaption = useCallback((id: string, updates: Partial<Caption>) => {
    if (selectedSceneIndex === null) return;
    dispatch({ type: "UPDATE_CAPTION", index: selectedSceneIndex, id, updates });
  }, [selectedSceneIndex]);

  const removeCaption = useCallback((id: string) => {
    if (selectedSceneIndex === null) return;
    dispatch({ type: "REMOVE_CAPTION", index: selectedSceneIndex, id });
  }, [selectedSceneIndex]);

  const setMusic = useCallback((track: MusicTrack | null) => {
    if (selectedSceneIndex === null) return;
    dispatch({ type: "SET_MUSIC", index: selectedSceneIndex, track });
  }, [selectedSceneIndex]);

  const setOriginalVolume = useCallback((volume: number) => {
    if (selectedSceneIndex === null) return;
    dispatch({ type: "SET_ORIGINAL_VOLUME", index: selectedSceneIndex, volume });
  }, [selectedSceneIndex]);

  const selectTemplate = useCallback((template: EditTemplate | null) => {
    if (selectedSceneIndex === null) return;
    dispatch({ type: "SET_TEMPLATE", index: selectedSceneIndex, template });
  }, [selectedSceneIndex]);

  const setOutputFormat = useCallback((format: OutputFormat) => {
    dispatch({ type: "SET_OUTPUT_FORMAT", format });
  }, []);

  const setOutputQuality = useCallback((quality: OutputQuality) => {
    dispatch({ type: "SET_OUTPUT_QUALITY", quality });
  }, []);

  const addCustomScene = useCallback((start: number, end: number, replace = true) => {
    const duration = end - start;
    const customScene: ScoredBlock = {
      start_time: start,
      end_time: end,
      duration,
      peak_intensity: 1,
      avg_intensity: 0.8,
      score: 1,
      confidence: "high",
      capped: false,
    };
    dispatch({ type: "ADD_CUSTOM_SCENE", scene: customScene, replace, start, end });
  }, []);

  const addChatMessage = useCallback((message: ChatMessage) => {
    dispatch({ type: "ADD_CHAT_MESSAGE", message });
  }, []);

  const setChatLoading = useCallback((loading: boolean) => {
    dispatch({ type: "SET_CHAT_LOADING", loading });
  }, []);

  const studioActions = useMemo(
    () => (selectedSceneIndex !== null ? sceneEdits.get(selectedSceneIndex)?.studioActions ?? [] : []),
    [selectedSceneIndex, sceneEdits]
  );

  const setStudioActions = useCallback((actions: StudioActionType[]) => {
    if (selectedSceneIndex === null) return;
    dispatch({ type: "SET_STUDIO_ACTIONS", index: selectedSceneIndex, actions });
  }, [selectedSceneIndex]);

  const addStudioAction = useCallback((action: StudioActionType) => {
    if (selectedSceneIndex === null) return;
    dispatch({ type: "ADD_STUDIO_ACTION", index: selectedSceneIndex, action });
  }, [selectedSceneIndex]);

  const removeStudioAction = useCallback((actionIndex: number) => {
    if (selectedSceneIndex === null) return;
    dispatch({ type: "REMOVE_STUDIO_ACTION", index: selectedSceneIndex, actionIndex });
  }, [selectedSceneIndex]);

  const previewUrl = useMemo(
    () => (selectedSceneIndex !== null ? sceneEdits.get(selectedSceneIndex)?.previewUrl ?? null : null),
    [selectedSceneIndex, sceneEdits]
  );

  const previewLoading = useMemo(
    () => (selectedSceneIndex !== null ? sceneEdits.get(selectedSceneIndex)?.previewLoading ?? false : false),
    [selectedSceneIndex, sceneEdits]
  );

  const previewError = useMemo(
    () => (selectedSceneIndex !== null ? sceneEdits.get(selectedSceneIndex)?.previewError ?? null : null),
    [selectedSceneIndex, sceneEdits]
  );

  const setPreviewUrl = useCallback((url: string | null) => {
    if (selectedSceneIndex === null) return;
    dispatch({ type: "SET_PREVIEW_URL", index: selectedSceneIndex, url });
  }, [selectedSceneIndex]);

  const setPreviewLoading = useCallback((loading: boolean) => {
    if (selectedSceneIndex === null) return;
    dispatch({ type: "SET_PREVIEW_LOADING", index: selectedSceneIndex, loading });
  }, [selectedSceneIndex]);

  const setPreviewError = useCallback((error: string | null) => {
    if (selectedSceneIndex === null) return;
    dispatch({ type: "SET_PREVIEW_ERROR", index: selectedSceneIndex, error });
  }, [selectedSceneIndex]);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return {
    platform,
    setPlatform,
    scenes,
    selectedSceneIndex,
    selectedScenes: selectedSceneIndex !== null ? [selectedSceneIndex] : [],
    currentSceneEdit,
    sceneEdits,
    captions: currentSceneEdit?.captions ?? [],
    musicTrack: currentSceneEdit?.musicTrack ?? null,
    originalVolume: currentSceneEdit?.originalVolume ?? 1,
    selectedTemplate: currentSceneEdit?.selectedTemplate ?? null,
    studioActions,
    previewUrl,
    previewLoading,
    previewError,
    currentStep,
    currentStepIndex,
    steps: STEPS,
    canGoNext,
    canGoPrev,
    canGoToStep,
    isFirstStep,
    isLastStep,
    goNext,
    goPrev,
    goToStep,
    initFromJob,
    selectScene,
    addCaption,
    updateCaption,
    removeCaption,
    setMusic,
    setOriginalVolume,
    selectTemplate,
    outputFormat,
    setOutputFormat,
    outputQuality,
    setOutputQuality,
    customTimeRange,
    addCustomScene,
    chatMessages,
    chatLoading,
    addChatMessage,
    setChatLoading,
    setStudioActions,
    addStudioAction,
    removeStudioAction,
    setPreviewUrl,
    setPreviewLoading,
    setPreviewError,
    reset,
  };
}
