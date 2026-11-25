// License policy check, part of `npm run check`.
//
// 1. Libraries we add ourselves (package.json dependencies + devDependencies) must use a
//    permissive license: MIT (preferred), ISC, BSD-2/3-Clause, Apache-2.0, 0BSD.
// 2. Nothing installed (including dependencies of dependencies) may be copyleft or
//    restricted (GPL, AGPL, LGPL, SSPL, EUPL, non-commercial, BUSL...) unless the package
//    also offers a permissive option, e.g. "(BSD-3-Clause OR GPL-2.0)".
//
//   node scripts/check-licenses.mjs           -> check
//   node scripts/check-licenses.mjs --list    -> also print every non-MIT package
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const PERMISSIVE = new Set(['MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'MIT-0']);
const FORBIDDEN = /GPL|SSPL|EUPL|CC-BY-NC|CC-BY-SA|BUSL|Commons-Clause|Elastic|Proprietary|Commercial/i;

function licenseOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license?.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(' OR ');
  return 'UNKNOWN';
}

/** "(MIT OR Apache-2.0)" → [["MIT"], ["Apache-2.0"]]; "(MIT AND BSD-3-Clause)" → [["MIT", "BSD-3-Clause"]]. */
function options(expr) {
  return expr
    .replace(/[()]/g, '')
    .split(/\s+OR\s+/i)
    .map((part) => part.split(/\s+AND\s+/i).map((s) => s.trim()));
}

const isPermissive = (expr) => options(expr).some((all) => all.every((id) => PERMISSIVE.has(id)));
const isForbidden = (expr) => options(expr).every((all) => all.some((id) => FORBIDDEN.test(id)));

function readPkg(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  } catch {
    return null;
  }
}

const errors = [];
const nonMit = new Map();

// 1. Direct dependencies.
const app = readPkg(root);
for (const name of Object.keys({ ...app.dependencies, ...app.devDependencies })) {
  const pkg = readPkg(join(root, 'node_modules', name));
  if (!pkg) {
    errors.push(`${name}: not installed (run npm install)`);
    continue;
  }
  const license = licenseOf(pkg);
  if (!isPermissive(license)) errors.push(`${name}@${pkg.version}: "${license}" is not an allowed license for a direct dependency`);
}

// 2. Everything installed.
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const path = join(dir, entry);
    if (entry.startsWith('@')) {
      walk(path);
      continue;
    }
    const pkg = readPkg(path);
    if (pkg?.name && pkg.version) {
      const license = licenseOf(pkg);
      const id = `${pkg.name}@${pkg.version}`;
      if (license !== 'MIT') nonMit.set(id, license);
      if (isForbidden(license)) errors.push(`${id}: "${license}" (copyleft/restricted, not allowed)`);
    }
    walk(join(path, 'node_modules'));
  }
}
walk(join(root, 'node_modules'));

if (process.argv.includes('--list')) {
  console.log('Non-MIT packages (build tools and transitive dependencies):');
  for (const [id, license] of [...nonMit].sort()) console.log(`  ${license.padEnd(28)} ${id}`);
}

if (errors.length) {
  console.error(`✖ ${errors.length} license problem(s):`);
  for (const e of [...new Set(errors)]) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✔ licenses: direct dependencies permissive, no copyleft packages (${nonMit.size} non-MIT, see --list)`);
