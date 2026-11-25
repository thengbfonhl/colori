// Unit tests for the artwork pipeline with synthetic images drawn in code (F01 §Test).
// Run: node --test scripts/__tests__/ (part of `npm run check`).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  close,
  decodeRegion,
  downsampleAny,
  encodeRegions,
  grayBlobRatio,
  lineAlpha,
  lumaFromRgba,
  segment,
  thresholdMask,
} from '../lib/artwork-core.mjs';
import { parseCsv, readSources, releaseErrors } from '../lib/sources.mjs';

const N = 100;
const blank = () => new Uint8Array(N * N);
const at = (x, y) => y * N + x;

/** Stroke a rectangle outline of thickness t. */
function rect(mask, x0, y0, x1, y1, t = 2) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) if (x < x0 + t || x > x1 - t || y < y0 + t || y > y1 - t) mask[at(x, y)] = 1;
  return mask;
}

/** Stroke a circle outline (radius r, thickness t). */
function circle(mask, cx, cy, r, t = 2) {
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r && d > r - t) mask[at(x, y)] = 1;
    }
  return mask;
}

const opts = { size: N, closeRadius: 1, minArea: 20, noiseArea: 5 };

describe('segment', () => {
  it('counts regions: outside, ring between square and circle, inside circle', () => {
    const seg = segment(circle(rect(blank(), 10, 10, 89, 89), 50, 50, 25), opts);
    assert.equal(seg.count, 3);
    // Background = largest region touching the border = the outside.
    assert.equal(seg.labels[at(0, 0)], seg.background);
    assert.notEqual(seg.labels[at(50, 50)], seg.labels[at(15, 15)]);
  });

  it('closes a 1 px gap in a stroke', () => {
    const mask = rect(blank(), 20, 20, 79, 79);
    mask[at(50, 20)] = 0; // 1 px gap in the top edge, both stroke rows
    mask[at(50, 21)] = 0;
    assert.equal(segment(mask, { ...opts, closeRadius: 0 }).count, 1, 'without closing the inside leaks out');
    assert.equal(segment(mask, opts).count, 2, 'closing keeps inside and outside apart');
  });

  it('keeps a small closed shape as its own OPTIONAL region (never filled by its neighbour)', () => {
    const mask = rect(rect(blank(), 10, 10, 89, 89), 40, 40, 45, 45, 1); // 4×4 = 16 px inside the small box
    const seg = segment(mask, opts);
    assert.equal(seg.count, 3);
    assert.equal(seg.counted, 2, 'outside + big box are counted');
    const small = seg.labels[at(42, 42)];
    assert.equal(small, 3, 'optional regions are numbered after the counted ones');
    assert.notEqual(small, seg.labels[at(20, 20)]);
  });

  it('merges specks smaller than noiseArea into the line', () => {
    const mask = rect(rect(blank(), 10, 10, 89, 89), 40, 40, 43, 43, 1); // 2×2 = 4 px inside
    const seg = segment(mask, { ...opts, closeRadius: 0 }); // closing alone would already fill a 2 px hole
    assert.equal(seg.count, 2);
    assert.equal(seg.noise, 1);
    assert.equal(seg.labels[at(41, 41)], seg.labels[at(20, 20)], 'the speck takes the surrounding region');
  });

  it('gives every pixel, including line pixels, the id of a nearby region', () => {
    const seg = segment(circle(rect(blank(), 10, 10, 89, 89), 50, 50, 25, 4), opts);
    assert.ok(seg.labels.every((id) => id > 0));
    // A pixel on the inner edge of the circle stroke belongs to the inside region.
    assert.equal(seg.labels[at(50, 50 - 22)], seg.labels[at(50, 50)]);
    // A pixel on the outer edge belongs to the ring.
    assert.equal(seg.labels[at(50, 50 - 25)], seg.labels[at(50, 20)]);
  });

  it('has no background when no region touches the border', () => {
    const mask = rect(blank(), 0, 0, 99, 99, 3);
    const seg = segment(mask, opts);
    assert.equal(seg.count, 1);
    assert.equal(seg.background, null);
  });
});

