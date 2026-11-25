import { AVATAR_IDS, AVATAR_NAME, DEFAULT_AVATAR, isAvatarId } from '../data/avatars';
import { ARTWORKS } from '../data/catalog';
import type { Artwork } from '../data/types';
import { agePicture, categoryArtworks, CONTINUE_MAX, continueWorks, dailyArtwork, localDayNumber } from '../features/home/picks';
import { defaultSettings, settingsReducer } from '../store/settingsReducer';
import type { Work } from '../store/worksReducer';

const art = (id: string, level: 'easy' | 'medium', order: number, category: Artwork['category'] = 'animals'): Artwork => ({
  id,
  title: { vi: id, en: id },
  category,
  level,
  audience: 'kids',
  regionCount: 10,
  optionalRegionCount: 0,
  backgroundRegion: 1,
  size: { line: 2048, regions: 1024 },
  source: { type: 'original', ref: 'x' },
  order,
});

const at = (day: number, hour: number) => new Date(2026, 10, 17 + day, hour).getTime();

describe('picture of the day (S02)', () => {
  const list = [art('e1', 'easy', 1), art('m1', 'medium', 2), art('e2', 'easy', 3), art('e3', 'easy', 4)];

  it('stays the same all day and changes the next day', () => {
    const morning = dailyArtwork(list, 'easy', at(0, 0) + 1000);
    expect(dailyArtwork(list, 'easy', at(0, 23) + 59 * 60000)).toBe(morning);
    const days = [0, 1, 2].map((d) => dailyArtwork(list, 'easy', at(d, 12))?.id);
    expect(new Set(days).size).toBe(3);
  });

  it('only picks pictures of the child\'s age group (A34)', () => {
    for (let d = 0; d < 20; d++) {
      expect(dailyArtwork(list, 'easy', at(d, 9))?.level).toBe('easy');
      expect(dailyArtwork(list, 'medium', at(d, 9))?.id).toBe('m1');
    }
  });

  it('falls back to every picture when the age group has none, null when empty', () => {
    expect(dailyArtwork([art('e1', 'easy', 1)], 'medium', at(0, 9))?.id).toBe('e1');
    expect(dailyArtwork([], 'easy', at(0, 9))).toBeNull();
  });

  it('counts local calendar days', () => {
    expect(localDayNumber(at(1, 0)) - localDayNumber(at(0, 23))).toBe(1);
    expect(localDayNumber(at(0, 0))).toBe(localDayNumber(at(0, 23)));
  });

  it('works with the real catalogue', () => {
    expect(dailyArtwork(ARTWORKS, 'easy', Date.now())?.level).toBe('easy');
    expect(dailyArtwork(ARTWORKS, 'medium', Date.now())?.level).toBe('medium');
  });
});

describe('Tiếp tục tô màu (S02)', () => {
  const w = (id: string, over: Partial<Work>): Work => ({
    id,
    kind: 'coloring',
    artworkId: id,
    status: 'in_progress',
    progress: 0.4,
    filled: [1],
    favorite: false,
    timeSpentMs: 0,
    createdAt: 0,
    updatedAt: 0,
    ...{ completedAt: null },
    ...over,
  });

  it('shows unfinished colouring works, newest first, without free drawings or missing pictures', () => {
    const works = {
      a: w('a', { updatedAt: 1 }),
      b: w('b', { updatedAt: 3 }),
      c: w('c', { status: 'done', updatedAt: 5 }),
      'draw-1': w('draw-1', { kind: 'free', artworkId: null, updatedAt: 9 }),
      gone: w('gone', { updatedAt: 7 }),
    };
    expect(continueWorks(works, (id) => id !== 'gone').map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('shows at most 10', () => {
    const works = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`a${i}`, w(`a${i}`, { updatedAt: i })]));
    const out = continueWorks(works, () => true);
    expect(out).toHaveLength(CONTINUE_MAX);
    expect(out[0].id).toBe('a14');
  });
});

describe('category list (S03)', () => {
  it('shows every picture of the topic, the child\'s age group first, then order (A34)', () => {
    const list = [art('m1', 'medium', 1), art('e1', 'easy', 2), art('m2', 'medium', 3), art('e2', 'easy', 4), art('x', 'easy', 0, 'sea')];
    expect(categoryArtworks(list, 'animals', 'easy').map((a) => a.id)).toEqual(['e1', 'e2', 'm1', 'm2']);
    expect(categoryArtworks(list, 'animals', 'medium').map((a) => a.id)).toEqual(['m1', 'm2', 'e1', 'e2']);
  });

  it('picks age card pictures from the set (S01)', () => {
    expect(agePicture(ARTWORKS, 'easy')?.level).toBe('easy');
    expect(agePicture(ARTWORKS, 'medium')?.level).toBe('medium');
    expect(agePicture([], 'easy')).toBeNull();
  });
});

describe('settings for P5 (S01, S09)', () => {
  const base = defaultSettings('vi');

  it('starts on the onboarding with 3–6 pre-selected and the cat avatar', () => {
    expect(base).toMatchObject({ onboardingDone: false, ageBand: 'easy', avatar: DEFAULT_AVATAR });
  });

  it('finishing the onboarding saves the age group', () => {
    const s = settingsReducer(base, { type: 'finishOnboarding', ageBand: 'medium' });
    expect(s).toMatchObject({ onboardingDone: true, ageBand: 'medium' });
  });

  it('changes age group and avatar', () => {
    let s = settingsReducer(base, { type: 'setAgeBand', ageBand: 'medium' });
    expect(s.ageBand).toBe('medium');
    s = settingsReducer(s, { type: 'setAvatar', avatar: 'dino' });
    expect(s.avatar).toBe('dino');
    expect(settingsReducer(s, { type: 'setAvatar', avatar: 'dino' })).toBe(s);
  });

  it('settings saved before P5 open the onboarding once; broken values are ignored', () => {
    const old = settingsReducer(base, { type: 'hydrate', saved: { language: 'en', noOverflow: false } });
    expect(old).toMatchObject({ language: 'en', noOverflow: false, onboardingDone: false, ageBand: 'easy', avatar: 'cat' });
    const broken = settingsReducer(base, { type: 'hydrate', saved: { ageBand: 'adult', avatar: 'dragon', onboardingDone: 'yes' } });
    expect(broken).toMatchObject({ ageBand: 'easy', avatar: 'cat', onboardingDone: false });
  });

  it('has 6 avatars, each with a name', () => {
    expect(AVATAR_IDS).toHaveLength(6);
    for (const id of AVATAR_IDS) {
      expect(isAvatarId(id)).toBe(true);
      expect(AVATAR_NAME[id]).toMatch(/^avatar\./);
    }
    expect(isAvatarId('dragon')).toBe(false);
  });
});
