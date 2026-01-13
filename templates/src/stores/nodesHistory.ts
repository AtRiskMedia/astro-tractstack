import { atom, type WritableAtom } from 'nanostores';
import type { NodesContext } from '@/stores/nodes';

export const VERBOSE = false;
const COALESCE_WINDOW = 16000;

export enum PatchOp {
  ADD,
  REMOVE,
  REPLACE,
}

export type HistoryPatch = {
  op: PatchOp;
  undo: (ctx: NodesContext) => void;
  redo: (ctx: NodesContext) => void;
};

export class NodesHistory {
  public history: WritableAtom<HistoryPatch[]> = atom([]);
  public headIndex: WritableAtom<number> = atom(0);

  protected _ctx: NodesContext;
  protected _maxBuffer: number;
  public lastPatchTime: number = 0;

  constructor(ctx: NodesContext, maxBuffer: number) {
    this._ctx = ctx;
    this._maxBuffer = maxBuffer;
  }

  canUndo(): boolean {
    return (
      this.history.get().length > 0 &&
      this.headIndex.get() < this.history.get().length
    );
  }

  canRedo(): boolean {
    return this.history.get().length > 0 && this.headIndex.get() > 0;
  }

  addPatch(patch: HistoryPatch, options?: { merge?: boolean }) {
    const now = Date.now();
    const timeDelta = now - this.lastPatchTime;
    const shouldMerge =
      options?.merge !== false &&
      timeDelta < COALESCE_WINDOW &&
      this.headIndex.get() === 0 && // Only merge if we are at the tip of history
      this.history.get().length > 0;

    if (shouldMerge) {
      if (VERBOSE) {
        console.log(
          `[History] Merging patch (Delta: ${timeDelta}ms < ${COALESCE_WINDOW}ms)`
        );
      }

      const currentHistory = [...this.history.get()];
      const previousPatch = currentHistory[0];

      // Create a composite patch that executes both actions
      const mergedPatch: HistoryPatch = {
        op: PatchOp.REPLACE, // Merged operations are generally treated as complex replacements
        undo: (ctx) => {
          // Reverse order: Undo the new action, then undo the old action
          patch.undo(ctx);
          previousPatch.undo(ctx);
        },
        redo: (ctx) => {
          // Forward order: Redo the old action, then redo the new action
          previousPatch.redo(ctx);
          patch.redo(ctx);
        },
      };

      currentHistory[0] = mergedPatch;
      this.history.set(currentHistory);
      // We do NOT update lastPatchTime on merge. This keeps the window anchored to the start of the "thought".
    } else {
      if (VERBOSE) {
        console.log(`[History] Pushing new patch (Delta: ${timeDelta}ms)`);
      }

      // If we are not at the tip (we undid something), verify we clear the future
      while (this.headIndex.get() !== 0) {
        this.history.get().shift();
        this.headIndex.set(this.headIndex.get() - 1);
      }

      const newHistory = [patch, ...this.history.get()];
      if (newHistory.length > this._maxBuffer) {
        newHistory.pop();
      }

      this.history.set(newHistory);
      this.lastPatchTime = now;
    }
  }

  undo() {
    if (this.headIndex.get() < this.history.get().length) {
      this.history.get()[this.headIndex.get()].undo(this._ctx);
      this.headIndex.set(this.headIndex.get() + 1);
    }
  }

  redo() {
    if (this.headIndex.get() > 0) {
      this.history.get()[this.headIndex.get() - 1].redo(this._ctx);
      this.headIndex.set(this.headIndex.get() - 1);
    }
  }

  clearHistory() {
    this.history.set([]);
    this.headIndex.set(0);
    this.lastPatchTime = 0;
  }
}
