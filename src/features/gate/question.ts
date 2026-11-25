// Parental gate logic (F05, A28): multiplication written in words, 4 numeric answers,
// lock for 30 s after 3 wrong answers in a row. Pure functions, unit tested.

/** Both factors are drawn from this range (A28). */
export const FACTOR_MIN = 3;
export const FACTOR_MAX = 9;
export const ANSWER_COUNT = 4;
export const MAX_WRONG = 3;
export const LOCK_MS = 30_000;

export type GateQuestion = { a: number; b: number; answer: number; choices: number[] };

/** Random number source in [0, 1), injectable for tests. */
export type Rng = () => number;

const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * New question. Wrong answers are near the right one (±1..±10), all different and > 0,
 * and the right answer is at a random position (cannot be guessed from its place).
 * `avoid`: previous question, never asked twice in a row ("Câu hỏi thay đổi mỗi lần mở").
 */
export function makeQuestion(rng: Rng = Math.random, avoid?: Pick<GateQuestion, 'a' | 'b'>): GateQuestion {
  let a = randInt(rng, FACTOR_MIN, FACTOR_MAX);
  let b = randInt(rng, FACTOR_MIN, FACTOR_MAX);
  for (let tries = 0; avoid && a === avoid.a && b === avoid.b && tries < 20; tries++) {
    a = randInt(rng, FACTOR_MIN, FACTOR_MAX);
    b = randInt(rng, FACTOR_MIN, FACTOR_MAX);
  }
  if (avoid && a === avoid.a && b === avoid.b) b = b === FACTOR_MAX ? FACTOR_MIN : b + 1; // bad rng: still change
  const answer = a * b;
  const wrong = new Set<number>();
  for (let tries = 0; wrong.size < ANSWER_COUNT - 1 && tries < 100; tries++) {
    const v = answer + randInt(rng, 1, 10) * (rng() < 0.5 ? -1 : 1);
    if (v > 0) wrong.add(v);
  }
  // Only with a broken rng: fill with the next numbers so the loop always ends.
  for (let d = 1; wrong.size < ANSWER_COUNT - 1; d++) wrong.add(answer + d);
  return { a, b, answer, choices: shuffle([answer, ...wrong], rng) };
}

/** Wrong answers in a row and the end of the lock (module state, survives closing the sheet). */
export type GateLock = { wrong: number; lockedUntil: number };

export const initialLock = (): GateLock => ({ wrong: 0, lockedUntil: 0 });

/** Remaining lock in ms (0 = not locked). */
export function lockRemaining(lock: GateLock, now: number): number {
  return Math.max(0, lock.lockedUntil - now);
}

/** After an answer: right resets the count; the 3rd wrong in a row starts the 30 s lock. */
export function afterAnswer(lock: GateLock, correct: boolean, now: number): GateLock {
  if (correct) return initialLock();
  const wrong = lock.wrong + 1;
  if (wrong >= MAX_WRONG) return { wrong: 0, lockedUntil: now + LOCK_MS };
  return { wrong, lockedUntil: lock.lockedUntil };
}
