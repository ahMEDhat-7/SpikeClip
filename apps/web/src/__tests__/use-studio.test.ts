import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useStudio } from "../application/hooks/use-studio";

beforeEach(() => {
  if (!global.crypto?.randomUUID) {
    Object.defineProperty(global, "crypto", {
      value: { ...global.crypto, randomUUID: () => Math.random().toString(36).slice(2) },
      writable: true,
    });
  }
});

const mockScenes = [
  { start_time: 0, end_time: 10, duration: 10, peak_intensity: 0.8, avg_intensity: 0.7, score: 0.75, confidence: "high" as const, capped: false },
  { start_time: 15, end_time: 25, duration: 10, peak_intensity: 0.9, avg_intensity: 0.8, score: 0.85, confidence: "high" as const, capped: false },
  { start_time: 30, end_time: 40, duration: 10, peak_intensity: 0.7, avg_intensity: 0.6, score: 0.65, confidence: "high" as const, capped: false },
];

const mockPlatform = {
  id: "youtube-shorts",
  name: "YouTube Shorts",
  icon: "Youtube",
  aspectRatio: "9:16",
  maxDuration: 60,
  description: "Vertical short-form video",
};

describe("useStudio", () => {
  it("initializes with default state", () => {
    const { result } = renderHook(() => useStudio());

    expect(result.current.platform).toBeNull();
    expect(result.current.scenes).toEqual([]);
    expect(result.current.selectedSceneIndex).toBeNull();
    expect(result.current.selectedScenes).toEqual([]);
    expect(result.current.currentSceneEdit).toBeNull();
    expect(result.current.captions).toEqual([]);
    expect(result.current.musicTrack).toBeNull();
    expect(result.current.selectedTemplate).toBeNull();
    expect(result.current.currentStep).toBe("platform");
    expect(result.current.outputFormat).toBe("mp4");
    expect(result.current.outputQuality).toBe("1080p");
  });

  it("has correct step order", () => {
    const { result } = renderHook(() => useStudio());
    expect(result.current.steps).toEqual([
      "platform", "scenes", "chat", "captions", "music", "templates", "export",
    ]);
  });

  it("canGoNext depends on platform selection", () => {
    const { result } = renderHook(() => useStudio());

    expect(result.current.canGoNext).toBe(false);

    act(() => {
      result.current.setPlatform(mockPlatform);
    });

    expect(result.current.canGoNext).toBe(true);
  });

  it("navigates between steps", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
    });

    act(() => {
      result.current.goNext();
    });

    expect(result.current.currentStep).toBe("scenes");
    expect(result.current.isFirstStep).toBe(false);

    act(() => {
      result.current.goPrev();
    });

    expect(result.current.currentStep).toBe("platform");
    expect(result.current.isFirstStep).toBe(true);
  });

  it("canGoPrev is false on first step", () => {
    const { result } = renderHook(() => useStudio());
    expect(result.current.canGoPrev).toBe(false);
  });

  it("canGoPrev is true after navigating forward", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
    });

    act(() => {
      result.current.goToStep("scenes");
    });

    expect(result.current.canGoPrev).toBe(true);
  });

  it("isLastStep is true on export step", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
    });

    act(() => {
      result.current.initFromJob(mockScenes);
    });

    act(() => {
      result.current.selectScene(0);
    });

    act(() => {
      result.current.goToStep("export");
    });

    expect(result.current.isLastStep).toBe(true);
  });

  it("selects a scene and stays on scenes step", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
    });

    act(() => {
      result.current.initFromJob(mockScenes);
    });

    act(() => {
      result.current.goToStep("scenes");
    });

    expect(result.current.selectedSceneIndex).toBeNull();
    expect(result.current.selectedScenes).toEqual([]);

    act(() => {
      result.current.selectScene(1);
    });

    expect(result.current.selectedSceneIndex).toBe(1);
    expect(result.current.selectedScenes).toEqual([1]);
    expect(result.current.currentStep).toBe("scenes");
  });

  it("adds and removes captions for selected scene", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.initFromJob(mockScenes);
      result.current.selectScene(0);
    });

    act(() => {
      result.current.addCaption({ text: "Hello" });
    });

    expect(result.current.captions).toHaveLength(1);
    expect(result.current.captions[0].text).toBe("Hello");

    const captionId = result.current.captions[0].id;

    act(() => {
      result.current.removeCaption(captionId);
    });

    expect(result.current.captions).toHaveLength(0);
  });

  it("updates caption", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.initFromJob(mockScenes);
      result.current.selectScene(0);
    });

    act(() => {
      result.current.addCaption({ text: "Hello" });
    });

    const captionId = result.current.captions[0].id;

    act(() => {
      result.current.updateCaption(captionId, { text: "World", color: "#FF0000" });
    });

    expect(result.current.captions[0].text).toBe("World");
    expect(result.current.captions[0].color).toBe("#FF0000");
  });

  it("resets all state", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
      result.current.initFromJob(mockScenes);
      result.current.selectScene(0);
      result.current.addCaption({ text: "Test" });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.platform).toBeNull();
    expect(result.current.scenes).toEqual([]);
    expect(result.current.selectedSceneIndex).toBeNull();
    expect(result.current.currentStep).toBe("platform");
  });

  it("canGoNext is false on scenes step with no selected scene", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.goToStep("scenes");
    });

    expect(result.current.canGoNext).toBe(false);
  });

  it("canGoNext is true on scenes step with selected scene", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
      result.current.initFromJob(mockScenes);
      result.current.goToStep("scenes");
      result.current.selectScene(0);
    });

    expect(result.current.canGoNext).toBe(true);
  });

  it("switches between scenes and updates currentSceneEdit", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.initFromJob(mockScenes);
    });

    act(() => {
      result.current.selectScene(0);
    });

    act(() => {
      result.current.addCaption({ text: "Scene 0 caption" });
    });

    expect(result.current.captions).toHaveLength(1);
    expect(result.current.captions[0].text).toBe("Scene 0 caption");

    act(() => {
      result.current.selectScene(1);
    });

    expect(result.current.captions).toHaveLength(0);

    act(() => {
      result.current.addCaption({ text: "Scene 1 caption" });
    });

    expect(result.current.captions).toHaveLength(1);
    expect(result.current.captions[0].text).toBe("Scene 1 caption");

    act(() => {
      result.current.selectScene(0);
    });

    expect(result.current.captions).toHaveLength(1);
    expect(result.current.captions[0].text).toBe("Scene 0 caption");
  });

  it("initializes chat state", () => {
    const { result } = renderHook(() => useStudio());
    expect(result.current.chatMessages).toEqual([]);
    expect(result.current.chatLoadingPhase).toBeNull();
  });

  it("addChatMessage appends to chatMessages", () => {
    const { result } = renderHook(() => useStudio());
    const msg = { id: "1", role: "user" as const, content: "Hello", timestamp: new Date() };
    act(() => {
      result.current.addChatMessage(msg);
    });
    expect(result.current.chatMessages).toHaveLength(1);
    expect(result.current.chatMessages[0].content).toBe("Hello");
  });

  it("setChatLoadingPhase sets loading phase", () => {
    const { result } = renderHook(() => useStudio());
    act(() => {
      result.current.setChatLoadingPhase("analyzing");
    });
    expect(result.current.chatLoadingPhase).toBe("analyzing");
    act(() => {
      result.current.setChatLoadingPhase("generating");
    });
    expect(result.current.chatLoadingPhase).toBe("generating");
    act(() => {
      result.current.setChatLoadingPhase(null);
    });
    expect(result.current.chatLoadingPhase).toBeNull();
  });

  it("setStudioActions updates scene edit", () => {
    const { result } = renderHook(() => useStudio());
    const actions = [{ action: "set_speed" as const, rate: 2, preservePitch: true }];

    act(() => {
      result.current.setPlatform(mockPlatform);
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });
    act(() => {
      result.current.selectScene(0);
    });
    act(() => {
      result.current.setStudioActions(actions);
    });

    expect(result.current.studioActions).toEqual(actions);
  });

  it("addStudioAction appends to scene edit", () => {
    const { result } = renderHook(() => useStudio());
    const action = { action: "set_speed" as const, rate: 2, preservePitch: true };

    act(() => {
      result.current.setPlatform(mockPlatform);
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });
    act(() => {
      result.current.selectScene(0);
    });
    act(() => {
      result.current.addStudioAction(action);
    });

    expect(result.current.studioActions).toHaveLength(1);
    expect(result.current.studioActions[0]).toEqual(action);
  });

  it("removeStudioAction removes by index", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });
    act(() => {
      result.current.selectScene(0);
    });
    act(() => {
      result.current.addStudioAction({ action: "set_speed", rate: 2, preservePitch: true });
      result.current.addStudioAction({ action: "apply_effect", type: "vignette", intensity: 0.7 });
    });

    expect(result.current.studioActions).toHaveLength(2);

    act(() => {
      result.current.removeStudioAction(0);
    });

    expect(result.current.studioActions).toHaveLength(1);
    expect(result.current.studioActions[0].action).toBe("apply_effect");
  });

  it("setPreviewUrl updates scene edit", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });
    act(() => {
      result.current.selectScene(0);
    });
    act(() => {
      result.current.setPreviewUrl("http://preview.mp4");
    });

    expect(result.current.previewUrl).toBe("http://preview.mp4");
  });

  it("setPreviewLoading updates scene edit", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });
    act(() => {
      result.current.selectScene(0);
    });
    act(() => {
      result.current.setPreviewLoading(true);
    });

    expect(result.current.previewLoading).toBe(true);
  });

  it("setPreviewError updates scene edit", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });
    act(() => {
      result.current.selectScene(0);
    });
    act(() => {
      result.current.setPreviewError("Failed to render");
    });

    expect(result.current.previewError).toBe("Failed to render");
  });

  it("canGoToStep for chat requires selectedSceneIndex", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
    });

    expect(result.current.canGoToStep("chat")).toBe(false);

    act(() => {
      result.current.initFromJob(mockScenes);
    });
    act(() => {
      result.current.selectScene(0);
    });

    expect(result.current.canGoToStep("chat")).toBe(true);
  });

  it("reset clears chat messages and studio actions", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });
    act(() => {
      result.current.selectScene(0);
    });
    act(() => {
      result.current.addChatMessage({ id: "1", role: "user", content: "test", timestamp: new Date() });
      result.current.setStudioActions([{ action: "set_speed", rate: 2, preservePitch: true }]);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.chatMessages).toEqual([]);
    expect(result.current.studioActions).toEqual([]);
  });

  it("addCustomScene appends scene and selects it", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });

    act(() => {
      result.current.addCustomScene(5, 15, false);
    });

    expect(result.current.scenes).toHaveLength(4);
    expect(result.current.selectedSceneIndex).toBe(3);
  });

  it("addCustomScene replace=true replaces all scenes", () => {
    const { result } = renderHook(() => useStudio());

    act(() => {
      result.current.setPlatform(mockPlatform);
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });

    act(() => {
      result.current.addCustomScene(5, 15, true);
    });

    expect(result.current.scenes).toHaveLength(1);
    expect(result.current.selectedSceneIndex).toBe(0);
  });

  it("setOutputFormat updates state", () => {
    const { result } = renderHook(() => useStudio());
    act(() => {
      result.current.setOutputFormat("webm");
    });
    expect(result.current.outputFormat).toBe("webm");
  });

  it("setOutputQuality updates state", () => {
    const { result } = renderHook(() => useStudio());
    act(() => {
      result.current.setOutputQuality("720p");
    });
    expect(result.current.outputQuality).toBe("720p");
  });

  it("sendChatMessage with no platform or scene does nothing", () => {
    const { result } = renderHook(() => useStudio());
    act(() => {
      result.current.sendChatMessage("Hello");
    });
    expect(result.current.chatMessages).toHaveLength(0);
  });
});
