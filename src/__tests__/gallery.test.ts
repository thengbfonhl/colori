import { galleryList, galleryStats } from '../features/works/gallery';
import { dayKey, formatDate, formatDuration, formatDurationLong, previousDay, streakDays } from '../lib/format';
import type { Work } from '../store/worksReducer';

const day = (n: number, hour = 12) => new Date(2026, 10, 17 + n, hour).getTime();

const work = (id: string, over: Partial<Work>): Work => ({
  id,
  kind: 'coloring',
  artworkId: id,
  status: 'in_progress',
  progress: 0.3,
  filled: [1],
  favorite: false,
  timeSpentMs: 0,
  createdAt: day(0),
  updatedAt: day(0),
  completedAt: null,
  ...over,
});

describe('galleryList (S07 tabs)', () => {
  const works: Record<string, Work> = {
    a: work('a', { status: 'done', completedAt: day(-2), updatedAt: day(1) }),
    b: work('b', { status: 'done', completedAt: day(0), favorite: true }),
    c: work('c', { updatedAt: day(-1) }),
    'draw-1': work('draw-1', { kind: 'free', artworkId: null, progress: 0, updatedAt: day(2), favorite: true }),
    'draw-2': work('draw-2', { kind: 'free', artworkId: null, progress: 0, status: 'done', completedAt: day(-3) }),
  };

  it('Đã hoàn thành: colouring + free, most recently finished first', () => {
    expect(galleryList(works, 'done').map((w) => w.id)).toEqual(['b', 'a', 'draw-2']);
  });

  it('Đang tô: unfinished, most recently worked on first', () => {
    expect(galleryList(works, 'progress').map((w) => w.id)).toEqual(['draw-1', 'c']);
  });

  it('Yêu thích: favourites only', () => {
    expect(galleryList(works, 'favorite').map((w) => w.id)).toEqual(['draw-1', 'b']);
  });

  it('counts finished works and total time', () => {
    const w = { a: work('a', { status: 'done', timeSpentMs: 60000 }), b: work('b', { timeSpentMs: 30000 }) };
    expect(galleryStats(w, [], day(0))).toEqual({ done: 1, timeMs: 90000, streak: 0 });
  });
});

describe('streak (Q20)', () => {
  const days = (...n: number[]) => n.map((i) => dayKey(day(i)));

  it('counts consecutive days ending today', () => {
    expect(streakDays(days(-3, -2, -1, 0), day(0))).toBe(4);
    expect(streakDays(days(-5, -1, 0), day(0))).toBe(2);
  });

  it('keeps yesterday\'s streak while today has no activity yet', () => {
    expect(streakDays(days(-2, -1), day(0))).toBe(2);
  });

  it('is 0 when the last activity was before yesterday', () => {
    expect(streakDays(days(-3, -2), day(0))).toBe(0);
    expect(streakDays([], day(0))).toBe(0);
  });

  it('crosses months and years', () => {
    expect(previousDay('2026-03-01')).toBe('2026-02-28');
    expect(previousDay('2027-01-01')).toBe('2026-12-31');
    expect(previousDay('2028-03-01')).toBe('2028-02-29');
    const now = new Date(2027, 0, 1, 9).getTime();
    expect(streakDays(['2026-12-30', '2026-12-31', '2027-01-01'], now)).toBe(3);
  });

  it('uses the local day, also just before midnight', () => {
    expect(dayKey(new Date(2026, 10, 17, 23, 59).getTime())).toBe('2026-11-17');
    expect(dayKey(new Date(2026, 10, 18, 0, 1).getTime())).toBe('2026-11-18');
  });
});

describe('durations and dates (S07, S08)', () => {
  const MIN = 60000;
  it('short form like design 12 ("9 giờ 40")', () => {
    expect(formatDuration(0, 'vi')).toBe('0 phút');
    expect(formatDuration(10_000, 'vi')).toBe('1 phút'); // something was done: never "0"
    expect(formatDuration(45 * MIN, 'vi')).toBe('45 phút');
    expect(formatDuration(120 * MIN, 'vi')).toBe('2 giờ');
    expect(formatDuration((9 * 60 + 40) * MIN, 'vi')).toBe('9 giờ 40');
    expect(formatDuration((1 * 60 + 5) * MIN, 'vi')).toBe('1 giờ 05');
    expect(formatDuration((9 * 60 + 40) * MIN, 'en')).toBe('9 h 40');
    expect(formatDuration(45 * MIN, 'en')).toBe('45 min');
  });

  it('long form like design 13 ("1 giờ 12 phút")', () => {
    expect(formatDurationLong(72 * MIN, 'vi')).toBe('1 giờ 12 phút');
    expect(formatDurationLong(60 * MIN, 'vi')).toBe('1 giờ');
    expect(formatDurationLong(3 * MIN, 'en')).toBe('3 min');
  });

  it('formats the full date dd/MM/yyyy', () => {
    expect(formatDate(new Date(2026, 10, 12, 8).getTime())).toBe('12/11/2026');
  });
});
