// Artwork pipeline (docs/features/F01): content-src/*.png → assets/artworks/<id>/ + manifest.
//
//   node scripts/build-artworks.mjs           build changed artworks (npm run art:build)
//   node scripts/build-artworks.mjs --force   rebuild everything
//   node scripts/build-artworks.mjs --check   fast check, used by `npm run check`: sources valid,
//                                             outputs up to date, print warnings. No image processing.
//
// Generated (never edit by hand): assets/artworks/**, src/data/artworks.json, src/data/artworkAssets.ts.
// Debug images for visual review: content-out/debug/<id>.png (not shipped).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import pngjs from 'pngjs';
import {
  debugColor,
  downsampleAny,
  downsampleAverage,
  encodeRegions,
  grayBlobRatio,
  lineAlpha,
  lumaFromRgba,
  segment,
  thresholdMask,
} from './lib/artwork-core.mjs';
import { readSources } from './lib/sources.mjs';

const { PNG } = pngjs;
/** Bump when the processing changes, so every artwork is rebuilt. */
const PIPELINE_VERSION = 4;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = {
  src: join(root, 'content-src'),
  csv: join(root, 'content-src', 'sources.csv'),
  config: join(root, 'scripts', 'artwork.config.json'),
  out: join(root, 'assets', 'artworks'),
  state: join(root, 'assets', 'artworks', 'build-state.json'),
  debug: join(root, 'content-out', 'debug'),
  manifest: join(root, 'src', 'data', 'artworks.json'),
  assetsTs: join(root, 'src', 'data', 'artworkAssets.ts'),
};
const OUTPUT_FILES = ['line.png', 'regions.png', 'thumb.png'];
const rel = (p) => relative(root, p).replaceAll('\\', '/');

const args = new Set(process.argv.slice(2));
const CHECK = args.has('--check');
const FORCE = args.has('--force');

function fail(errors) {
  console.error(`✖ artworks: ${errors.length} lỗi`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}

function loadConfig() {
  const raw = JSON.parse(readFileSync(P.config, 'utf8'));
  delete raw.$comment;
  return raw;
}

function configFor(config, id) {
  const { overrides = {}, ...base } = config;
  return { ...base, ...(overrides[id] ?? {}) };
}

/** Every *.png under content-src except _licenses/, as "category/name.png". */
function listSourcePngs(dir = P.src) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listSourcePngs(path));
    else if (/\.png$/i.test(entry.name)) out.push(relative(P.src, path).replaceAll('\\', '/'));
  }
  return out;
}

