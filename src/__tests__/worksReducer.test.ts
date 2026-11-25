import { emptyWorks, freeWorks, isFreeWorkId, migrateWorks, newFreeWorkId, worksReducer, type WorksState } from '../store/worksReducer';
import { formatDayMonth } from '../lib/format';

const save = (state: WorksState, filled: number[], progress: number, addTimeMs = 1000, now = 100) =>
  worksReducer(state, { type: 'saveColoring', artworkId: 'animals-cat-easy', filled, progress, addTimeMs, now });

describe('worksReducer', () => {
  it('creates a colouring work on first save', () => {
    const s = save(emptyWorks(), [3, 1], 0.2);
    expect(s.works['animals-cat-easy']).toEqual({
      id: 'animals-cat-easy',
      kind: 'coloring',
      artworkId: 'animals-cat-easy',
      status: 'in_progress',
      progress: 0.2,
      filled: [1, 3],
      favorite: false,
      timeSpentMs: 1000,
      createdAt: 100,
      updatedAt: 100,
      completedAt: null,
    });
  });

  it('updates progress and adds up time, keeping createdAt', () => {
    let s = save(emptyWorks(), [1], 0.1, 1000, 100);
    s = save(s, [1, 2], 0.2, 500, 200);
    const w = s.works['animals-cat-easy'];
    expect(w.filled).toEqual([1, 2]);
    expect(w.timeSpentMs).toBe(1500);
    expect(w.createdAt).toBe(100);
    expect(w.updatedAt).toBe(200);
  });

  it('marks a work done once; later saves keep it done', () => {
    let s = save(emptyWorks(), [1, 2], 1);
    s = worksReducer(s, { type: 'complete', workId: 'animals-cat-easy', now: 300 });
    expect(s.works['animals-cat-easy'].status).toBe('done');
    expect(s.works['animals-cat-easy'].completedAt).toBe(300);
    const again = worksReducer(s, { type: 'complete', workId: 'animals-cat-easy', now: 400 });
    expect(again).toBe(s);
    s = save(s, [1], 0.5, 0, 500);
    expect(s.works['animals-cat-easy'].status).toBe('done');
    expect(s.works['animals-cat-easy'].completedAt).toBe(300);
  });

  it('ignores completing an unknown work', () => {
    const s = emptyWorks();
    expect(worksReducer(s, { type: 'complete', workId: 'nope', now: 1 })).toBe(s);
  });

  it('clamps progress to 0..1', () => {
    expect(save(emptyWorks(), [], 1.4).works['animals-cat-easy'].progress).toBe(1);
  });
});

describe('free drawings (S06)', () => {
  const saveFree = (state: WorksState, workId: string, addTimeMs: number, now: number) =>
    worksReducer(state, { type: 'saveFree', workId, addTimeMs, now });

  it('makes ids "draw-<timestamp>" and recognises them', () => {
    expect(newFreeWorkId(1763280000000)).toBe('draw-1763280000000');
    expect(isFreeWorkId('draw-1763280000000')).toBe(true);
    expect(isFreeWorkId('animals-cat-easy')).toBe(false);
    expect(isFreeWorkId('draw-')).toBe(false);
  });

  it('creates a free work on first save, then adds up time', () => {
    let s = saveFree(emptyWorks(), 'draw-1', 1000, 100);
    expect(s.works['draw-1']).toEqual({
      id: 'draw-1',
      kind: 'free',
      artworkId: null,
      status: 'in_progress',
      progress: 0,
      filled: [],
      favorite: false,
      timeSpentMs: 1000,
      createdAt: 100,
      updatedAt: 100,
      completedAt: null,
    });
    s = worksReducer(s, { type: 'complete', workId: 'draw-1', now: 150 });
    s = saveFree(s, 'draw-1', 500, 200);
    expect(s.works['draw-1']).toMatchObject({ status: 'done', timeSpentMs: 1500, createdAt: 100, updatedAt: 200, completedAt: 150 });
  });

  it('never turns a colouring work into a free one', () => {
    const s = save(emptyWorks(), [1], 0.1);
    expect(saveFree(s, 'animals-cat-easy', 10, 300)).toBe(s);
  });

  it('lists free drawings newest first, without colouring works', () => {
    let s = save(emptyWorks(), [1], 0.1);
    s = saveFree(s, 'draw-1', 0, 100);
    s = saveFree(s, 'draw-2', 0, 300);
    s = saveFree(s, 'draw-1', 0, 400); // edited later: order is by creation
    expect(freeWorks(s.works).map((w) => w.id)).toEqual(['draw-2', 'draw-1']);
  });

  it('formats the drawing title date as dd/MM', () => {
    expect(formatDayMonth(new Date(2026, 2, 5, 10).getTime())).toBe('05/03');
    expect(formatDayMonth(new Date(2026, 10, 19, 23).getTime())).toBe('19/11');
  });
});

describe('migrateWorks', () => {
  it('keeps valid works and drops broken ones', () => {
    const valid = save(emptyWorks(), [1], 0.1).works['animals-cat-easy'];
    const out = migrateWorks({ schemaVersion: 1, works: { a: valid, b: { id: 'b' }, c: null } });
    expect(Object.keys(out.works)).toEqual(['animals-cat-easy']);
  });

  it('returns empty state for garbage', () => {
    expect(migrateWorks('x')).toEqual(emptyWorks());
    expect(migrateWorks({ works: 3 })).toEqual(emptyWorks());
  });
});
