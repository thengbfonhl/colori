import { clampView, IDENTITY, MAX_SCALE, panBy, viewToImage, zoomAt, ZOOM_STEP } from '../engine/transform';

const SIDE = 300;
const SIZE = 1024;

describe('viewToImage', () => {
  it('maps the view to the picture at 1×', () => {
    expect(viewToImage(0, 0, IDENTITY, SIDE, SIZE)).toEqual({ x: 0, y: 0 });
    expect(viewToImage(150, 300, IDENTITY, SIDE, SIZE)).toEqual({ x: 512, y: 1024 });
  });

  it('follows zoom and pan', () => {
    const v = { scale: 2, tx: -300, ty: -150 }; // picture shown 2×, scrolled to its right half, middle band
    expect(viewToImage(0, 0, v, SIDE, SIZE)).toEqual({ x: 512, y: 256 });
    expect(viewToImage(300, 300, v, SIDE, SIZE)).toEqual({ x: 1024, y: 768 });
  });
});

describe('zoomAt', () => {
  it('keeps the focal point on the same picture point', () => {
    const before = viewToImage(100, 80, IDENTITY, SIDE, SIZE);
    const v = zoomAt(IDENTITY, ZOOM_STEP, 100, 80, SIDE);
    expect(v.scale).toBe(1.5);
    const after = viewToImage(100, 80, v, SIDE, SIZE);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('stays between 1× and 4×', () => {
    let v = IDENTITY;
    for (let i = 0; i < 10; i++) v = zoomAt(v, ZOOM_STEP, 150, 150, SIDE);
    expect(v.scale).toBe(MAX_SCALE);
    for (let i = 0; i < 10; i++) v = zoomAt(v, 1 / ZOOM_STEP, 150, 150, SIDE);
    expect(v).toEqual(IDENTITY);
  });

  it('zooming out near an edge never leaves an empty border', () => {
    const v = zoomAt({ scale: 4, tx: -900, ty: 0 }, 1 / 2, 0, 0, SIDE);
    expect(v.scale).toBe(2);
    expect(v.tx).toBeGreaterThanOrEqual(SIDE - SIDE * 2);
    expect(v.tx).toBeLessThanOrEqual(0);
  });
});

describe('panBy / clampView', () => {
  it('cannot pan at 1×', () => {
    expect(panBy(IDENTITY, 50, -50, SIDE)).toEqual(IDENTITY);
  });

  it('pans inside the picture when zoomed', () => {
    const v = panBy({ scale: 2, tx: -100, ty: -100 }, -50, 30, SIDE);
    expect(v).toEqual({ scale: 2, tx: -150, ty: -70 });
    expect(panBy(v, -1000, 1000, SIDE)).toEqual({ scale: 2, tx: -300, ty: 0 });
  });

  it('clamps a scale below 1', () => {
    expect(clampView({ scale: 0.5, tx: 10, ty: 10 }, SIDE)).toEqual(IDENTITY);
  });
});