describe('pixel helpers', () => {
  it('treats transparent pixels as white paper', () => {
    const rgba = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 255, 255, 255, 255, 255]);
    assert.deepEqual([...lumaFromRgba(rgba, 3, 1)], [255, 0, 255]);
  });

  it('downsamples masks with "any", so a 1 px line survives', () => {
    const mask = new Uint8Array(16);
    mask[5] = 1; // (1,1) in 4×4
    assert.deepEqual([...downsampleAny(mask, 4, 4, 2, 2)], [1, 0, 0, 0]);
  });

  it('thresholds at 50% by default', () => {
    assert.deepEqual([...thresholdMask(new Uint8Array([0, 127, 128, 255]), 0.5)], [1, 1, 0, 0]);
  });

  it('closing seals a gap but keeps a wide channel open', () => {
    const mask = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (const x of [10, 12, 40, 50]) mask[at(x, y)] = 1; // gap of 1 px, then 9 px
    const closed = close(mask, N, N, 1);
    assert.equal(closed[at(11, 50)], 1);
    assert.equal(closed[at(45, 50)], 0);
  });

  it('encodes region ids above 255 in two channels', () => {
    const rgba = encodeRegions(new Int32Array([1, 255, 256, 700]));
    assert.deepEqual([0, 1, 2, 3].map((i) => decodeRegion(rgba, i)), [1, 255, 256, 700]);
    assert.equal(rgba[3], 255);
    assert.equal(rgba[2], 0);
  });

  it('removes paper noise and saturates strokes in the line alpha', () => {
    assert.deepEqual([...lineAlpha(new Uint8Array([255, 245, 0, 100]), 0.12, 0.75)], [0, 0, 255, 197]);
  });

  it('detects solid gray patches but not anti-aliased edges', () => {
    const luma = new Uint8Array(N * N).fill(255);
    for (let x = 0; x < N; x++) luma[at(x, 50)] = 128; // 1 px gray edge
    assert.equal(grayBlobRatio(luma, N, N), 0);
    for (let y = 10; y < 30; y++) for (let x = 10; x < 30; x++) luma[at(x, y)] = 128; // 20×20 shading
    assert.ok(grayBlobRatio(luma, N, N) > 0.01);
  });
});

describe('sources.csv', () => {
  const header =
    'id,file,title_vi,title_en,category,level,source_type,author_or_vendor,license,license_url,proof,created_at,note';
  const good = 'animals-cat-easy,animals/cat-easy.png,Mèo con,Kitten,animals,easy,ai-placeholder,Gemini,N/A,,,2026-11-16,"a, b ""c"""';

  it('parses quoted fields with commas and quotes', () => {
    assert.deepEqual(parseCsv('a,"b, c","d ""e"""\n')[0], ['a', 'b, c', 'd "e"']);
  });

  it('accepts a valid row', () => {
    const { rows, errors } = readSources(`${header}\n${good}\n`);
    assert.deepEqual(errors, []);
    assert.equal(rows[0].note, 'a, b "c"');
  });

  it('reports bad rows with the line number', () => {
    const bad = [
      good,
      good, // duplicate id
      'sea-x-easy,sea/x-medium.png,X,X,sea,easy,stock,,,,,,', // level suffix + source_type
      'toys-ball-easy,toys/ball-easy.png,B,B,toys,easy,cc0,,,,,,', // unknown category
    ].join('\n');
    const { errors } = readSources(`${header}\n${bad}\n`);
    assert.ok(errors.some((e) => e.includes('dòng 3') && e.includes('trùng id')));
    assert.ok(errors.some((e) => e.includes('dòng 4') && e.includes('source_type')));
    assert.ok(errors.some((e) => e.includes('dòng 4') && e.includes('-easy.png')));
    assert.ok(errors.some((e) => e.includes('dòng 5') && e.includes('category')));
  });

  it('release blocks placeholders and missing proofs', () => {
    const rows = [
      { id: 'a', file: 'a', source_type: 'ai-placeholder' },
      { id: 'b', file: 'b', source_type: 'purchased', proof: '' },
      { id: 'c', file: 'c', source_type: 'cc-by', license_url: 'u', author_or_vendor: '' },
      { id: 'd', file: 'd', source_type: 'original', proof: 'x.pdf' },
    ];
    const errors = releaseErrors(rows, () => true);
    assert.equal(errors.length, 3);
  });
});

describe('categories', () => {
  it('pipeline and app use the same category ids, in the same order', async () => {
    const { readFileSync } = await import('node:fs');
    const { CATEGORY_IDS } = await import('../lib/sources.mjs');
    const ts = readFileSync(new URL('../../src/data/categories.ts', import.meta.url), 'utf8');
    const list = /CATEGORY_IDS = \[([^\]]*)\]/.exec(ts)?.[1] ?? '';
    assert.deepEqual([...list.matchAll(/'([a-z]+)'/g)].map((m) => m[1]), CATEGORY_IDS);
  });
});

describe('sharp tips', () => {
  /** 1 px line from (x0,y0) to (x1,y1). */
  function line(mask, x0, y0, x1, y1) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      mask[at(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t))] = 1;
    }
    return mask;
  }
  const insideTriangle = (x, y) => y < 80 && y > 20 && Math.abs(x - 50) < ((y - 20) * 30) / 60 - 1;

  it('paper in an acute corner stays with the region inside the corner, not the one across the stroke', () => {
    const mask = line(line(line(blank(), 20, 80, 50, 20), 80, 80, 50, 20), 20, 80, 80, 80);
    const paper = mask.map((v) => 1 - v);
    const closed = close(mask, N, N, 2);
    const corner = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!mask[at(x, y)] && closed[at(x, y)] && insideTriangle(x, y)) corner.push(at(x, y));
    assert.ok(corner.length > 0, 'the closing filled part of the tip');

    const seg = segment(mask, { size: N, closeRadius: 2, minArea: 20, noiseArea: 5, paper });
    const inside = seg.labels[at(50, 65)];
    assert.notEqual(inside, seg.labels[at(5, 5)]);
    assert.ok(corner.every((p) => seg.labels[p] === inside));
  });
});
