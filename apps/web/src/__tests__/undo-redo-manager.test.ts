import { UndoRedoManager } from "@/presentation/components/studio/timeline/timeline-state";

describe("UndoRedoManager grouping", () => {
  it("a single commit of multiple items is undone in one step", () => {
    const m = new UndoRedoManager<number[]>([]);
    m.push([1]);
    // AI applies two actions as one commit (commitStudioActions pushes once)
    m.push([1, 2]);

    expect(m.canUndo()).toBe(true);
    const undone = m.undo();
    expect(undone).toEqual([1]);
    expect(m.canRedo()).toBe(true);
  });

  it("undo then redo restores the grouped commit", () => {
    const m = new UndoRedoManager<number[]>([]);
    m.push([1, 2, 3]);

    const afterUndo = m.undo();
    expect(afterUndo).toEqual([]);
    const afterRedo = m.redo();
    expect(afterRedo).toEqual([1, 2, 3]);
  });

  it("a new commit after undo clears the redo stack", () => {
    const m = new UndoRedoManager<number[]>([]);
    m.push([1]);
    m.undo();
    expect(m.canRedo()).toBe(true);

    m.push([2]);
    expect(m.canRedo()).toBe(false);
    expect(m.undo()).toEqual([]);
  });
});
