// content-src/sources.csv: parsing and validation (docs/content/nguon-noi-dung.md).

export const COLUMNS = [
  'id',
  'file',
  'title_vi',
  'title_en',
  'category',
  'level',
  'source_type',
  'author_or_vendor',
  'license',
  'license_url',
  'proof',
  'created_at',
  'note',
];

export const SOURCE_TYPES = ['original', 'purchased', 'cc0', 'cc-by', 'ai-placeholder'];
export const LEVELS = ['easy', 'medium'];
// Keep in sync with src/data/categories.ts (a unit test checks it).
export const CATEGORY_IDS = ['animals', 'sea', 'vehicles', 'sweets', 'dinosaurs', 'fairytale', 'nature', 'vietnam'];

/** RFC 4180-ish CSV: quoted fields, "" escapes, commas and newlines inside quotes. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') (field += '"'), i++;
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') row.push(field), (field = '');
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) row.push(field), rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/**
 * @returns {{ rows: Record<string, string>[], errors: string[] }} rows keep CSV order; errors name the line.
 */
export function readSources(text) {
  const errors = [];
  const [header, ...lines] = parseCsv(text);
  if (!header) return { rows: [], errors: ['sources.csv: file rỗng'] };
  const missing = COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { rows: [], errors: [`sources.csv: thiếu cột ${missing.join(', ')}`] };

  const rows = [];
  const seen = new Map();
  lines.forEach((cells, i) => {
    const line = i + 2;
    const row = Object.fromEntries(header.map((name, k) => [name, (cells[k] ?? '').trim()]));
    const where = `sources.csv dòng ${line} (${row.id || 'không có id'})`;
    const bad = (msg) => errors.push(`${where}: ${msg}`);

    for (const c of ['id', 'file', 'title_vi', 'title_en', 'category', 'level', 'source_type']) if (!row[c]) bad(`thiếu ${c}`);
    if (row.source_type && !SOURCE_TYPES.includes(row.source_type)) bad(`source_type "${row.source_type}" không hợp lệ (${SOURCE_TYPES.join(', ')})`);
    if (row.level && !LEVELS.includes(row.level)) bad(`level "${row.level}" không hợp lệ (easy, medium)`);
    if (row.category && !CATEGORY_IDS.includes(row.category)) bad(`category "${row.category}" không có trong danh sách chủ đề`);
    if (row.id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.id)) bad('id chỉ được dùng a-z, 0-9 và dấu -');
    if (row.file) {
      if (!row.file.toLowerCase().endsWith('.png')) bad(`${row.file}: chỉ nhận PNG`);
      const m = /^([a-z0-9-]+)\/([a-z0-9-]+)\.png$/.exec(row.file);
      if (!m) bad(`file "${row.file}" phải có dạng <chủ-đề>/<tên>-<easy|medium>.png`);
      else {
        if (row.category && m[1] !== row.category) bad(`file nằm trong thư mục "${m[1]}" nhưng category là "${row.category}"`);
        if (row.level && !m[2].endsWith(`-${row.level}`)) bad(`tên file phải kết thúc bằng -${row.level}.png`);
        if (row.id && row.id !== `${m[1]}-${m[2]}`) bad(`id phải là "${m[1]}-${m[2]}" (chủ đề + tên file)`);
      }
    }
    if (row.id) {
      if (seen.has(row.id)) bad(`trùng id với dòng ${seen.get(row.id)}`);
      else seen.set(row.id, line);
    }
    rows.push(row);
  });
  return { rows, errors };
}

/** Release rules (docs/02): no placeholder art, every licence has its proof. */
export function releaseErrors(rows, proofExists) {
  const errors = [];
  for (const row of rows) {
    const where = `${row.file} (${row.id})`;
    switch (row.source_type) {
      case 'ai-placeholder':
        errors.push(`${where}: tranh tạm ai-placeholder, không được phát hành`);
        break;
      case 'original':
      case 'purchased':
        if (!row.proof) errors.push(`${where}: ${row.source_type} phải có bằng chứng (cột proof)`);
        else if (!proofExists(row.proof)) errors.push(`${where}: không thấy file bằng chứng ${row.proof}`);
        break;
      case 'cc0':
      case 'cc-by':
        if (!row.license_url) errors.push(`${where}: ${row.source_type} phải có license_url`);
        if (row.source_type === 'cc-by' && !row.author_or_vendor) errors.push(`${where}: cc-by phải có tác giả để ghi công`);
        break;
    }
  }
  return errors;
}
