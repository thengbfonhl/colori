// Image processing for the artwork pipeline (docs/features/F01). Pure functions on typed
// arrays, no file system, so they can be unit tested with synthetic images.
//
// Conventions: a "mask" is a Uint8Array of size w*h with 1 = line (ink), 0 = paper.
// A "label map" is an Int32Array of size w*h with 0 = no region, 1..N = region id.

/**
 * Luma 0..255 (0 = black) from RGBA pixels. Transparent pixels count as white paper.
 * @param {Uint8Array} rgba
 */
export function lumaFromRgba(rgba, w, h) {
  const out = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    const l = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
    const a = rgba[p + 3] / 255;
    out[i] = Math.round(255 - a * (255 - l));
  }
  return out;
}

/**
 * Box-average downsample of one 8-bit channel from (w, h) to (tw, th). tw <= w, th <= h.
 * Each source pixel goes to bin floor(x * tw / w).
 */
export function downsampleAverage(src, w, h, tw, th) {
  if (tw === w && th === h) return Uint8Array.from(src);
  const sum = new Float64Array(tw * th);
  const count = new Uint32Array(tw * th);
  for (let y = 0; y < h; y++) {
    const ty = Math.floor((y * th) / h);
    for (let x = 0; x < w; x++) {
      const t = ty * tw + Math.floor((x * tw) / w);
      sum[t] += src[y * w + x];
      count[t]++;
    }
  }
  const out = new Uint8Array(tw * th);
  for (let i = 0; i < out.length; i++) out[i] = Math.round(sum[i] / count[i]);
  return out;
}

/** Downsample a 0/1 mask: a target pixel is set if ANY source pixel in its bin is set (keeps thin lines connected). */
export function downsampleAny(mask, w, h, tw, th) {
  if (tw === w && th === h) return Uint8Array.from(mask);
  const out = new Uint8Array(tw * th);
  for (let y = 0; y < h; y++) {
    const row = Math.floor((y * th) / h) * tw;
    for (let x = 0; x < w; x++) if (mask[y * w + x]) out[row + Math.floor((x * tw) / w)] = 1;
  }
  return out;
}

/** 1 where luma < threshold * 255. */
export function thresholdMask(luma, threshold) {
  const limit = threshold * 255;
  const out = new Uint8Array(luma.length);
  for (let i = 0; i < luma.length; i++) out[i] = luma[i] < limit ? 1 : 0;
  return out;
}

// Square-kernel max / min filter, separable (rows then columns). `outside` is the value
// assumed beyond the image border.
function filter1d(src, w, h, r, isMax, horizontal, outside) {
  const out = new Uint8Array(src.length);
  const [len, lines] = horizontal ? [w, h] : [h, w];
  for (let line = 0; line < lines; line++) {
    for (let i = 0; i < len; i++) {
      let v = isMax ? 0 : 1;
      for (let k = i - r; k <= i + r; k++) {
        const s = k < 0 || k >= len ? outside : horizontal ? src[line * w + k] : src[k * w + line];
        if (isMax ? s > v : s < v) {
          v = s;
          if (isMax ? v === 1 : v === 0) break;
        }
      }
      out[horizontal ? line * w + i : i * w + line] = v;
    }
  }
  return out;
}

export function dilate(mask, w, h, r) {
  if (r <= 0) return Uint8Array.from(mask);
  return filter1d(filter1d(mask, w, h, r, true, true, 0), w, h, r, true, false, 0);
}

export function erode(mask, w, h, r) {
  if (r <= 0) return Uint8Array.from(mask);
  // Outside counts as line so strokes touching the border are not eaten away.
  return filter1d(filter1d(mask, w, h, r, false, true, 1), w, h, r, false, false, 1);
}

/** Morphological closing (dilate then erode): seals gaps narrower than about 2r between strokes. */
export function close(mask, w, h, r) {
  return erode(dilate(mask, w, h, r), w, h, r);
}

/**
 * 4-connected components of paper pixels (mask = 0).
 * @returns {{ labels: Int32Array, count: number, areas: number[] }} areas[id] = pixel count (areas[0] unused)
 */
