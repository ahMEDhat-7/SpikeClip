"use client";

import { useReducer, useCallback, useMemo, useRef, useEffect } from "react";
import { Platform } from "@/domain/entities/platform";
import { Caption, createCaption } from "@/domain/entities/caption";
import { MusicTrack } from "@/domain/entities/music";
import { EditTemplate } from "@/domain/entities/template";
import { TEMPLATES } from "@/domain/data/templates";
import { ScoredBlock } from "@/domain/entities/job";
import { StudioStep, STUDIO_STEPS } from "@/domain/entities/studio";
import { OutputFormat, OutputQuality, DEFAULT_OUTPUT_FORMAT, DEFAULT_OUTPUT_QUALITY } from "@/domain/entities/export";
import type { StudioAction as StudioActionType } from "@spikeclips/shared";
import { DESTRUCTIVE_ACTIONS } from "@spikeclips/shared";
import { UndoRedoManager } from "@/presentation/components/studio/timeline/timeline-state";

export type ChatLoadingPhase = "analyzing" | "generating" | null;

export interface ChatMessage {
  id: string;
  role: "user" | "system";
  content: string;
  timestamp: Date;
  variant?: "user" | "assistant" | "clarification" | "summary";
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

export interface PendingClarification {
  question: string;
  suggestions: string[];
}

export interface PendingPreview {
  actions: StudioActionType[];
  summary?: string;
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
  chatLoadingPhase: ChatLoadingPhase;
  pendingClarification: PendingClarification | null;
  pendingPreview: PendingPreview | null;
  jobId: string | null;
}

type StudioAction =
  | { type: "SET_PLATFORM"; platform: Platform | null }
  | { type: "SET_STEP"; step: StudioStep }
  | { type: "SET_OUTPUT_FORMAT"; format: OutputFormat }
  | { type: "SET_OUTPUT_QUALITY"; quality: OutputQuality }
  | { type: "INIT_FROM_JOB"; scenes: ScoredBlock[]; jobId?: string | null; studioEdits?: Record<number, StudioActionType[]> }
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
  | { type: "SET_CHAT_LOADING_PHASE"; phase: ChatLoadingPhase }
  | { type: "SET_STUDIO_ACTIONS"; index: number; actions: StudioActionType[] }
  | { type: "ADD_STUDIO_ACTION"; index: number; action: StudioActionType }
  | { type: "REMOVE_STUDIO_ACTION"; index: number; actionIndex: number }
  | { type: "SET_PREVIEW_URL"; index: number; url: string | null }
  | { type: "SET_PREVIEW_LOADING"; index: number; loading: boolean }
  | { type: "SET_PREVIEW_ERROR"; index: number; error: string | null }
  | { type: "SET_PENDING_CLARIFICATION"; clarification: PendingClarification | null }
  | { type: "SET_PENDING_PREVIEW"; preview: PendingPreview | null }
  | { type: "APPLY_PENDING_PREVIEW" }
  | { type: "CANCEL_PENDING_PREVIEW" }
  | { type: "RESET" };

const STEPS = STUDIO_STEPS;

const FALLBACK_SUGGESTIONS = ["Make it more subtle", "Make it bolder", "Apply to the whole clip"];

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
  chatLoadingPhase: null,
  pendingClarification: null,
  pendingPreview: null,
  jobId: null,
};

