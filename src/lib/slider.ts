// Slider maths (pure, unit tested): position on the track ↔ value.

export type Range = { min: number; max: number };

const clamp01 = (f: number) => Math.min(1, Math.max(0, f));

/** Value for a position `fraction` (0 = left, 1 = right) of the track, rounded to whole units. */
export function valueAt(fraction: number, r: Range): number {
  return Math.round(r.min + clamp01(fraction) * (r.max - r.min));
}

/** Position (0..1) of `value` on the track. */
export function fractionOf(value: number, r: Range): number {
  return r.max === r.min ? 0 : clamp01((value - r.min) / (r.max - r.min));
}

/** Value one step up / down (accessibility "adjustable"), kept in range. */
export function stepValue(value: number, r: Range, direction: 1 | -1, steps = 8): number {
  const step = Math.max(1, Math.round((r.max - r.min) / steps));
  return Math.min(r.max, Math.max(r.min, value + direction * step));
}