export function labelRegions(mask, w, h) {
  const labels = new Int32Array(w * h);
  const stack = new Int32Array(w * h);
  const areas = [0];
  let count = 0;
  for (let start = 0; start < labels.length; start++) {
    if (mask[start] || labels[start]) continue;
    const id = ++count;
    let area = 0;
    let top = 0;
    stack[top++] = start;
    labels[start] = id;
    while (top) {
      const p = stack[--top];
      area++;
      const x = p % w;
      if (x > 0 && !mask[p - 1] && !labels[p - 1]) (labels[p - 1] = id), (stack[top++] = p - 1);
      if (x < w - 1 && !mask[p + 1] && !labels[p + 1]) (labels[p + 1] = id), (stack[top++] = p + 1);
      if (p >= w && !mask[p - w] && !labels[p - w]) (labels[p - w] = id), (stack[top++] = p - w);
      if (p < labels.length - w && !mask[p + w] && !labels[p + w]) (labels[p + w] = id), (stack[top++] = p + w);
    }
    areas.push(area);
  }
  return { labels, count, areas };
}

/**
 * Chamfer distance (px) from every paper pixel (mask 0) to the nearest line pixel (mask 1).
 * Two passes with weights 1 (side) and √2 (diagonal); line pixels are 0.
 */
export function distanceToLine(mask, w, h) {
  const INF = 1e9;
  const D = Math.SQRT2;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : INF;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1);
      if (y > 0) {
        v = Math.min(v, d[i - w] + 1);
        if (x > 0) v = Math.min(v, d[i - w - 1] + D);
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + D);
      }
      d[i] = v;
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!d[i]) continue;
      let v = d[i];
      if (x < w - 1) v = Math.min(v, d[i + 1] + 1);
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 1);
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + D);
        if (x > 0) v = Math.min(v, d[i + w - 1] + D);
      }
      d[i] = v;
    }
  return d;
}

/** Per region: the largest distance to a line = half its thickest width (thickness[id]). */
export function regionThickness(labels, dist, count) {
  const t = new Float32Array(count + 1);
  for (let i = 0; i < labels.length; i++) if (labels[i] && dist[i] > t[labels[i]]) t[labels[i]] = dist[i];
  return t;
}

/**
 * Renumbers regions by size class (decision 16/11, replaces "merge small regions" of F01):
 * - area < noiseArea, or thinner than sliverRadius everywhere (gaps between strokes that
 *   almost touch, acute corners): become line (label 0), so they take the colour of the
 *   neighbouring region instead of staying as white holes;
 * - noiseArea ≤ area < minArea: OPTIONAL regions, still their own region (a fill never
 *   spills into them) but not counted in the progress %;
 * - area ≥ minArea: COUNTED regions.
 * Counted regions get ids 1..counted, optional ones counted+1..count, each in scan order.
 */
export function classifyRegions(labels, areas, minArea, noiseArea, thickness = null, sliverRadius = 0) {
  const remap = new Int32Array(areas.length);
  const newAreas = [0];
  const isNoise = (id) => areas[id] < noiseArea || (thickness !== null && thickness[id] < sliverRadius);
  let counted = 0;
  for (let id = 1; id < areas.length; id++) if (!isNoise(id) && areas[id] >= minArea) (remap[id] = ++counted), newAreas.push(areas[id]);
  let next = counted;
  for (let id = 1; id < areas.length; id++) if (!isNoise(id) && areas[id] < minArea) (remap[id] = ++next), newAreas.push(areas[id]);
  for (let i = 0; i < labels.length; i++) labels[i] = labels[i] ? remap[labels[i]] : 0;
  return { labels, count: next, counted, areas: newAreas, noise: areas.length - 1 - next };
}

/** Multi-source BFS: every label-0 pixel takes the id of the nearest region (4-neighbour steps). */
function bfsGrow(labels, w, h, passable) {
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < labels.length; i++) if (labels[i]) queue[tail++] = i;
  if (tail === 0) return;
  const free = (q) => !labels[q] && (!passable || passable[q]);
  while (head < tail) {
    const p = queue[head++];
    const id = labels[p];
    const x = p % w;
    if (x > 0 && free(p - 1)) (labels[p - 1] = id), (queue[tail++] = p - 1);
    if (x < w - 1 && free(p + 1)) (labels[p + 1] = id), (queue[tail++] = p + 1);
    if (p >= w && free(p - w)) (labels[p - w] = id), (queue[tail++] = p - w);
    if (p < labels.length - w && free(p + w)) (labels[p + w] = id), (queue[tail++] = p + w);
  }
}