function studioReducer(state: StudioState, action: StudioAction): StudioState {
  function updateSceneEdit(index: number, updater: (edit: SceneEditState) => SceneEditState): StudioState {
    const nextEdits = new Map(state.sceneEdits);
    const existing = nextEdits.get(index) ?? createDefaultSceneEdit();
    nextEdits.set(index, updater(existing));
    return { ...state, sceneEdits: nextEdits };
  }

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
      const sceneEdits = new Map<number, SceneEditState>();
      if (action.studioEdits) {
        for (const [index, actions] of Object.entries(action.studioEdits)) {
          sceneEdits.set(Number(index), { ...createDefaultSceneEdit(), studioActions: actions });
        }
      }
      return {
        ...state,
        scenes: action.scenes,
        selectedSceneIndex: null,
        sceneEdits,
        jobId: action.jobId ?? null,
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
          currentStep: "platform",
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

    case "UPDATE_SCENE_EDIT":
      return updateSceneEdit(action.index, (e) => ({ ...e, ...action.updates }));

    case "ADD_CAPTION":
      return updateSceneEdit(action.index, (e) => ({
        ...e,
        captions: [...e.captions, action.caption],
      }));

    case "UPDATE_CAPTION":
      return updateSceneEdit(action.index, (e) => ({
        ...e,
        captions: e.captions.map((c: Caption) => (c.id === action.id ? { ...c, ...action.updates } : c)),
      }));

    case "REMOVE_CAPTION":
      return updateSceneEdit(action.index, (e) => ({
        ...e,
        captions: e.captions.filter((c: Caption) => c.id !== action.id),
      }));

    case "SET_MUSIC":
      return updateSceneEdit(action.index, (e) => ({ ...e, musicTrack: action.track }));

    case "SET_ORIGINAL_VOLUME":
      return updateSceneEdit(action.index, (e) => ({ ...e, originalVolume: action.volume }));

    case "SET_TEMPLATE":
      return updateSceneEdit(action.index, (e) => ({ ...e, selectedTemplate: action.template }));

    case "ADD_CHAT_MESSAGE":
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.message],
      };

    case "SET_CHAT_LOADING_PHASE":
      return { ...state, chatLoadingPhase: action.phase };

    case "SET_STUDIO_ACTIONS":
      return updateSceneEdit(action.index, (e) => ({ ...e, studioActions: action.actions }));

    case "ADD_STUDIO_ACTION":
      return updateSceneEdit(action.index, (e) => ({
        ...e,
        studioActions: [...e.studioActions, action.action],
      }));

    case "REMOVE_STUDIO_ACTION":
      return updateSceneEdit(action.index, (e) => ({
        ...e,
        studioActions: e.studioActions.filter((_action: StudioActionType, i: number) => i !== action.actionIndex),
      }));

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

    case "SET_PENDING_CLARIFICATION":
      return { ...state, pendingClarification: action.clarification };

    case "SET_PENDING_PREVIEW":
      return { ...state, pendingPreview: action.preview };

    case "APPLY_PENDING_PREVIEW": {
      if (state.selectedSceneIndex === null || !state.pendingPreview) return state;
      const idx = state.selectedSceneIndex;
      const nextEdits = new Map(state.sceneEdits);
      const existing = nextEdits.get(idx) ?? createDefaultSceneEdit();
      nextEdits.set(idx, {
        ...existing,
        studioActions: [...existing.studioActions, ...state.pendingPreview.actions],
      });
      return { ...state, sceneEdits: nextEdits, pendingPreview: null };
    }

    case "CANCEL_PENDING_PREVIEW":
      return { ...state, pendingPreview: null };

    default:
      return state;
  }
}