/** Width/height from the PNG header without decoding. */
function pngSize(buf) {
  if (buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function validate(config) {
  if (!existsSync(P.csv)) fail(['thiếu content-src/sources.csv']);
  const { rows, errors } = readSources(readFileSync(P.csv, 'utf8'));
  const listed = new Set(rows.map((r) => r.file));
  for (const file of listSourcePngs()) if (!listed.has(file)) errors.push(`content-src/${file}: không có dòng nguồn trong sources.csv`);

  const items = [];
  for (const row of rows) {
    const path = join(P.src, row.file);
    if (!row.file || !existsSync(path)) {
      if (row.file) errors.push(`content-src/${row.file}: không tìm thấy file (dòng ${row.id})`);
      continue;
    }
    const bytes = readFileSync(path);
    const size = pngSize(bytes);
    const cfg = configFor(config, row.id);
    if (!size) {
      errors.push(`content-src/${row.file}: không phải file PNG`);
      continue;
    }
    const { width, height } = size;
    if (Math.abs(width - height) / Math.max(width, height) > cfg.maxAspectDiff)
      errors.push(`content-src/${row.file}: ảnh không vuông (${width}×${height}, lệch tối đa ${cfg.maxAspectDiff * 100}%)`);
    if (Math.min(width, height) < cfg.minSourceSize)
      errors.push(`content-src/${row.file}: ảnh quá nhỏ (${width}×${height}, cần ≥ ${cfg.minSourceSize} px)`);
    const hash = createHash('sha1')
      .update(bytes)
      .update(JSON.stringify({ PIPELINE_VERSION, cfg, row }))
      .digest('hex');
    items.push({ row, path, bytes, width, height, cfg, hash });
  }
  if (errors.length) fail(errors);
  return items;
}

function writePng(path, width, height, rgba, colorType) {
  const png = new PNG({ width, height });
  png.data = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  writeFileSync(path, PNG.sync.write(png, { colorType, deflateLevel: 9 }));
}

function processArtwork({ row, bytes, width, height, cfg }) {
  const started = Date.now();
  const png = PNG.sync.read(bytes);
  const luma = lumaFromRgba(png.data, width, height);
  const S = cfg.regionMapSize;

  // Regions (steps 3–8).
  const lineMask = downsampleAny(thresholdMask(luma, cfg.threshold), width, height, S, S);
  const minArea = Math.round(cfg.minAreaRatio[row.level] * S * S);
  const noiseArea = Math.round(cfg.noiseAreaRatio * S * S);
  // Paper by average darkness (a 1024 px is paper if most of its 2×2 source pixels are), for the first grow pass.
  const paper = thresholdMask(downsampleAverage(luma, width, height, S, S), cfg.threshold).map((v) => 1 - v);
  const seg = segment(lineMask, { size: S, closeRadius: cfg.closeRadius, minArea, noiseArea, sliverRadius: cfg.sliverRadius, paper });
  if (seg.count === 0) throw new Error(`content-src/${row.file}: không tách được vùng nào (ảnh toàn nét?)`);

  // Outputs (step 9).
  const dir = join(P.out, row.id);
  mkdirSync(dir, { recursive: true });
  const L = Math.min(width, height, cfg.lineMaxSize);
  const alpha = lineAlpha(downsampleAverage(luma, width, height, L, L), cfg.lineAlpha.low, cfg.lineAlpha.high);
  const lineRgba = new Uint8Array(L * L * 4);
  for (let i = 0; i < alpha.length; i++) lineRgba[i * 4 + 3] = alpha[i];
  writePng(join(dir, 'line.png'), L, L, lineRgba, 4);

  writePng(join(dir, 'regions.png'), S, S, encodeRegions(seg.labels), 2);

  const T = cfg.thumbSize;
  const thumbAlpha = downsampleAverage(alpha, L, L, T, T);
  const thumb = new Uint8Array(T * T * 4);
  for (let i = 0; i < thumbAlpha.length; i++) {
    const v = 255 - thumbAlpha[i];
    thumb.set([v, v, v, 255], i * 4);
  }
  writePng(join(dir, 'thumb.png'), T, T, thumb, 0);

  // debug.png: region colours; black = line, red = gap closed by `closeRadius`,
  // magenta = speck or thin sliver merged into the line (takes the neighbour's colour), light gray = background,
  // ORANGE-tinted = optional small region (colourable, not counted in %).
  const dbg = new Uint8Array(S * S * 4);
  for (let i = 0; i < S * S; i++) {
    let c;
    if (lineMask[i]) c = [30, 30, 30];
    else if (seg.closed[i]) c = [230, 20, 20];
    else if (!seg.preGrow[i]) c = [230, 0, 200];
    else if (seg.labels[i] === seg.background) c = [238, 238, 238];
    else if (seg.labels[i] > seg.counted) c = debugColor(seg.labels[i]).map((v, k) => Math.round((v + [255, 150, 0][k]) / 2));
    else c = debugColor(seg.labels[i]);
    dbg.set([...c, 255], i * 4);
  }
  mkdirSync(P.debug, { recursive: true });
  writePng(join(P.debug, `${row.id}.png`), S, S, dbg, 2);

  // Warnings (F01 table).
  const regionCount = seg.counted - (seg.background ? 1 : 0);
  const bgRatio = seg.background ? seg.areas[seg.background] / (S * S) : 0;
  const gray = grayBlobRatio(luma, width, height);
  const warnings = [];
  const [lo, hi] = cfg.regionCountRange[row.level];
  if (regionCount < lo || regionCount > hi) warnings.push(`${regionCount} vùng, ngoài khoảng ${lo}–${hi} của mức ${row.level}`);
  if (bgRatio > cfg.maxBackgroundRatio) warnings.push(`vùng nền chiếm ${(bgRatio * 100).toFixed(0)}% (> ${cfg.maxBackgroundRatio * 100}%): có thể hở nét`);
  if (gray > cfg.grayBlobRatio) warnings.push(`có mảng xám ${(gray * 100).toFixed(2)}% ảnh (đổ bóng?)`);

  return {
    regionCount,
    backgroundRegion: seg.background,
    bgRatio: Number(bgRatio.toFixed(4)),
    optionalRegionCount: seg.count - seg.counted,
    noiseMerged: seg.noise,
    lineSize: L,
    warnings,
    ms: Date.now() - started,
  };
}

function dirSizeBytes(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    total += entry.isDirectory() ? dirSizeBytes(p) : statSync(p).size;
  }
  return total;
}

const outputsExist = (id) => OUTPUT_FILES.every((f) => existsSync(join(P.out, id, f)));
const readState = () => (existsSync(P.state) ? JSON.parse(readFileSync(P.state, 'utf8')) : { items: {} });

function manifestEntry(row, info, order, cfg) {
  return {
    id: row.id,
    title: { vi: row.title_vi, en: row.title_en },
    category: row.category,
    level: row.level,
    audience: 'kids',
    regionCount: info.regionCount,
    optionalRegionCount: info.optionalRegionCount,
    backgroundRegion: info.backgroundRegion,
    size: { line: info.lineSize, regions: cfg.regionMapSize },
    source: { type: row.source_type, ref: row.author_or_vendor },
    order,
  };
}

function writeGenerated(items, state) {
  const manifest = items.map((it, i) => manifestEntry(it.row, state.items[it.row.id], i + 1, it.cfg));
  writeFileSync(P.manifest, JSON.stringify(manifest, null, 2) + '\n');

  const lines = items.map(({ row }) => {
    const base = `../../assets/artworks/${row.id}`;
    return `  '${row.id}': {\n    line: require('${base}/line.png'),\n    regions: require('${base}/regions.png'),\n    thumb: require('${base}/thumb.png'),\n  },`;
  });
  writeFileSync(
    P.assetsTs,
    [
      '// GENERATED by scripts/build-artworks.mjs. Do not edit: run `npm run art:build`.',
      '// Metro needs static require() calls, hence this file.',
      'export type ArtworkAssetSet = { line: number; regions: number; thumb: number };',
      '',
      'export const ARTWORK_ASSETS: Record<string, ArtworkAssetSet> = {',
      ...lines,
      '};',
      '',
    ].join('\n'),
  );
}

function printReport(items, state, cfgTotal) {
  const rows = items.map(({ row }) => {
    const s = state.items[row.id];
    const kb = Math.round(dirSizeBytes(join(P.out, row.id)) / 1024);
    return [row.id, row.level, String(s.regionCount), `${Math.round(s.bgRatio * 100)}%`, String(s.optionalRegionCount), `${kb} KB`, s.ms ? `${(s.ms / 1000).toFixed(1)}s` : '–'];
  });
  const head = ['id', 'level', 'vùng tính %', 'nền', 'vùng nhỏ', 'dung lượng', 'thời gian'];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const fmt = (r) => '  ' + r.map((c, i) => c.padEnd(widths[i])).join('  ');
  console.log(fmt(head));
  for (const r of rows) console.log(fmt(r));
  const totalMb = dirSizeBytes(P.out) / 1024 / 1024;
  console.log(`  Tổng dung lượng assets/artworks: ${totalMb.toFixed(1)} MB`);
  return totalMb > cfgTotal ? [`tổng dung lượng ${totalMb.toFixed(1)} MB > ${cfgTotal} MB`] : [];
}

function printWarnings(items, state, extra) {
  const warns = items.flatMap(({ row }) => state.items[row.id].warnings.map((w) => `content-src/${row.file}: ${w}`));
  warns.push(...extra);
  if (warns.length) {
    console.warn(`⚠ artworks: ${warns.length} cảnh báo (soát content-out/debug/<id>.png)`);
    for (const w of warns) console.warn('  - ' + w);
  }
}

// ---------------------------------------------------------------------------------------
const config = loadConfig();
const items = validate(config);
const state = readState();

if (CHECK) {
  const errors = [];
  for (const { row, hash } of items) {
    if (state.items[row.id]?.hash !== hash || !outputsExist(row.id))
      errors.push(`${row.id}: tranh hoặc dòng nguồn đã đổi mà chưa build lại. Chạy: npm run art:build`);
  }
  const ids = new Set(items.map((it) => it.row.id));
  for (const id of Object.keys(state.items)) if (!ids.has(id)) errors.push(`${id}: đã bỏ khỏi sources.csv nhưng còn đầu ra cũ. Chạy: npm run art:build`);
  const manifest = existsSync(P.manifest) ? JSON.parse(readFileSync(P.manifest, 'utf8')) : [];
  if (manifest.map((a) => a.id).join() !== items.map((it) => it.row.id).join())
    errors.push(`${rel(P.manifest)} không khớp sources.csv. Chạy: npm run art:build`);
  if (errors.length) fail(errors);
  const totalMb = dirSizeBytes(P.out) / 1024 / 1024;
  printWarnings(items, state, totalMb > config.maxTotalMB ? [`tổng dung lượng ${totalMb.toFixed(1)} MB > ${config.maxTotalMB} MB`] : []);
  console.log(`✔ artworks: ${items.length} tranh, đầu ra khớp nguồn (${totalMb.toFixed(1)} MB)`);
} else {
  const started = Date.now();
  const next = { pipelineVersion: PIPELINE_VERSION, items: {} };
  let built = 0;
  for (const item of items) {
    const old = state.items[item.row.id];
    if (!FORCE && old?.hash === item.hash && outputsExist(item.row.id)) {
      next.items[item.row.id] = { ...old, ms: 0 };
      continue;
    }
    try {
      next.items[item.row.id] = { hash: item.hash, ...processArtwork(item) };
      built++;
    } catch (e) {
      fail([e instanceof Error ? e.message : String(e)]);
    }
  }
  // Remove outputs of artworks no longer listed.
  if (existsSync(P.out))
    for (const entry of readdirSync(P.out, { withFileTypes: true }))
      if (entry.isDirectory() && !next.items[entry.name]) rmSync(join(P.out, entry.name), { recursive: true });
  mkdirSync(P.out, { recursive: true });
  writeFileSync(P.state, JSON.stringify(next, null, 2) + '\n');
  writeGenerated(items, next);
  console.log(`✔ artworks: ${built} tranh build lại, ${items.length - built} giữ nguyên, ${((Date.now() - started) / 1000).toFixed(1)}s`);
  const extra = printReport(items, next, config.maxTotalMB);
  printWarnings(items, next, extra);
}
