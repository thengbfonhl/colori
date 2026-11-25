// Brush line smoothing (F03). Pure worklets: run on the UI thread while the finger moves
// (live line) and on the JS thread when the line is drawn into the paint layer, so both look
// exactly the same. Unit tested with a fake path.

/** Minimal path interface (Skia's SkPathBuilder has these methods). */
export interface PathSink {
  moveTo(x: number, y: number): unknown;
  lineTo(x: number, y: number): unknown;
  quadTo(x1: number, y1: number, x2: number, y2: number): unknown;
}

/** Points closer than this (picture px) to the previous one are skipped: less jitter, shorter paths. */
export const MIN_POINT_DISTANCE = 2;

/** Whether (x, y) is far enough from the last point of the flat list `points` to be added. */
export function shouldAddPoint(points: readonly number[], x: number, y: number, min = MIN_POINT_DISTANCE): boolean {
  'worklet';
  const n = points.length;
  if (n < 2) return true;
  const dx = x - points[n - 2];
  const dy = y - points[n - 1];
  return dx * dx + dy * dy >= min * min;
}

/**
 * Traces a smooth line through the points (flat [x0, y0, x1, y1, …]): quadratic curves through
 * the midpoints of consecutive points, with each point as control point. The line starts and
 * ends exactly at the first and last point. One point gives a tiny segment, which a round cap
 * turns into a dot.
 */
export function traceStroke(points: readonly number[], path: PathSink): void {
  'worklet';
  const n = Math.floor(points.length / 2);
  if (n === 0) return;
  const x0 = points[0];
  const y0 = points[1];
  path.moveTo(x0, y0);
  if (n === 1) {
    path.lineTo(x0 + 0.01, y0);
    return;
  }
  if (n === 2) {
    path.lineTo(points[2], points[3]);
    return;
  }
  path.lineTo((x0 + points[2]) / 2, (y0 + points[3]) / 2);
  for (let i = 1; i < n - 1; i++) {
    const cx = points[2 * i];
    const cy = points[2 * i + 1];
    path.quadTo(cx, cy, (cx + points[2 * i + 2]) / 2, (cy + points[2 * i + 3]) / 2);
  }
  path.lineTo(points[2 * n - 2], points[2 * n - 1]);
}
