import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build, licenseOf } from '../gen-oss-notices.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('lists every direct dependency, sorted, with its license', () => {
  const { packages, texts } = build(root);
  const names = new Set(packages.map((p) => p.name));
  for (const dep of Object.keys(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dependencies)) {
    assert.ok(names.has(dep), `${dep} missing from the notices`);
  }
  const sorted = [...packages].sort((a, b) => a.name.localeCompare(b.name, 'en') || a.version.localeCompare(b.version, 'en'));
  assert.deepEqual(packages, sorted);
  for (const p of packages) {
    assert.ok(p.license && p.license !== 'UNKNOWN', `${p.name} has no license id`);
    assert.ok(p.text === null || (p.text >= 0 && p.text < texts.length));
  }
  assert.equal(new Set(texts).size, texts.length, 'license texts are stored once');
});

test('does not list build-only devDependencies that nothing ships', () => {
  const { packages } = build(root);
  assert.ok(!packages.some((p) => p.name === 'jest'));
  assert.ok(!packages.some((p) => p.name === 'typescript'));
});

test('reads license ids in the old formats too', () => {
  assert.equal(licenseOf({ license: 'MIT' }), 'MIT');
  assert.equal(licenseOf({ license: { type: 'ISC' } }), 'ISC');
  assert.equal(licenseOf({ licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] }), 'MIT OR Apache-2.0');
  assert.equal(licenseOf({}), 'UNKNOWN');
});
