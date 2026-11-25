// Region map helpers (docs/features/F02). Pure functions, unit tested.
// regions.png encodes the region id of every pixel as id = R + 256·G (F01); 0 never occurs
// in a built map (every pixel, line pixels included, belongs to a region).

/** RGBA pixels of regions.png → region id per pixel. */
export function decodeRegionIds(rgba: Uint8Array, size: number): Uint16Array {
  const ids = new Uint16Array(size * size);
  for (let i = 0, p = 0; i < ids.length; i++, p += 4) ids[i] = rgba[p] + 256 * rgba[p + 1];
  return ids;
}

/** Region id at image coordinates (px, may be fractional). 0 when outside the image. */
export function regionAt(ids: Uint16Array, size: number, x: number, y: number): number {
  if (!(x >= 0 && y >= 0 && x < size && y < size)) return 0;
  return ids[Math.floor(y) * size + Math.floor(x)];
}

/** Pixel indices of every region, CSR layout: pixels of id k are pixels[start[k] .. start[k+1]). */
export type RegionPixels = { start: Uint32Array; pixels: Uint32Array };

export function buildRegionPixels(ids: Uint16Array, maxId: number): RegionPixels {
  const count = new Uint32Array(maxId + 2);
  for (let i = 0; i < ids.length; i++) count[ids[i] + 1]++;
  for (let k = 1; k < count.length; k++) count[k] += count[k - 1];
  const start = Uint32Array.from(count);
  const cursor = Uint32Array.from(count);
  const pixels = new Uint32Array(ids.length);
  for (let i = 0; i < ids.length; i++) pixels[cursor[ids[i]]++] = i;
  return { start, pixels };
}

export type RegionCounts = { regionCount: number; optionalRegionCount: number; backgroundRegion: number | null };

/** Highest id among regions counted in % (the background is one of them). */
export function lastCountedId(a: RegionCounts): number {
  return a.regionCount + (a.backgroundRegion ? 1 : 0);
}

/** Highest region id of an artwork: counted regions first, then optional small ones (F01). */
export function maxRegionId(a: RegionCounts): number {
  return lastCountedId(a) + a.optionalRegionCount;
}

/**
 * Share of counted regions filled, 0..1. The background (Q7) and the optional small regions
 * (decision 16/11) never count, so a child is never stuck at 99% because of one tiny petal.
 */
export function computeProgress(filled: ReadonlySet<number>, a: RegionCounts): number {
  if (a.regionCount <= 0) return 0;
  const last = lastCountedId(a);
  let n = 0;
  for (const id of filled) if (id > 0 && id <= last && id !== a.backgroundRegion) n++;
  return Math.min(1, n / a.regionCount);
}
