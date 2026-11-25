// Drawing operations on the paint layer (F03 "Undo / Redo"). Pure data + pure rules, unit tested.
// The paint layer is rebuilt by replaying these, so every operation must be deterministic.

/** Filling with white clears a region: it no longer counts as coloured (F02). */
export const WHITE = '#FFFFFF';

// Widths in px of a 1024 px picture. Chosen with a slider (A26); every screen opens at the default
// ("Vừa"), which is the middle of the range.
/** Default brush width (F03: fits a child's finger). */
export const BRUSH_WIDTH = 24;
export const BRUSH_RANGE = { min: 8, max: 40 } as const;
/** Default eraser width (A25: twice the brush, so erasing is quick). */
export const ERASER_WIDTH = 48;
export const ERASER_RANGE = { min: 16, max: 80 } as const;
/** Picture size the widths above are given for. */
export const REFERENCE_SIZE = 1024;

/** Tap the bucket (or the eraser on a region): the whole region becomes `color`. */
export type FillOp = { type: 'fill'; region: number; color: string };

/** A brush or eraser line. */
export type StrokeOp = {
  type: 'stroke';
  /** Flat [x0, y0, x1, y1, …] in picture px. One point = a dot. */
  points: number[];
  color: string;
  /** Line width in picture px. */
  width: number;
  /** "Tô không tràn viền": only paints inside this region. 0 = anywhere. */
  clip: number;
  /** Region under the first point (0 = none, e.g. free drawing). A brush line counts it as coloured (F02). */
  region: number;
  /** Eraser line (paints white, never counts a region as coloured). */
  erase: boolean;
};

/** "Xoá hết" in free drawing (S06). */
export type ClearOp = { type: 'clear' };

export type Op = FillOp | StrokeOp | ClearOp;

const isWhite = (color: string) => color.toUpperCase() === WHITE;

/**
 * Coloured regions after `op` (F02 "Tiến độ"):
 * - fill: the region is coloured, or cleared when filled with white (eraser tap);
 * - brush line: the region where it starts becomes coloured (white ink does not count);
 * - eraser line: no change (only an eraser TAP clears a region, F02);
 * - clear: nothing is coloured.
 */
export function applyToFilled(filled: Set<number>, op: Op): Set<number> {
  switch (op.type) {
    case 'fill':
      if (isWhite(op.color)) filled.delete(op.region);
      else filled.add(op.region);
      return filled;
    case 'stroke':
      if (!op.erase && op.region > 0 && !isWhite(op.color)) filled.add(op.region);
      return filled;
    case 'clear':
      filled.clear();
      return filled;
  }
}

/** Width in px for a picture of `size` px. */
export function scaledWidth(width: number, size: number): number {
  return (width * size) / REFERENCE_SIZE;
}
