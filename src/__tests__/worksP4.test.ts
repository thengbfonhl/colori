import { dayKey } from '../lib/format';
import {
  earnsStar,
  emptyWorks,
  MAX_ACTIVE_DAYS,
  migrateWorks,
  WORKS_SCHEMA_VERSION,
  worksReducer,
  type WorksState,
} from '../store/worksReducer';

// P4 parts of the works reducer (F04): stars, favourite, delete, active days, schema v2.

const DAY = 24 * 60 * 60 * 1000;
/** Noon local time on 17/11/2026 + n days (away from midnight: no time-zone surprises). */
const day = (n: number) => new Date(2026, 10, 17 + n, 12).getTime();
const saveArt = (state: WorksState, artworkId: string, now: number, progress = 0.5) =>
  worksReducer(state, { type: 'saveColoring', artworkId, filled: [1], progress, addTimeMs: 1000, now });
const complete = (state: WorksState, workId: string, now = day(0)) => worksReducer(state, { type: 'complete', workId, now });

describe('stars (S05 "+1 ngôi sao")', () => {
  it('gives one star at the first completion of a colouring work', () => {
    let s = saveArt(emptyWorks(), 'animals-cat-easy', day(0));
    expect(earnsStar(s, 'animals-cat-easy')).toBe(true);
    s = complete(s, 'animals-cat-easy');
    expect(s.stars).toBe(1);
    expect(s.starred).toEqual(['animals-cat-easy']);
    expect(earnsStar(s, 'animals-cat-easy')).toBe(false);
  });

  it('never gives a second star for the same artwork, even after deleting and colouring it again', () => {
    let s = complete(saveArt(emptyWorks(), 'animals-cat-easy', day(0)), 'animals-cat-easy');
    expect(complete(s, 'animals-cat-easy')).toBe(s); // already done: nothing changes
    s = worksReducer(s, { type: 'delete', workId: 'animals-cat-easy' });
    expect(s.works['animals-cat-easy']).toBeUndefined();
    s = complete(saveArt(s, 'animals-cat-easy', day(1), 1), 'animals-cat-easy', day(1));
    expect(s.works['animals-cat-easy'].status).toBe('done');
    expect(s.stars).toBe(1);
  });

  it('counts one star per artwork', () => {
    let s = complete(saveArt(emptyWorks(), 'animals-cat-easy', day(0)), 'animals-cat-easy');
    s = complete(saveArt(s, 'sea-whale-easy', day(0)), 'sea-whale-easy');
    expect(s.stars).toBe(2);
  });

  it('gives no star for a free drawing (A23)', () => {
    let s = worksReducer(emptyWorks(), { type: 'saveFree', workId: 'draw-1', addTimeMs: 0, now: day(0) });
    expect(earnsStar(s, 'draw-1')).toBe(false);
    s = complete(s, 'draw-1');
    expect(s.works['draw-1'].status).toBe('done');
    expect(s.stars).toBe(0);
  });
});

describe('favourite and delete (S08)', () => {
  it('toggles favourite without touching updatedAt', () => {
    let s = saveArt(emptyWorks(), 'animals-cat-easy', day(0));
    s = worksReducer(s, { type: 'setFavorite', workId: 'animals-cat-easy', favorite: true });
    expect(s.works['animals-cat-easy'].favorite).toBe(true);
    expect(s.works['animals-cat-easy'].updatedAt).toBe(day(0));
    expect(worksReducer(s, { type: 'setFavorite', workId: 'animals-cat-easy', favorite: true })).toBe(s);
    s = worksReducer(s, { type: 'setFavorite', workId: 'animals-cat-easy', favorite: false });
    expect(s.works['animals-cat-easy'].favorite).toBe(false);
  });

  it('keeps favourite when the work is saved again', () => {
    let s = saveArt(emptyWorks(), 'animals-cat-easy', day(0));
    s = worksReducer(s, { type: 'setFavorite', workId: 'animals-cat-easy', favorite: true });
    s = saveArt(s, 'animals-cat-easy', day(1));
    expect(s.works['animals-cat-easy'].favorite).toBe(true);
  });

  it('deletes a work; unknown ids change nothing', () => {
    let s = saveArt(emptyWorks(), 'animals-cat-easy', day(0));
    s = worksReducer(s, { type: 'saveFree', workId: 'draw-1', addTimeMs: 0, now: day(0) });
    const after = worksReducer(s, { type: 'delete', workId: 'draw-1' });
    expect(Object.keys(after.works)).toEqual(['animals-cat-easy']);
    expect(worksReducer(after, { type: 'delete', workId: 'draw-1' })).toBe(after);
    expect(worksReducer(after, { type: 'setFavorite', workId: 'draw-1', favorite: true })).toBe(after);
  });
});

