import { applyToFilled, type Op } from './ops';

// Undo / redo history (F03). Pure, unit tested; the paint images of the checkpoints are kept by
// PaintSession, which follows the `checkpoints` list of this state.
//
// - Operations are numbered from 1. `applied` = how many are applied now; the ones after it
//   can be redone. A new operation drops them (no redo branch).
// - Undo is limited to HISTORY_LIMIT steps.
// - Every CHECKPOINT_EVERY operations a checkpoint (picture + coloured regions) is kept, so an
//   undo replays at most CHECKPOINT_EVERY − 1 operations instead of the whole history.
//   Checkpoint 0 is the picture the screen was opened with.

export const HISTORY_LIMIT = 50;
export const CHECKPOINT_EVERY = 20;

export type Checkpoint = { index: number; filled: readonly number[] };

export type History = {
  /** ops[k] is operation number start + k + 1. */
  ops: readonly Op[];
  /** Operations before ops[0]; there is always a checkpoint at `start`. */
  start: number;
  applied: number;
  /** Undo never goes below this (HISTORY_LIMIT). */
  floor: number;
  /** Sorted by index. */
  checkpoints: readonly Checkpoint[];
};

export function createHistory(initialFilled: readonly number[]): History {
  return { ops: [], start: 0, applied: 0, floor: 0, checkpoints: [{ index: 0, filled: sorted(initialFilled) }] };
}

function sorted(ids: Iterable<number>): number[] {
  return [...ids].sort((a, b) => a - b);
}

/** Last checkpoint at or before operation `index`. */
function checkpointAt(h: History, index: number): Checkpoint {
  let best = h.checkpoints[0];
  for (const c of h.checkpoints) if (c.index <= index && c.index >= best.index) best = c;
  return best;
}

/** How to rebuild the picture at `applied`: start from checkpoint `from`, replay `ops`. */
export function replayPlan(h: History): { from: number; ops: readonly Op[] } {
  const cp = checkpointAt(h, h.applied);
  return { from: cp.index, ops: h.ops.slice(cp.index - h.start, h.applied - h.start) };
}

/** Coloured regions at `applied`. */
export function filledAt(h: History): Set<number> {
  const plan = replayPlan(h);
  const filled = new Set(checkpointAt(h, h.applied).filled);
  for (const op of plan.ops) applyToFilled(filled, op);
  return filled;
}

export const canUndo = (h: History) => h.applied > h.floor;
export const canRedo = (h: History) => h.applied < h.start + h.ops.length;

/** Adds a new operation after the current one; the redo branch is dropped. */
export function pushOp(h: History, op: Op): History {
  const ops = [...h.ops.slice(0, h.applied - h.start), op];
  const applied = h.applied + 1;
  // Checkpoints after the current operation belong to the dropped branch.
  let checkpoints = h.checkpoints.filter((c) => c.index <= h.applied);
  let next: History = { ...h, ops, applied, checkpoints };
  if (applied % CHECKPOINT_EVERY === 0) {
    checkpoints = [...checkpoints, { index: applied, filled: sorted(filledAt(next)) }];
    next = { ...next, checkpoints };
  }
  const floor = Math.max(h.floor, applied - HISTORY_LIMIT);
  // Forget what can no longer be undone: keep the last checkpoint at or before `floor`.
  const base = checkpointAt(next, floor).index;
  return {
    ops: ops.slice(base - h.start),
    start: base,
    applied,
    floor,
    checkpoints: checkpoints.filter((c) => c.index >= base),
  };
}

export function undo(h: History): History {
  return canUndo(h) ? { ...h, applied: h.applied - 1 } : h;
}

export function redo(h: History): History {
  return canRedo(h) ? { ...h, applied: h.applied + 1 } : h;
}

/** The operation a redo applies (the one right after `applied`). */
export function nextOp(h: History): Op | null {
  return canRedo(h) ? h.ops[h.applied - h.start] : null;
}
