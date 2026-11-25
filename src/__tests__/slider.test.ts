import { BRUSH_RANGE, BRUSH_WIDTH, ERASER_RANGE, ERASER_WIDTH } from '../engine/ops';
import { fractionOf, stepValue, valueAt } from '../lib/slider';

describe('size slider (A26)', () => {
  it('maps the track position to a whole-px width, clamped to the range', () => {
    expect(valueAt(0, BRUSH_RANGE)).toBe(BRUSH_RANGE.min);
    expect(valueAt(1, BRUSH_RANGE)).toBe(BRUSH_RANGE.max);
    expect(valueAt(-0.3, BRUSH_RANGE)).toBe(BRUSH_RANGE.min);
    expect(valueAt(1.7, BRUSH_RANGE)).toBe(BRUSH_RANGE.max);
    expect(Number.isInteger(valueAt(0.123, ERASER_RANGE))).toBe(true);
  });

  it('starts in the middle ("Vừa" = the former fixed sizes)', () => {
    expect(fractionOf(BRUSH_WIDTH, BRUSH_RANGE)).toBeCloseTo(0.5);
    expect(fractionOf(ERASER_WIDTH, ERASER_RANGE)).toBeCloseTo(0.5);
    expect(valueAt(0.5, BRUSH_RANGE)).toBe(BRUSH_WIDTH);
    expect(valueAt(0.5, ERASER_RANGE)).toBe(ERASER_WIDTH);
  });

  it('round-trips value → position → value', () => {
    for (let v = ERASER_RANGE.min; v <= ERASER_RANGE.max; v++) expect(valueAt(fractionOf(v, ERASER_RANGE), ERASER_RANGE)).toBe(v);
  });

  it('steps up / down for accessibility, never out of range', () => {
    expect(stepValue(24, BRUSH_RANGE, 1)).toBe(28);
    expect(stepValue(24, BRUSH_RANGE, -1)).toBe(20);
    expect(stepValue(BRUSH_RANGE.max, BRUSH_RANGE, 1)).toBe(BRUSH_RANGE.max);
    expect(stepValue(BRUSH_RANGE.min, BRUSH_RANGE, -1)).toBe(BRUSH_RANGE.min);
  });
});
