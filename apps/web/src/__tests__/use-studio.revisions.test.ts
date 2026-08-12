import { renderHook, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useStudio } from "@/application/hooks/use-studio";
import type { StudioAction } from "@spikeclips/shared";

function makeCaption(text: string): StudioAction {
  return {
    action: "add_captions",
    text,
    font: "inter",
    size: 48,
    color: "#FFFFFF",
    position: "center",
    start: 0,
    end: 5,
    animation: "none",
    style: "normal",
    opacity: 1,
    backgroundEnabled: false,
    strokeWidth: 2,
    shadowRadius: 2,
  };
}

describe("useStudio AI revisions", () => {
  it("undo/redo restores studio actions for the selected scene", () => {
    const { result } = renderHook(() => useStudio());
    act(() => result.current.selectScene(0));
    act(() => result.current.addStudioAction(makeCaption("One")));

    expect(result.current.studioActions).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.studioActions).toHaveLength(0);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.studioActions).toHaveLength(1);
  });

  it("each manual add is its own undo step (contrast with grouped AI apply)", () => {
    const { result } = renderHook(() => useStudio());
    act(() => result.current.selectScene(0));
    act(() => result.current.addStudioAction(makeCaption("One")));
    act(() => result.current.addStudioAction(makeCaption("Two")));

    expect(result.current.studioActions).toHaveLength(2);

    act(() => result.current.undo());
    expect(result.current.studioActions).toHaveLength(1);
    act(() => result.current.undo());
    expect(result.current.studioActions).toHaveLength(0);
  });

  it("keeps revisions isolated per scene", () => {
    const { result } = renderHook(() => useStudio());
    act(() => result.current.selectScene(0));
    act(() => result.current.addStudioAction(makeCaption("A")));
    act(() => result.current.selectScene(1));
    act(() => result.current.addStudioAction(makeCaption("B")));

    act(() => result.current.selectScene(0));
    expect(result.current.studioActions).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.studioActions).toHaveLength(0);

    act(() => result.current.selectScene(1));
    expect(result.current.studioActions).toHaveLength(1);
  });

  it("removing an action is undoable", () => {
    const { result } = renderHook(() => useStudio());
    act(() => result.current.selectScene(0));
    act(() => result.current.addStudioAction(makeCaption("A")));
    act(() => result.current.addStudioAction(makeCaption("B")));

    act(() => result.current.removeStudioAction(1));
    expect(result.current.studioActions).toHaveLength(1);

    act(() => result.current.undo());
    expect(result.current.studioActions).toHaveLength(2);
  });

  it("keyboard shortcuts trigger undo/redo", () => {
    const { result } = renderHook(() => useStudio());
    act(() => result.current.selectScene(0));
    act(() => result.current.addStudioAction(makeCaption("A")));
    act(() => result.current.addStudioAction(makeCaption("B")));

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));
    });
    expect(result.current.studioActions).toHaveLength(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "y", ctrlKey: true }));
    });
    expect(result.current.studioActions).toHaveLength(2);

    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true }));
    });
    expect(result.current.studioActions).toHaveLength(1);
  });

  it("keyboard shortcuts are ignored while typing in an input", () => {
    const { result } = renderHook(() => useStudio());
    act(() => result.current.selectScene(0));
    act(() => result.current.addStudioAction(makeCaption("A")));

    const input = document.createElement("input");
    document.body.appendChild(input);
    try {
      act(() => {
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
      });
      expect(result.current.studioActions).toHaveLength(1);
    } finally {
      document.body.removeChild(input);
    }
  });

  it("exposes revisionDepth matching the undoable step count", () => {
    const { result } = renderHook(() => useStudio());
    act(() => result.current.selectScene(0));
    expect(result.current.revisionDepth).toBe(0);
    act(() => result.current.addStudioAction(makeCaption("A")));
    expect(result.current.revisionDepth).toBe(1);
    act(() => result.current.undo());
    expect(result.current.revisionDepth).toBe(0);
  });
});
