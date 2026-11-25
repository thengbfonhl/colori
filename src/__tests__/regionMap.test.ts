import { buildRegionPixels, computeProgress, decodeRegionIds, lastCountedId, maxRegionId, regionAt } from '../engine/regionMap';

// 4×4 map: ids 1 (background, left half), 2 (top right), 3 (bottom right), 4 = optional (one pixel).
const SIZE = 4;
// prettier-ignore
const IDS = new Uint16Array([
  1, 1, 2, 2,
  1, 1, 2, 2,
  1, 1, 3, 3,
  1, 1, 3, 4,
]);
const art = { regionCount: 2, optionalRegionCount: 1, backgroundRegion: 1 };

describe('decodeRegionIds', () => {
  it('reads id = R + 256·G', () => {
    const rgba = new Uint8Array([5, 0, 0, 255, 44, 2, 0, 255, 255, 255, 0, 255, 0, 1, 0, 255]);
    expect([...decodeRegionIds(rgba, 2)]).toEqual([5, 556, 65535, 256]);
  });
});

describe('regionAt', () => {
  it('finds the region under a point, fractional coordinates included', () => {
    expect(regionAt(IDS, SIZE, 0, 0)).toBe(1);
    expect(regionAt(IDS, SIZE, 3.9, 0.2)).toBe(2);
    expect(regionAt(IDS, SIZE, 3.99, 3.99)).toBe(4);
    expect(regionAt(IDS, SIZE, 2, 2)).toBe(3);
  });

  it('returns 0 outside the image', () => {
    expect(regionAt(IDS, SIZE, -0.1, 1)).toBe(0);
    expect(regionAt(IDS, SIZE, 4, 1)).toBe(0);
    expect(regionAt(IDS, SIZE, 1, 4)).toBe(0);
    expect(regionAt(IDS, SIZE, NaN, 1)).toBe(0);
  });
});

describe('buildRegionPixels', () => {
  it('lists the pixels of each region', () => {
    const { start, pixels } = buildRegionPixels(IDS, maxRegionId(art));
    const of = (id: number) => [...pixels.slice(start[id], start[id + 1])];
    expect(of(2)).toEqual([2, 3, 6, 7]);
    expect(of(3)).toEqual([10, 11, 14]);
    expect(of(4)).toEqual([15]);
    expect(of(1)).toHaveLength(8);
  });
});

describe('progress', () => {
  it('numbers counted regions first, then optional ones', () => {
    expect(lastCountedId(art)).toBe(3);
    expect(maxRegionId(art)).toBe(4);
    expect(lastCountedId({ regionCount: 2, optionalRegionCount: 0, backgroundRegion: null })).toBe(2);
  });

  it('ignores the background and optional regions', () => {
    expect(computeProgress(new Set(), art)).toBe(0);
    expect(computeProgress(new Set([1, 4]), art)).toBe(0);
    expect(computeProgress(new Set([2]), art)).toBe(0.5);
    expect(computeProgress(new Set([1, 2, 3, 4]), art)).toBe(1);
  });

  it('works without a background region', () => {
    const noBg = { regionCount: 2, optionalRegionCount: 0, backgroundRegion: null };
    expect(computeProgress(new Set([1]), noBg)).toBe(0.5);
    expect(computeProgress(new Set([1, 2]), noBg)).toBe(1);
  });

  it('is 0 for a picture without counted regions', () => {
    expect(computeProgress(new Set([1]), { regionCount: 0, optionalRegionCount: 0, backgroundRegion: null })).toBe(0);
  });
});
