// Open-source notices for the "Giấy phép mã nguồn mở" screen (S11, app/licenses.tsx).
//
//   npm run oss:build             → writes src/data/ossNotices.json (GENERATED, do not edit)
//   node scripts/gen-oss-notices.mjs --check   → fails if the file is out of date (part of npm run check)
//
// Lists every package the app depends on at run time: package.json `dependencies` and all their
// own `dependencies`, recursively (devDependencies are build tools, not shipped). For each:
// name, version, license id and the text of its LICENSE / COPYING file. Identical texts are
// stored once. Packages without a license file show only the license id and repository.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'src', 'data', 'ossNotices.json');

function readPkg(dir) {
  return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
}

/** Node resolution: node_modules/<name> in `from`, then in each parent folder. */
function resolve(name, from) {
  let dir = from;
  for (;;) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) return candidate;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

export function licenseOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license?.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(' OR ');
  return 'UNKNOWN';
}

function repoOf(pkg) {
  const r = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  const url = r ?? pkg.homepage ?? null;
  if (!url) return null;
  return url
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^github:/, 'https://github.com/')
    .replace(/^([\w-]+\/[\w.-]+)$/, 'https://github.com/$1');
}

function licenseText(dir) {
  const file = readdirSync(dir)
    .filter((f) => /^(licen[cs]e|copying)(\.(md|txt|markdown))?$/i.test(f) || /^licen[cs]e[-_.]/i.test(f))
    .sort()[0];
  if (!file) return null;
  return readFileSync(join(dir, file), 'utf8').replace(/\r\n?/g, '\n').trim();
}

/** All run-time packages, sorted by name then version. */
export function collect(appRoot) {
  const seen = new Map();
  const walk = (name, from) => {
    const dir = resolve(name, from);
    if (!dir) return; // optional dependency not installed on this platform
    const pkg = readPkg(dir);
    const key = `${pkg.name}@${pkg.version}`;
    if (seen.has(key)) return;
    seen.set(key, { dir, pkg });
    for (const dep of Object.keys(pkg.dependencies ?? {})) walk(dep, dir);
  };
  for (const dep of Object.keys(readPkg(appRoot).dependencies ?? {})) walk(dep, appRoot);
  return [...seen.values()].sort((a, b) => a.pkg.name.localeCompare(b.pkg.name, 'en') || a.pkg.version.localeCompare(b.pkg.version, 'en'));
}

export function build(appRoot) {
  const texts = [];
  const index = new Map();
  const packages = collect(appRoot).map(({ dir, pkg }) => {
    const text = licenseText(dir);
    let t = null;
    if (text) {
      if (!index.has(text)) {
        index.set(text, texts.length);
        texts.push(text);
      }
      t = index.get(text);
    }
    return { name: pkg.name, version: pkg.version, license: licenseOf(pkg), text: t, repo: repoOf(pkg) };
  });
  return { packages, texts };
}

function main() {
  const json = JSON.stringify(build(root)) + '\n';
  if (process.argv.includes('--check')) {
    const old = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (old !== json) {
      console.error('✖ oss notices: src/data/ossNotices.json is out of date. Run `npm run oss:build`.');
      process.exit(1);
    }
    console.log(`✔ oss notices: ${JSON.parse(json).packages.length} packages`);
    return;
  }
  writeFileSync(OUT, json);
  const data = JSON.parse(json);
  console.log(`src/data/ossNotices.json: ${data.packages.length} packages, ${data.texts.length} license texts, ${(json.length / 1024).toFixed(0)} KB`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
