// Zoom / pan maths for the colouring canvas (F03 "Zoom / Pan"). Pure functions marked as
// worklets so gesture handlers can run them on the UI thread; unit tested in Jest.
//
// The canvas is a square view of `side` points. At scale 1 the whole picture fills it.
// A view point (x, y) shows picture point ((x - tx) / scale, (y - ty) / scale) in view units.

export type ViewTransform = { scale: number; tx: number; ty: number };

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
/** Each +/− button press (F03). */
export const ZOOM_STEP = 1.5;

export const IDENTITY: ViewTransform = { scale: 1, tx: 0, ty: 0 };

/** Keeps the scale in [MIN, MAX] and the picture covering the whole view (no empty border). */
export function clampView(v: ViewTransform, side: number): ViewTransform {
  'worklet';
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale));
  const min = side - side * scale;
  return {
    scale,
    tx: Math.min(0, Math.max(min, v.tx)),
    ty: Math.min(0, Math.max(min, v.ty)),
  };
}

/** Zoom by `factor` keeping view point (fx, fy) on the same picture point. */
export function zoomAt(v: ViewTransform, factor: number, fx: number, fy: number, side: number): ViewTransform {
  'worklet';
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
  const k = scale / v.scale;
  return clampView({ scale, tx: fx - (fx - v.tx) * k, ty: fy - (fy - v.ty) * k }, side);
}

export function panBy(v: ViewTransform, dx: number, dy: number, side: number): ViewTransform {
  'worklet';
  return clampView({ scale: v.scale, tx: v.tx + dx, ty: v.ty + dy }, side);
}

/** View point → picture pixel, for a picture of `size` px drawn in a `side`-point view. */
export function viewToImage(x: number, y: number, v: ViewTransform, side: number, size: number): { x: number; y: number } {
  'worklet';
  const k = size / side;
  return { x: ((x - v.tx) / v.scale) * k, y: ((y - v.ty) / v.scale) * k };
}
