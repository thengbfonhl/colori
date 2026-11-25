import {
  canRedo,
  canUndo,
  CHECKPOINT_EVERY,
  createHistory,
  filledAt,
  HISTORY_LIMIT,
  nextOp,
  pushOp,
  redo,
  replayPlan,
  undo,
  type History,
} from '../engine/history';
import { applyToFilled, scaledWidth, WHITE, type Op } from '../engine/ops';

const fill = (region: number, color = '#CC7662'): Op => ({ type: 'fill', region, color });
const stroke = (region: number, opts: Partial<Extract<Op, { type: 'stroke' }>> = {}): Op => ({
  type: 'stroke',
  points: [1, 2, 3, 4],
  color: '#6D90E7',
  width: 24,
  clip: region,
  region,
  erase: false,
  ...opts,
});

const pushAll = (h: History, ops: Op[]) => ops.reduce(pushOp, h);
const times = <T,>(n: number, f: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => f(i));
const repeat = (h: History, n: number, f: (h: History) => History) => {
  for (let i = 0; i < n; i++) h = f(h);
  return h;
};
const sortedFilled = (h: History) => [...filledAt(h)].sort((a, b) => a - b);

describe('applyToFilled', () => {
  it('fill colours a region, white fill clears it', () => {
    const s = new Set<number>();
    applyToFilled(s, fill(3));
    expect([...s]).toEqual([3]);
    applyToFilled(s, fill(3, WHITE));
    expect([...s]).toEqual([]);
    applyToFilled(s, fill(4, '#ffffff'));
    expect([...s]).toEqual([]);
  });

  it('a brush line colours the region it starts in, not with white ink and not for the eraser', () => {
    expect([...applyToFilled(new Set(), stroke(5))]).toEqual([5]);
    expect([...applyToFilled(new Set(), stroke(5, { color: WHITE }))]).toEqual([]);
    expect([...applyToFilled(new Set([5]), stroke(5, { color: WHITE, erase: true }))]).toEqual([5]);
    expect([...applyToFilled(new Set(), stroke(0))]).toEqual([]); // free drawing
  });

  it('clear empties everything', () => {
    expect([...applyToFilled(new Set([1, 2]), { type: 'clear' })]).toEqual([]);
  });

  it('scales widths to the picture size', () => {
    expect(scaledWidth(24, 1024)).toBe(24);
    expect(scaledWidth(24, 2048)).toBe(48);
  });
});

describe('history', () => {
  it('starts with nothing to undo or redo, filled = the saved regions', () => {
    const h = createHistory([7, 2]);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
    expect(sortedFilled(h)).toEqual([2, 7]);
  });

  it('undo / redo move through the operations and update filled', () => {
    let h = pushAll(createHistory([]), [fill(1), fill(2), stroke(3)]);
    expect(sortedFilled(h)).toEqual([1, 2, 3]);
    h = undo(h);
    expect(sortedFilled(h)).toEqual([1, 2]);
    expect(canRedo(h)).toBe(true);
    expect(nextOp(h)).toEqual(stroke(3));
    h = undo(undo(h));
    expect(sortedFilled(h)).toEqual([]);
    expect(canUndo(h)).toBe(false);
    expect(undo(h)).toBe(h);
    h = redo(h);
    expect(sortedFilled(h)).toEqual([1]);
  });

  it('undo of an eraser tap brings the region back', () => {
    let h = pushAll(createHistory([4]), [fill(4, WHITE)]);
    expect(sortedFilled(h)).toEqual([]);
    h = undo(h);
    expect(sortedFilled(h)).toEqual([4]);
  });

  it('a new operation drops the redo branch', () => {
    let h = pushAll(createHistory([]), [fill(1), fill(2), fill(3)]);
    h = undo(undo(h));
    h = pushOp(h, fill(9));
    expect(canRedo(h)).toBe(false);
    expect(redo(h)).toBe(h);
    expect(sortedFilled(h)).toEqual([1, 9]);
    expect(h.ops).toEqual([fill(1), fill(9)]);
  });

  it(`keeps at most ${HISTORY_LIMIT} undo steps`, () => {
    let h = pushAll(createHistory([]), times(60, (i) => fill(i + 1)));
    let steps = 0;
    while (canUndo(h)) {
      h = undo(h);
      steps++;
    }
    expect(steps).toBe(HISTORY_LIMIT);
    expect(h.applied).toBe(60 - HISTORY_LIMIT);
    // What could not be undone is still coloured.
    expect(sortedFilled(h)).toEqual(times(10, (i) => i + 1));
    // …and redo goes all the way back.
    h = repeat(h, HISTORY_LIMIT, redo);
    expect(h.applied).toBe(60);
    expect(canRedo(h)).toBe(false);
  });

  it(`keeps a checkpoint every ${CHECKPOINT_EVERY} operations and replays less than ${CHECKPOINT_EVERY}`, () => {
    let h = pushAll(createHistory([]), times(45, (i) => fill(i + 1)));
    expect(h.checkpoints.map((c) => c.index)).toEqual([0, 20, 40]);
    expect(replayPlan(h)).toEqual({ from: 40, ops: times(5, (i) => fill(41 + i)) });
    h = repeat(h, 6, undo); // applied 39
    expect(replayPlan(h).from).toBe(20);
    expect(replayPlan(h).ops).toHaveLength(19);
    expect(sortedFilled(h)).toEqual(times(39, (i) => i + 1));
  });

  it('drops checkpoints of an abandoned branch', () => {
    let h = pushAll(createHistory([]), times(25, (i) => fill(i + 1)));
    h = repeat(h, 10, undo); // applied 15, checkpoint 20 is in the redo branch
    expect(h.checkpoints.map((c) => c.index)).toEqual([0, 20]);
    h = pushOp(h, fill(99));
    expect(h.checkpoints.map((c) => c.index)).toEqual([0]);
    h = pushAll(h, times(4, (i) => fill(200 + i))); // applied 20 again → new checkpoint
    expect(h.checkpoints.map((c) => c.index)).toEqual([0, 20]);
    expect(h.checkpoints[1].filled).toEqual([...times(15, (i) => i + 1), 99, 200, 201, 202, 203]);
  });

  it('forgets operations that can no longer be undone, but not the checkpoint needed to rebuild', () => {
    const h = pushAll(createHistory([]), times(75, (i) => fill(i + 1)));
    // floor = 25 → rebuild from checkpoint 20, ops 21..75 kept.
    expect(h.floor).toBe(25);
    expect(h.start).toBe(20);
    expect(h.ops).toHaveLength(55);
    expect(h.checkpoints.map((c) => c.index)).toEqual([20, 40, 60]);
    const low = repeat(h, HISTORY_LIMIT, undo);
    expect(low.applied).toBe(25);
    expect(replayPlan(low)).toEqual({ from: 20, ops: times(5, (i) => fill(21 + i)) });
    expect(sortedFilled(low)).toEqual(times(25, (i) => i + 1));
  });

  it('clear can be undone', () => {
    let h = pushAll(createHistory([]), [stroke(0), { type: 'clear' }]);
    expect(h.ops).toHaveLength(2);
    h = undo(h);
    expect(replayPlan(h)).toEqual({ from: 0, ops: [stroke(0)] });
  });
});
