// Release content gate, part of `npm run check:release` (docs/02 §7, F01):
// - no `ai-placeholder` artwork left (Gemini test pictures, D5),
// - every original / purchased artwork has its proof in content-src/_licenses/,
// - cc0 / cc-by have a licence link, cc-by has an author to credit.
// - outside links (.env → app.config.js `extra.links`) are real values, not the A32 placeholders.
// Production config checks (ad ids, Firebase files…) are added in P9.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSources, releaseErrors } from './lib/sources.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const licenses = join(root, 'content-src', '_licenses');

const { rows, errors } = readSources(readFileSync(join(root, 'content-src', 'sources.csv'), 'utf8'));
errors.push(...releaseErrors(rows, (proof) => existsSync(join(licenses, proof))));

// A32 / Q12: the outside links must be real. Read them the way Expo does: .env loaded by
// @expo/env (like `expo start` / `expo export`), then app.config.js evaluated.
const require = createRequire(import.meta.url);
require('@expo/env').load(root, { silent: true });
const links = require(join(root, 'app.config.js'))().extra?.links ?? {};
const LINK_ENV = { privacyPolicy: 'PRIVACY_URL', contactEmail: 'CONTACT_EMAIL' };
for (const [key, name] of Object.entries(LINK_ENV)) {
  const v = links[key] ?? '';
  if (!v || /example\.(com|org|net)/i.test(v)) errors.push(`${name} = "${v}": giá trị tạm, điền giá trị thật vào .env hoặc biến môi trường EAS (Q12)`);
}
if (links.privacyPolicy && !/^https:\/\//.test(links.privacyPolicy)) errors.push('PRIVACY_URL phải bắt đầu bằng https://');
if (links.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(links.contactEmail)) errors.push('CONTACT_EMAIL không phải email hợp lệ');

if (errors.length) {
  const placeholders = rows.filter((r) => r.source_type === 'ai-placeholder').length;
  console.error(`✖ release: ${errors.length} lỗi${placeholders ? ` (${placeholders} tranh tạm ai-placeholder)` : ''}`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✔ release: ${rows.length} tranh đều có nguồn được phép phát hành`);