export function useStudio() {
  const [state, dispatch] = useReducer(studioReducer, initialState);

  const revisionManagers = useRef<Map<number, UndoRedoManager<StudioActionType[]>>>(new Map());

  const getManager = (index: number): UndoRedoManager<StudioActionType[]> => {
    let mgr = revisionManagers.current.get(index);
    if (!mgr) {
      mgr = new UndoRedoManager<StudioActionType[]>([]);
      revisionManagers.current.set(index, mgr);
    }
    return mgr;
  };

  const { platform, scenes, selectedSceneIndex, sceneEdits, currentStep, outputFormat, outputQuality, customTimeRange, chatMessages, chatLoadingPhase, pendingClarification, pendingPreview } = state;

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

  const initFromJob = useCallback(
    (jobScenes: ScoredBlock[], jobId?: string | null, studioEdits?: Record<number, StudioActionType[]>) => {
      dispatch({ type: "INIT_FROM_JOB", scenes: jobScenes, jobId: jobId ?? null, studioEdits });
    },
    []
  );

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

  const setChatLoadingPhase = useCallback((phase: ChatLoadingPhase) => {
    dispatch({ type: "SET_CHAT_LOADING_PHASE", phase });
  }, []);

  const studioActions = useMemo(
    () => (selectedSceneIndex !== null ? sceneEdits.get(selectedSceneIndex)?.studioActions ?? [] : []),
    [selectedSceneIndex, sceneEdits]
  );

  const setStudioActions = useCallback((actions: StudioActionType[]) => {
    if (selectedSceneIndex === null) return;
    dispatch({ type: "SET_STUDIO_ACTIONS", index: selectedSceneIndex, actions });
  }, [selectedSceneIndex]);

  const commitStudioActions = useCallback(
    (index: number, next: StudioActionType[]) => {
      getManager(index).push(next);
      dispatch({ type: "SET_STUDIO_ACTIONS", index, actions: next });
    },
    []
  );

  const addStudioAction = useCallback(
    (action: StudioActionType) => {
      if (selectedSceneIndex === null) return;
      const current = getManager(selectedSceneIndex).peek();
      commitStudioActions(selectedSceneIndex, [...current, action]);
    },
    [selectedSceneIndex, commitStudioActions]
  );

  const removeStudioAction = useCallback(
    (actionIndex: number) => {
      if (selectedSceneIndex === null) return;
      const current = getManager(selectedSceneIndex).peek();
      commitStudioActions(
        selectedSceneIndex,
        current.filter((_a, i) => i !== actionIndex)
      );
    },
    [selectedSceneIndex, commitStudioActions]
  );

  const undoStudioActions = useCallback((index: number) => {
    const prev = getManager(index).undo();
    if (prev !== null) dispatch({ type: "SET_STUDIO_ACTIONS", index, actions: prev });
  }, []);

  const redoStudioActions = useCallback((index: number) => {
    const next = getManager(index).redo();
    if (next !== null) dispatch({ type: "SET_STUDIO_ACTIONS", index, actions: next });
  }, []);

  const undo = useCallback(() => {
    if (selectedSceneIndex !== null) undoStudioActions(selectedSceneIndex);
  }, [selectedSceneIndex, undoStudioActions]);

  const redo = useCallback(() => {
    if (selectedSceneIndex !== null) redoStudioActions(selectedSceneIndex);
  }, [selectedSceneIndex, redoStudioActions]);

  const canUndo = selectedSceneIndex !== null ? getManager(selectedSceneIndex).canUndo() : false;
  const canRedo = selectedSceneIndex !== null ? getManager(selectedSceneIndex).canRedo() : false;

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

  const setPendingClarification = useCallback((clarification: PendingClarification | null) => {
    dispatch({ type: "SET_PENDING_CLARIFICATION", clarification });
  }, []);

  const setPendingPreview = useCallback((preview: PendingPreview | null) => {
    dispatch({ type: "SET_PENDING_PREVIEW", preview });
  }, []);

  const cancelPendingPreview = useCallback(() => {
    dispatch({ type: "CANCEL_PENDING_PREVIEW" });
  }, []);

  const sendChatMessage = useCallback(async (prompt: string) => {
    if (selectedSceneIndex === null || !platform) return;

    const scene = scenes[selectedSceneIndex];
    if (!scene) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      variant: "user",
      content: prompt,
      timestamp: new Date(),
    };
    addChatMessage(userMessage);
    setChatLoadingPhase("analyzing");
    setPendingClarification(null);
    setPendingPreview(null);

    try {
      const { jobApi } = await import("@/infrastructure/api/job-api.client");
      const currentEdit = sceneEdits.get(selectedSceneIndex) ?? createDefaultSceneEdit();

      const context = {
        currentActions: currentEdit.studioActions,
        captions: currentEdit.captions.map((c) => ({ text: c.text })),
        music: currentEdit.musicTrack
          ? { name: currentEdit.musicTrack.name, volume: currentEdit.musicTrack.volume }
          : null,
        template: currentEdit.selectedTemplate
          ? { id: currentEdit.selectedTemplate.id, name: currentEdit.selectedTemplate.name }
          : null,
        availableTemplates: TEMPLATES.map((t) => ({ id: t.id, name: t.name })),
      };

      const history = chatMessages.slice(-8).map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

      const result = await jobApi.translatePrompt(
        prompt,
        scene.start_time,
        scene.end_time,
        platform.id,
        context,
        history
      );

      if (result.clarification) {
        const suggestions =
          result.clarification.suggestions && result.clarification.suggestions.length > 0
            ? result.clarification.suggestions
            : FALLBACK_SUGGESTIONS;
        setPendingClarification({
          question: result.clarification.question,
          suggestions,
        });
        const systemMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "system",
          variant: "clarification",
          content: result.clarification.question,
          timestamp: new Date(),
        };
        addChatMessage(systemMessage);
      } else if (result.actions.length > 0) {
        const summary =
          result.summary ?? `Applied ${result.actions.length} action(s): ${result.actions.map((a) => a.action).join(", ")}`;
        const hasDestructive = result.actions.some((a) => DESTRUCTIVE_ACTIONS.has(a.action));

        if (hasDestructive) {
          setPendingPreview({ actions: result.actions, summary });
          const systemMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "system",
            variant: "summary",
            content: `Preview: ${summary}. Confirm to apply.`,
            timestamp: new Date(),
          };
          addChatMessage(systemMessage);
        } else {
          if (selectedSceneIndex !== null) {
            commitStudioActions(selectedSceneIndex, result.actions);
          }
          const systemMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "system",
            variant: "summary",
            content: summary,
            timestamp: new Date(),
          };
          addChatMessage(systemMessage);

          setChatLoadingPhase("generating");
          try {
            const sceneId = `${scene.start_time}-${scene.end_time}`;
            const preview = await jobApi.generatePreview(sceneId, result.actions, platform.id);
            setPreviewUrl(preview.previewUrl);
          } catch (previewErr) {
            setPreviewError(previewErr instanceof Error ? previewErr.message : "Preview failed");
          } finally {
            setChatLoadingPhase(null);
          }
        }
      } else {
        const systemMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "system",
          variant: "assistant",
          content: "No actions were produced from that prompt.",
          timestamp: new Date(),
        };
        addChatMessage(systemMessage);
      }
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "system",
        variant: "assistant",
        content: err instanceof Error ? err.message : "Failed to process prompt",
        timestamp: new Date(),
      };
      addChatMessage(errorMessage);
    } finally {
      setChatLoadingPhase(null);
    }
  }, [
    selectedSceneIndex,
    platform,
    scenes,
    sceneEdits,
    chatMessages,
    addChatMessage,
    setChatLoadingPhase,
    commitStudioActions,
    setPreviewUrl,
    setPreviewError,
    setPendingClarification,
    setPendingPreview,
  ]);

  const applyPendingPreview = useCallback(
    async (actions: StudioActionType[]) => {
      if (selectedSceneIndex === null || !platform) return;
      const scene = scenes[selectedSceneIndex];
      if (!scene) return;

      const current = sceneEdits.get(selectedSceneIndex)?.studioActions ?? [];
      commitStudioActions(selectedSceneIndex, [...current, ...actions]);
      setPendingPreview(null);
      setChatLoadingPhase("generating");
      try {
        const { jobApi } = await import("@/infrastructure/api/job-api.client");
        const sceneId = `${scene.start_time}-${scene.end_time}`;
        const preview = await jobApi.generatePreview(sceneId, actions, platform.id);
        setPreviewUrl(preview.previewUrl);
      } catch (previewErr) {
        setPreviewError(previewErr instanceof Error ? previewErr.message : "Preview failed");
      } finally {
        setChatLoadingPhase(null);
      }
    },
    [selectedSceneIndex, platform, scenes, sceneEdits, commitStudioActions, setPendingPreview, setChatLoadingPhase, setPreviewUrl, setPreviewError]
  );

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // Persist revisions to the backend (debounced) once a job is loaded.
  useEffect(() => {
    if (!state.jobId) return;
    const serialized: Record<number, StudioActionType[]> = {};
    sceneEdits.forEach((edit, index) => {
      if (edit.studioActions.length > 0) {
        serialized[index] = edit.studioActions;
      }
    });

    const timer = setTimeout(() => {
      void import("@/infrastructure/api/job-api.client").then(({ jobApi }) => {
        jobApi.saveActions(state.jobId as string, serialized).catch(() => {});
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [state.jobId, sceneEdits]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  const revisionDepth = selectedSceneIndex !== null ? getManager(selectedSceneIndex).depth() : 0;

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
    chatLoadingPhase,
    addChatMessage,
    setChatLoadingPhase,
    sendChatMessage,
    setStudioActions,
    addStudioAction,
    removeStudioAction,
    undo,
    redo,
    canUndo,
    canRedo,
    revisionDepth,
    setPreviewUrl,
    setPreviewLoading,
    setPreviewError,
    pendingClarification,
    pendingPreview,
    setPendingClarification,
    setPendingPreview,
    applyPendingPreview,
    cancelPendingPreview,
    jobId: state.jobId,
    reset,
  };
}
