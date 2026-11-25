import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { encodeWav } from '../build-sounds.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('encodeWav writes a valid 16-bit mono PCM header', () => {
  const wav = encodeWav(new Float64Array([0, 1, -1, 0.5]), 22050);
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  assert.equal(wav.readUInt16LE(20), 1); // PCM
  assert.equal(wav.readUInt16LE(22), 1); // mono
  assert.equal(wav.readUInt32LE(24), 22050);
  assert.equal(wav.readUInt16LE(34), 16);
  assert.equal(wav.readUInt32LE(40), 8);
  assert.equal(wav.readInt16LE(46), 32767);
  assert.equal(wav.readInt16LE(48), -32767);
});

test('the three app sounds exist and are small (F09: < 30 KB)', () => {
  for (const name of ['pop', 'tada', 'tick']) {
    const file = join(root, 'assets', 'sounds', `${name}.wav`);
    const size = statSync(file).size;
    assert.ok(size > 1000 && size < 30 * 1024, `${name}.wav is ${size} bytes`);
    assert.equal(readFileSync(file).toString('ascii', 0, 4), 'RIFF');
  }
});
