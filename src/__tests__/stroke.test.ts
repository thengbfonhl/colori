import { shouldAddPoint, traceStroke, type PathSink } from '../engine/stroke';

/** Records path commands. */
function recorder() {
  const cmds: (string | number)[][] = [];
  const sink: PathSink = {
    moveTo: (x, y) => cmds.push(['M', x, y]),
    lineTo: (x, y) => cmds.push(['L', x, y]),
    quadTo: (cx, cy, x, y) => cmds.push(['Q', cx, cy, x, y]),
  };
  return { sink, cmds };
}

describe('shouldAddPoint', () => {
  it('always adds the first point', () => {
    expect(shouldAddPoint([], 5, 5)).toBe(true);
  });

  it('skips points too close to the last one', () => {
    expect(shouldAddPoint([0, 0, 10, 10], 11, 10)).toBe(false);
    expect(shouldAddPoint([0, 0, 10, 10], 12, 10)).toBe(true);
    expect(shouldAddPoint([10, 10], 10, 13, 5)).toBe(false);
  });
});

describe('traceStroke', () => {
  it('draws nothing without points', () => {
    const r = recorder();
    traceStroke([], r.sink);
    expect(r.cmds).toEqual([]);
  });

  it('turns one point into a tiny segment (a dot with a round cap)', () => {
    const r = recorder();
    traceStroke([5, 6], r.sink);
    expect(r.cmds[0]).toEqual(['M', 5, 6]);
    expect(r.cmds[1][0]).toBe('L');
    expect(r.cmds[1][1] as number).toBeCloseTo(5, 1);
  });

  it('joins two points with a line', () => {
    const r = recorder();
    traceStroke([0, 0, 10, 0], r.sink);
    expect(r.cmds).toEqual([
      ['M', 0, 0],
      ['L', 10, 0],
    ]);
  });

  it('smooths through midpoints and ends exactly on the first and last point', () => {
    const r = recorder();
    traceStroke([0, 0, 10, 0, 10, 10, 20, 10], r.sink);
    expect(r.cmds).toEqual([
      ['M', 0, 0],
      ['L', 5, 0],
      ['Q', 10, 0, 10, 5],
      ['Q', 10, 10, 15, 10],
      ['L', 20, 10],
    ]);
  });

  it('has no sharp corner: each curve starts where the previous one ended', () => {
    const pts = [0, 0, 7, 3, 12, 9, 15, 20, 30, 22, 31, 40];
    const r = recorder();
    traceStroke(pts, r.sink);
    let last: number[] = [0, 0];
    for (const cmd of r.cmds.slice(1)) {
      const end = cmd.slice(-2) as number[];
      expect(end).not.toEqual(last);
      last = end;
    }
    expect(last).toEqual([31, 40]);
    expect(r.cmds.filter((c) => c[0] === 'Q')).toHaveLength(pts.length / 2 - 2);
  });
});
