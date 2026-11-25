// Synthesises the three short UI sounds of F09 (A27: made by the dev, no third-party audio).
//
//   npm run sounds:build   → assets/sounds/{pop,tada,tick}.wav
//
// Pure maths (sine waves + envelopes), deterministic: running it again gives the same bytes.
// WAV 22.05 kHz, 16-bit mono, each file < 30 KB (F09). Replace the files later with
// recorded / CC0 sounds if wanted (same names), and update docs/content/nguon-noi-dung.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'assets', 'sounds');
const RATE = 22050;
const TAU = Math.PI * 2;

/** 16-bit PCM mono WAV from samples in -1..1. */
export function encodeWav(samples, rate = RATE) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const buffer = (seconds) => new Float64Array(Math.round(seconds * RATE));

/** Fades the last `ms` to zero so a file never ends with a click. */
function fadeOut(s, ms = 8) {
  const n = Math.min(s.length, Math.round((ms / 1000) * RATE));
  for (let i = 0; i < n; i++) s[s.length - 1 - i] *= i / n;
  return s;
}

function normalize(s, peak) {
  let max = 0;
  for (const v of s) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < s.length; i++) s[i] *= peak / max;
  return s;
}

/** "pop" when a region is coloured: a quick downward pitch sweep, like a bubble. */
function pop() {
  const s = buffer(0.12);
  let phase = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / RATE;
    const f = 300 + 700 * Math.exp(-t / 0.018); // 1000 → 300 Hz
    phase += (TAU * f) / RATE;
    const env = Math.min(1, t / 0.002) * Math.exp(-t / 0.035);
    s[i] = Math.sin(phase) * env;
  }
  return fadeOut(normalize(s, 0.7));
}

/** "tick" on main buttons: very short and soft. */
function tick() {
  const s = buffer(0.05);
  for (let i = 0; i < s.length; i++) {
    const t = i / RATE;
    const env = Math.min(1, t / 0.001) * Math.exp(-t / 0.009);
    s[i] = (Math.sin(TAU * 1760 * t) + 0.3 * Math.sin(TAU * 3520 * t)) * env;
  }
  return fadeOut(normalize(s, 0.45), 4);
}

/** Bell-like note: fundamental + soft harmonics, fast attack, long decay. */
function addNote(s, freq, start, decay, gain) {
  const from = Math.round(start * RATE);
  for (let i = from; i < s.length; i++) {
    const t = (i - from) / RATE;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / decay);
    s[i] += gain * env * (Math.sin(TAU * freq * t) + 0.35 * Math.sin(TAU * 2 * freq * t) + 0.12 * Math.sin(TAU * 3 * freq * t));
  }
}

/** "tada" when a picture is finished: rising C-E-G arpeggio, then a C major chord. */
function tada() {
  const s = buffer(0.64);
  const C5 = 523.25;
  const E5 = 659.25;
  const G5 = 783.99;
  const C6 = 1046.5;
  addNote(s, C5, 0.0, 0.09, 0.8);
  addNote(s, E5, 0.08, 0.09, 0.8);
  addNote(s, G5, 0.16, 0.09, 0.8);
  for (const f of [C5, E5, G5, C6]) addNote(s, f, 0.26, 0.16, 0.5);
  return fadeOut(normalize(s, 0.8), 40);
}

const SOUNDS = { pop, tick, tada };

function main() {
  mkdirSync(OUT, { recursive: true });
  for (const [name, make] of Object.entries(SOUNDS)) {
    const wav = encodeWav(make());
    writeFileSync(join(OUT, `${name}.wav`), wav);
    console.log(`assets/sounds/${name}.wav  ${(wav.length / 1024).toFixed(1)} KB`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