/**
 * Gives every label-0 pixel the id of a region, in two passes (fix 16/11 for colour showing
 * on the wrong side of thin strokes at sharp tips):
 * 1. only through PAPER pixels (paper = 1): pixels the closing turned into line in acute
 *    corners go to the region they really belong to, never across a stroke;
 * 2. then through everything left (the ink): each stroke is split between its two sides.
 */
export function growIntoLines(labels, w, h, paper = null) {
  if (paper) bfsGrow(labels, w, h, paper);
  bfsGrow(labels, w, h, null);
  return labels;
}

/** Largest region with id <= maxId touching the image border, or null. */
export function findBackground(labels, areas, w, h, maxId = Infinity) {
  const touching = new Set();
  for (let x = 0; x < w; x++) touching.add(labels[x]).add(labels[(h - 1) * w + x]);
  for (let y = 0; y < h; y++) touching.add(labels[y * w]).add(labels[y * w + w - 1]);
  touching.delete(0);
  let best = null;
  for (const id of touching) if (id <= maxId && (best === null || areas[id] > areas[best])) best = id;
  return best;
}

/**
 * Share of the image covered by solid gray patches (shading), ignoring the 1–2 px gray of
 * anti-aliased edges: gray pixels that survive an erosion of radius r.
 */
export function grayBlobRatio(luma, w, h, r = 2) {
  const gray = new Uint8Array(luma.length);
  for (let i = 0; i < luma.length; i++) gray[i] = luma[i] >= 64 && luma[i] <= 191 ? 1 : 0;
  const solid = filter1d(filter1d(gray, w, h, r, false, true, 0), w, h, r, false, false, 0);
  let n = 0;
  for (let i = 0; i < solid.length; i++) n += solid[i];
  return n / solid.length;
}

/**
 * Whole segmentation at the region-map size (steps 3–8 of F01).
 * @param {Uint8Array} lineMask mask at size×size
 * @param {{ size: number, closeRadius: number, minArea: number, noiseArea: number, sliverRadius?: number, paper?: Uint8Array | null }} opts
 *   paper: 1 where the pixel is mostly paper (by average darkness), used by the first grow pass.
 */
export function segment(lineMask, { size, closeRadius, minArea, noiseArea, sliverRadius = 0, paper = null }) {
  const closed = close(lineMask, size, size, closeRadius);
  const raw = labelRegions(closed, size, size);
  const thickness = sliverRadius > 0 ? regionThickness(raw.labels, distanceToLine(closed, size, size), raw.count) : null;
  const { labels, count, counted, areas, noise } = classifyRegions(raw.labels, raw.areas, minArea, noiseArea, thickness, sliverRadius);
  const preGrow = Int32Array.from(labels);
  // The background is a large region, so it is always one of the counted ones.
  const background = counted ? findBackground(labels, areas, size, size, counted) : null;
  growIntoLines(labels, size, size, paper);
  return { labels, preGrow, closed, count, counted, areas, background, noise };
}

/** Region map pixels: id = R + 256·G, B = 0, A = 255. */
export function encodeRegions(labels) {
  const rgba = new Uint8Array(labels.length * 4);
  for (let i = 0, p = 0; i < labels.length; i++, p += 4) {
    rgba[p] = labels[i] & 255;
    rgba[p + 1] = (labels[i] >> 8) & 255;
    rgba[p + 3] = 255;
  }
  return rgba;
}

export function decodeRegion(rgba, index) {
  return rgba[index * 4] + 256 * rgba[index * 4 + 1];
}

/** Ink darkness 0..255 → line alpha, with paper noise below `low` removed and strokes above `high` fully opaque. */
export function lineAlpha(luma, low, high) {
  const out = new Uint8Array(luma.length);
  const lo = low * 255;
  const span = (high - low) * 255;
  for (let i = 0; i < luma.length; i++) {
    const d = 255 - luma[i];
    out[i] = d <= lo ? 0 : d >= lo + span ? 255 : Math.round(((d - lo) / span) * 255);
  }
  return out;
}

/** Stable pseudo-random colour per region id for debug.png. */
export function debugColor(id) {
  let x = (id * 2654435761) >>> 0;
  x ^= x >>> 15;
  return [80 + (x & 127), 80 + ((x >>> 8) & 127), 80 + ((x >>> 16) & 127)];
}
