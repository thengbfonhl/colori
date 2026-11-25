import type { SkImage } from '@shopify/react-native-skia';
import {
  canRedo,
  canUndo,
  createHistory,
  filledAt,
  nextOp,
  pushOp,
  redo as redoHistory,
  replayPlan,
  undo as undoHistory,
  type History,
} from './history';
import type { Op } from './ops';
import type { PaintLayer } from './paintLayer';

/**
 * One editing session on a paint layer (F03): applies operations, undo / redo by replaying from
 * the nearest checkpoint picture. Undo / redo only lives while the screen is open.
 */
export class PaintSession {
  private history: History;
  /** Checkpoint pictures, by operation index (follows history.checkpoints). */
  private readonly images = new Map<number, SkImage>();
  private filledCache: ReadonlySet<number>;

  constructor(
    private readonly layer: PaintLayer,
    initialFilled: readonly number[],
  ) {
    this.history = createHistory(initialFilled);
    this.images.set(0, layer.image());
    this.filledCache = filledAt(this.history);
  }

  get image(): SkImage {
    return this.layer.image();
  }
  get filled(): ReadonlySet<number> {
    return this.filledCache;
  }
  get canUndo(): boolean {
    return canUndo(this.history);
  }
  get canRedo(): boolean {
    return canRedo(this.history);
  }
  /** Operations applied since the screen was opened (after undo: fewer). */
  get applied(): number {
    return this.history.applied;
  }

  apply(op: Op): void {
    this.layer.draw(op);
    this.layer.commit();
    this.setHistory(pushOp(this.history, op));
  }

  undo(): boolean {
    const next = undoHistory(this.history);
    if (next === this.history) return false;
    this.history = next;
    const plan = replayPlan(next);
    this.layer.reset(this.images.get(plan.from) ?? null);
    for (const op of plan.ops) this.layer.draw(op);
    this.layer.commit();
    this.setHistory(next);
    return true;
  }

  redo(): boolean {
    const op = nextOp(this.history);
    if (!op) return false;
    this.layer.draw(op);
    this.layer.commit();
    this.setHistory(redoHistory(this.history));
    return true;
  }

  encodePng(): Uint8Array {
    return this.layer.encodePng();
  }

  private setHistory(h: History) {
    this.history = h;
    this.filledCache = filledAt(h);
    const keep = new Set(h.checkpoints.map((c) => c.index));
    // A new checkpoint is always at the current operation: keep the picture just committed.
    if (keep.has(h.applied) && !this.images.has(h.applied)) this.images.set(h.applied, this.layer.image());
    for (const [index, image] of this.images) {
      if (keep.has(index)) continue;
      this.images.delete(index);
      if (image !== this.layer.image()) image.dispose?.();
    }
  }
}
