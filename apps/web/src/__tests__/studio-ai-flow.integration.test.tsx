import { renderHook, act } from "@testing-library/react";
import { useStudio } from "@/application/hooks/use-studio";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/studio",
}));

jest.mock("@/infrastructure/api/job-api.client", () => ({
  jobApi: {
    translatePrompt: jest.fn(),
    generatePreview: jest.fn(),
    saveActions: jest.fn().mockResolvedValue(undefined),
  },
}));

import { jobApi } from "@/infrastructure/api/job-api.client";

const mockScenes = [
  { start_time: 0, end_time: 10, duration: 10, peak_intensity: 0.8, avg_intensity: 0.7, score: 0.75, confidence: "high" as const, capped: false },
  { start_time: 15, end_time: 25, duration: 10, peak_intensity: 0.9, avg_intensity: 0.8, score: 0.85, confidence: "high" as const, capped: false },
];

const mockPlatform = {
  id: "tiktok",
  name: "TikTok",
  icon: "Music2",
  aspectRatio: "9:16",
  maxDuration: 180,
  description: "Short-form video",
};

function makeCaption(text: string) {
  return {
    action: "add_captions" as const,
    text,
    font: "inter",
    size: 48,
    color: "#FFFFFF",
    position: "center",
    start: 0,
    end: 10,
    animation: "none",
    style: "normal",
    opacity: 1,
    backgroundEnabled: false,
    strokeWidth: 2,
    shadowRadius: 2,
  };
}

describe("studio AI flow (integration)", () => {
  beforeEach(() => {
    if (!global.crypto?.randomUUID) {
      Object.defineProperty(global, "crypto", {
        value: { ...global.crypto, randomUUID: () => Math.random().toString(36).slice(2) },
        writable: true,
      });
    }
  });

  beforeEach(() => {
    (jobApi.translatePrompt as jest.Mock).mockReset();
    (jobApi.generatePreview as jest.Mock).mockReset();
    (jobApi.generatePreview as jest.Mock).mockResolvedValue({ previewUrl: "https://x/preview.mp4" });
  });

  it("clarify -> apply -> undo/redo -> destructive preview -> apply", async () => {
    const { result } = renderHook(() => useStudio());
    act(() => result.current.initFromJob(mockScenes as never));
    act(() => result.current.setPlatform(mockPlatform as never));
    act(() => result.current.selectScene(0));

    // 1) Clarification round-trip
    (jobApi.translatePrompt as jest.Mock).mockResolvedValue({
      actions: [],
      clarification: { question: "Which vibe?", suggestions: ["Subtle", "Bold"] },
    });
    await act(async () => {
      await result.current.sendChatMessage("make it pop");
    });
    expect(result.current.pendingClarification?.question).toBe("Which vibe?");

    // 2) Answer -> additive action committed
    (jobApi.translatePrompt as jest.Mock).mockResolvedValue({
      actions: [makeCaption("Hello")],
      summary: "Added a caption",
    });
    await act(async () => {
      await result.current.sendChatMessage("Subtle");
    });
    expect(result.current.pendingClarification).toBeNull();
    expect(result.current.studioActions).toHaveLength(1);

    // 3) Undo / redo round-trip
    act(() => result.current.undo());
    expect(result.current.studioActions).toHaveLength(0);
    act(() => result.current.redo());
    expect(result.current.studioActions).toHaveLength(1);

    // 4) Destructive action -> requires explicit preview confirmation
    (jobApi.translatePrompt as jest.Mock).mockResolvedValue({
      actions: [{ action: "set_speed", rate: 1.5, preservePitch: true }],
      summary: "Changed speed",
    });
    await act(async () => {
      await result.current.sendChatMessage("speed it up");
    });
    expect(result.current.pendingPreview).not.toBeNull();
    expect(result.current.pendingPreview?.actions[0].action).toBe("set_speed");

    // still only the caption is applied until confirmed
    expect(result.current.studioActions).toHaveLength(1);

    // 5) Confirm the preview -> actions applied + preview generated
    await act(async () => {
      await result.current.applyPendingPreview(result.current.pendingPreview!.actions);
    });
    expect(result.current.pendingPreview).toBeNull();
    expect(result.current.studioActions).toHaveLength(2);
    expect(jobApi.generatePreview).toHaveBeenCalled();
  });

  it("undo after confirmation removes the destructive action", async () => {
    const { result } = renderHook(() => useStudio());
    act(() => result.current.initFromJob(mockScenes as never));
    act(() => result.current.setPlatform(mockPlatform as never));
    act(() => result.current.selectScene(0));

    (jobApi.translatePrompt as jest.Mock).mockResolvedValue({
      actions: [{ action: "set_speed", rate: 2, preservePitch: true }],
      summary: "Doubled speed",
    });
    await act(async () => {
      await result.current.sendChatMessage("fast");
    });
    expect(result.current.pendingPreview).not.toBeNull();

    await act(async () => {
      await result.current.applyPendingPreview(result.current.pendingPreview!.actions);
    });
    expect(result.current.studioActions).toHaveLength(1);

    act(() => result.current.undo());
    expect(result.current.studioActions).toHaveLength(0);
  });

  it("hydrates scene edits from a previously persisted job", () => {
    const { result } = renderHook(() => useStudio());
    act(() => result.current.initFromJob(mockScenes as never, "job-42", { 0: [makeCaption("loaded")] }));

    expect(result.current.jobId).toBe("job-42");
    act(() => result.current.selectScene(0));
    expect(result.current.studioActions).toHaveLength(1);
    expect(result.current.studioActions[0].text).toBe("loaded");
  });

  it("persists edits to the backend after a change", async () => {
    (jobApi.saveActions as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useStudio());
    act(() => result.current.initFromJob(mockScenes as never, "job-42"));
    act(() => result.current.selectScene(0));
    act(() => result.current.addStudioAction(makeCaption("persist me")));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 700));
    });

    expect(jobApi.saveActions).toHaveBeenCalledWith(
      "job-42",
      expect.objectContaining({ 0: expect.arrayContaining([expect.objectContaining({ text: "persist me" })]) })
    );
  });
});
