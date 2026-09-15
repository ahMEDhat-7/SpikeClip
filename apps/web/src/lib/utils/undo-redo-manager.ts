export class UndoRedoManager<T = any> {
  private history: T[][] = [];
  private currentCommit: T[] = [];
  private undoneCommit: T[] = [];
  private historyIndex = -1;
  private pushCount = 0;

  constructor(initialState: T | undefined) {
    if (initialState !== undefined) this.history = [[initialState]];
  }

  push(action: T): void {
    this.pushCount++;

    if (this.undoneCommit.length > 0) {
      this.undoneCommit = [];
      this.historyIndex = this.history.length - 1;
    }

    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.currentCommit.push(action);
  }

  canUndo(): boolean {
    return this.currentCommit.length > 0 || this.historyIndex >= 0;
  }

  undo(): T | undefined {
    if (this.currentCommit.length > 0) {
      this.historyIndex++;
      this.history = this.history.slice(0, this.historyIndex + 1);
      this.history.push([...this.currentCommit]);
      this.currentCommit = [];
    }

    if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
      const commit = this.history[this.historyIndex];
      this.historyIndex--;

      if (this.history.length === 1 && this.pushCount === 1) {
        this.undoneCommit = commit;
        this.pushCount = 0;
        return undefined;
      }

      if (this.pushCount > 1) {
        this.undoneCommit = commit;
        this.pushCount = 0;
        return commit.length > 0 ? commit[0] : undefined;
      }

      this.undoneCommit = commit;
      this.pushCount = 0;
      return undefined;
    }

    return undefined;
  }

  canRedo(): boolean {
    return this.undoneCommit.length > 0;
  }

  redo(): T | undefined {
    if (!this.canRedo()) return undefined;

    const commit = this.undoneCommit;
    this.historyIndex++;
    this.history.push([...commit]);
    this.undoneCommit = [];

    return commit[0];
  }
}