describe('active days (S07 streak)', () => {
  it('records each local day with colouring or drawing once, sorted', () => {
    let s = saveArt(emptyWorks(), 'animals-cat-easy', day(1));
    s = saveArt(s, 'animals-cat-easy', day(1) + 1000);
    s = worksReducer(s, { type: 'saveFree', workId: 'draw-1', addTimeMs: 0, now: day(0) });
    expect(s.activeDays).toEqual(['2026-11-17', '2026-11-18']);
  });

  it('keeps at most MAX_ACTIVE_DAYS days', () => {
    let s = emptyWorks();
    for (let i = 0; i < MAX_ACTIVE_DAYS + 5; i++) s = saveArt(s, 'animals-cat-easy', day(0) + i * DAY);
    expect(s.activeDays).toHaveLength(MAX_ACTIVE_DAYS);
    expect(s.activeDays[s.activeDays.length - 1]).toBe(dayKey(day(0) + (MAX_ACTIVE_DAYS + 4) * DAY));
  });

  it('does not count liking a picture as activity', () => {
    let s = saveArt(emptyWorks(), 'animals-cat-easy', day(0));
    s = worksReducer(s, { type: 'setFavorite', workId: 'animals-cat-easy', favorite: true });
    expect(s.activeDays).toEqual(['2026-11-17']);
  });
});

describe('migrateWorks v1 → v2 (F04 schemaVersion)', () => {
  const v1Work = (id: string, status: 'done' | 'in_progress', updatedAt: number, kind: 'coloring' | 'free' = 'coloring') => ({
    id,
    kind,
    artworkId: kind === 'coloring' ? id : null,
    status,
    progress: status === 'done' ? 1 : 0.4,
    filled: [1],
    favorite: false,
    timeSpentMs: 60000,
    createdAt: updatedAt,
    updatedAt,
    completedAt: status === 'done' ? updatedAt : null,
  });

  it('gives a star to colouring works already done, takes active days from updatedAt', () => {
    const out = migrateWorks({
      schemaVersion: 1,
      works: {
        'animals-cat-easy': v1Work('animals-cat-easy', 'done', day(-1)),
        'sea-whale-easy': v1Work('sea-whale-easy', 'in_progress', day(0)),
        'draw-5': v1Work('draw-5', 'done', day(0), 'free'),
      },
    });
    expect(out.schemaVersion).toBe(WORKS_SCHEMA_VERSION);
    expect(out.stars).toBe(1);
    expect(out.starred).toEqual(['animals-cat-easy']);
    expect(out.activeDays).toEqual(['2026-11-16', '2026-11-17']);
    expect(Object.keys(out.works).sort()).toEqual(['animals-cat-easy', 'draw-5', 'sea-whale-easy']);
  });

  it('fills fields missing in old works', () => {
    const old = { id: 'animals-cat-easy', kind: 'coloring', status: 'in_progress', progress: 0.2, filled: [], updatedAt: day(0) };
    const w = migrateWorks({ schemaVersion: 1, works: { x: old } }).works['animals-cat-easy'];
    expect(w).toMatchObject({ artworkId: 'animals-cat-easy', favorite: false, timeSpentMs: 0, createdAt: day(0), completedAt: null });
  });

  it('reads its own v2 data back unchanged (saved → loaded)', () => {
    let s = complete(saveArt(emptyWorks(), 'animals-cat-easy', day(0)), 'animals-cat-easy');
    s = worksReducer(s, { type: 'setFavorite', workId: 'animals-cat-easy', favorite: true });
    s = worksReducer(s, { type: 'delete', workId: 'animals-cat-easy' });
    s = saveArt(s, 'sea-whale-easy', day(1));
    expect(migrateWorks(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it('cleans broken v2 fields', () => {
    const out = migrateWorks({ schemaVersion: 2, works: {}, stars: -3, starred: ['a', 'a', 7], activeDays: ['2026-11-17', 'bad', '2026-11-17'] });
    expect(out.starred).toEqual(['a']);
    expect(out.stars).toBe(1);
    expect(out.activeDays).toEqual(['2026-11-17']);
  });
});
