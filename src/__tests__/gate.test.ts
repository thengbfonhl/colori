import { capitalize, numberToWords } from '../features/gate/numberWords';
import {
  afterAnswer,
  ANSWER_COUNT,
  FACTOR_MAX,
  FACTOR_MIN,
  initialLock,
  LOCK_MS,
  lockRemaining,
  makeQuestion,
  MAX_WRONG,
  type Rng,
} from '../features/gate/question';

/** Small seeded generator (mulberry32) so failures can be reproduced. */
function seeded(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('numberToWords (F05)', () => {
  it('writes Vietnamese numbers, with mốt / tư / lăm', () => {
    const cases: [number, string][] = [
      [0, 'không'],
      [1, 'một'],
      [5, 'năm'],
      [9, 'chín'],
      [10, 'mười'],
      [11, 'mười một'],
      [14, 'mười bốn'],
      [15, 'mười lăm'],
      [20, 'hai mươi'],
      [21, 'hai mươi mốt'],
      [24, 'hai mươi tư'],
      [25, 'hai mươi lăm'],
      [42, 'bốn mươi hai'],
      [49, 'bốn mươi chín'],
      [55, 'năm mươi lăm'],
      [81, 'tám mươi mốt'],
      [100, 'một trăm'],
    ];
    for (const [n, words] of cases) expect(numberToWords(n, 'vi')).toBe(words);
  });

  it('writes English numbers', () => {
    const cases: [number, string][] = [
      [0, 'zero'],
      [7, 'seven'],
      [12, 'twelve'],
      [19, 'nineteen'],
      [20, 'twenty'],
      [42, 'forty-two'],
      [81, 'eighty-one'],
      [99, 'ninety-nine'],
      [100, 'one hundred'],
    ];
    for (const [n, words] of cases) expect(numberToWords(n, 'en')).toBe(words);
  });

  it('has a word for every number 1–100 in both languages, all different', () => {
    for (const lang of ['vi', 'en'] as const) {
      const all = Array.from({ length: 100 }, (_, i) => numberToWords(i + 1, lang));
      expect(new Set(all).size).toBe(100);
      for (const w of all) expect(w).toMatch(/^[\p{L} -]+$/u);
    }
  });

  it('rejects numbers outside 0–100', () => {
    expect(() => numberToWords(101, 'vi')).toThrow(RangeError);
    expect(() => numberToWords(-1, 'en')).toThrow(RangeError);
    expect(() => numberToWords(2.5, 'en')).toThrow(RangeError);
  });

  it('capitalises the question start', () => {
    expect(capitalize('bảy nhân sáu bằng mấy?')).toBe('Bảy nhân sáu bằng mấy?');
  });
});

describe('makeQuestion (A28)', () => {
  it('asks a multiplication of two numbers 3–9 with 4 different answers, one right, all > 0', () => {
    for (let seed = 1; seed <= 2000; seed++) {
      const q = makeQuestion(seeded(seed));
      expect(q.a).toBeGreaterThanOrEqual(FACTOR_MIN);
      expect(q.a).toBeLessThanOrEqual(FACTOR_MAX);
      expect(q.b).toBeGreaterThanOrEqual(FACTOR_MIN);
      expect(q.b).toBeLessThanOrEqual(FACTOR_MAX);
      expect(q.answer).toBe(q.a * q.b);
      expect(q.choices).toHaveLength(ANSWER_COUNT);
      expect(new Set(q.choices).size).toBe(ANSWER_COUNT);
      expect(q.choices.filter((x) => x === q.answer)).toHaveLength(1);
      for (const x of q.choices) {
        expect(x).toBeGreaterThan(0);
        expect(Math.abs(x - q.answer)).toBeLessThanOrEqual(10);
      }
    }
  });

  it('puts the right answer at every position (cannot be guessed from its place)', () => {
    const positions = new Set<number>();
    for (let seed = 1; seed <= 200; seed++) {
      const q = makeQuestion(seeded(seed));
      positions.add(q.choices.indexOf(q.answer));
    }
    expect([...positions].sort()).toEqual([0, 1, 2, 3]);
  });

  it('never asks the same question twice in a row', () => {
    const rng = seeded(7);
    let q = makeQuestion(rng);
    for (let i = 0; i < 500; i++) {
      const next = makeQuestion(rng, q);
      expect(next.a === q.a && next.b === q.b).toBe(false);
      q = next;
    }
  });

  it('still ends with a broken random source', () => {
    const q = makeQuestion(() => 0, { a: 3, b: 3 });
    expect(q.a * q.b).toBe(q.answer);
    expect(q.a === 3 && q.b === 3).toBe(false);
    expect(new Set(q.choices).size).toBe(ANSWER_COUNT);
  });
});

describe('gate lock (F05: 3 wrong answers → 30 s)', () => {
  it('locks after the 3rd wrong answer in a row', () => {
    let l = initialLock();
    for (let i = 1; i < MAX_WRONG; i++) {
      l = afterAnswer(l, false, 1000);
      expect(lockRemaining(l, 1000)).toBe(0);
    }
    l = afterAnswer(l, false, 1000);
    expect(lockRemaining(l, 1000)).toBe(LOCK_MS);
    expect(lockRemaining(l, 1000 + LOCK_MS - 1)).toBe(1);
    expect(lockRemaining(l, 1000 + LOCK_MS)).toBe(0);
  });

  it('a right answer resets the count', () => {
    let l = afterAnswer(afterAnswer(initialLock(), false, 0), false, 0);
    l = afterAnswer(l, true, 0);
    l = afterAnswer(afterAnswer(l, false, 0), false, 0);
    expect(lockRemaining(l, 0)).toBe(0);
  });

  it('after the lock the count starts again from zero', () => {
    let l = initialLock();
    for (let i = 0; i < MAX_WRONG; i++) l = afterAnswer(l, false, 0);
    l = afterAnswer(l, false, LOCK_MS + 1);
    expect(lockRemaining(l, LOCK_MS + 1)).toBe(0);
  });
});
