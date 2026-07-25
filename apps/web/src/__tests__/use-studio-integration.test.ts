import { renderHook, act } from "@testing-library/react";
import { useStudio } from "@/application/hooks/use-studio";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/studio",
}));

const mockScenes = [
  { start_time: 0, end_time: 10, duration: 10, peak_intensity: 0.8, avg_intensity: 0.7, score: 0.75, confidence: "high" as const, capped: false },
  { start_time: 15, end_time: 25, duration: 10, peak_intensity: 0.9, avg_intensity: 0.8, score: 0.85, confidence: "high" as const, capped: false },
];

describe("useStudio", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes with platform step and default values", () => {
    const { result } = renderHook(() => useStudio());
    expect(result.current.currentStep).toBe("platform");
    expect(result.current.platform).toBeNull();
    expect(result.current.scenes).toEqual([]);
    expect(result.current.selectedSceneIndex).toBeNull();
  });

  it("sets platform", () => {
    const { result } = renderHook(() => useStudio());
    act(() => {
      result.current.setPlatform({
        id: "tiktok",
        name: "TikTok",
        icon: "Music2",
        aspectRatio: "9:16",
        maxDuration: 180,
        description: "Short-form video",
      });
    });
    expect(result.current.platform).not.toBeNull();
  });

  it("advances step with goNext when conditions met", () => {
    const { result } = renderHook(() => useStudio());
    act(() => {
      result.current.setPlatform({
        id: "tiktok",
        name: "TikTok",
        icon: "Music2",
        aspectRatio: "9:16",
        maxDuration: 180,
        description: "Short-form video",
      });
    });
    act(() => {
      result.current.goNext();
    });
    expect(result.current.currentStep).toBe("scenes");
  });

  it("goes back with goPrev", () => {
    const { result } = renderHook(() => useStudio());
    act(() => {
      result.current.setPlatform({
        id: "tiktok",
        name: "TikTok",
        icon: "Music2",
        aspectRatio: "9:16",
        maxDuration: 180,
        description: "Short-form video",
      });
    });
    act(() => { result.current.goNext(); });
    act(() => { result.current.goPrev(); });
    expect(result.current.currentStep).toBe("platform");
  });

  it("selects a scene and stays on scenes step", () => {
    const { result } = renderHook(() => useStudio());
    act(() => {
      result.current.setPlatform({
        id: "tiktok",
        name: "TikTok",
        icon: "Music2",
        aspectRatio: "9:16",
        maxDuration: 180,
        description: "Short-form video",
      });
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });
    act(() => {
      result.current.goToStep("scenes");
    });
    act(() => {
      result.current.selectScene(1);
    });
    expect(result.current.selectedSceneIndex).toBe(1);
    expect(result.current.currentStep).toBe("scenes");
  });

  it("goToStep sets the step directly when allowed", () => {
    const { result } = renderHook(() => useStudio());
    act(() => { result.current.goToStep("platform"); });
    expect(result.current.currentStep).toBe("platform");

    act(() => {
      result.current.setPlatform({
        id: "tiktok",
        name: "TikTok",
        icon: "Music2",
        aspectRatio: "9:16",
        maxDuration: 180,
        description: "Short-form video",
      });
    });
    act(() => { result.current.goToStep("scenes"); });
    expect(result.current.currentStep).toBe("scenes");
  });

  it("goToStep navigates to chat when scene selected", () => {
    const { result } = renderHook(() => useStudio());
    act(() => {
      result.current.setPlatform({
        id: "tiktok",
        name: "TikTok",
        icon: "Music2",
        aspectRatio: "9:16",
        maxDuration: 180,
        description: "Short-form video",
      });
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });
    act(() => {
      result.current.selectScene(0);
    });
    act(() => { result.current.goToStep("chat"); });
    expect(result.current.currentStep).toBe("chat");
  });

  it("reset returns to initial state", () => {
    const { result } = renderHook(() => useStudio());
    act(() => {
      result.current.setPlatform({
        id: "tiktok",
        name: "TikTok",
        icon: "Music2",
        aspectRatio: "9:16",
        maxDuration: 180,
        description: "Short-form video",
      });
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });
    act(() => {
      result.current.selectScene(0);
    });
    act(() => { result.current.reset(); });
    expect(result.current.currentStep).toBe("platform");
    expect(result.current.platform).toBeNull();
    expect(result.current.scenes).toEqual([]);
  });

  it("reports canGoNext correctly", () => {
    const { result } = renderHook(() => useStudio());
    expect(result.current.canGoNext).toBe(false);
    act(() => {
      result.current.setPlatform({
        id: "tiktok",
        name: "TikTok",
        icon: "Music2",
        aspectRatio: "9:16",
        maxDuration: 180,
        description: "Short-form video",
      });
    });
    expect(result.current.canGoNext).toBe(true);
  });

  it("reports isFirstStep and isLastStep", () => {
    const { result } = renderHook(() => useStudio());
    expect(result.current.isFirstStep).toBe(true);
    expect(result.current.isLastStep).toBe(false);

    act(() => {
      result.current.setPlatform({
        id: "tiktok",
        name: "TikTok",
        icon: "Music2",
        aspectRatio: "9:16",
        maxDuration: 180,
        description: "Short-form video",
      });
    });
    act(() => {
      result.current.initFromJob(mockScenes);
    });
    act(() => {
      result.current.selectScene(0);
    });
    act(() => { result.current.goToStep("export"); });
    expect(result.current.isLastStep).toBe(true);
    expect(result.current.isFirstStep).toBe(false);
  });
});
