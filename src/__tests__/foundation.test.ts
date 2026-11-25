import { FEATURES } from '../config';
import { translate } from '../i18n';
import { en } from '../i18n/en';
import { vi } from '../i18n/vi';
import { defaultSettings, settingsReducer } from '../store/settingsReducer';
import { KIDS_PALETTE, PALETTE_PAGE_SIZE, THEMES, type Palette } from '../theme';

describe('settingsReducer', () => {
  const base = defaultSettings('vi');

  it('starts in kids experience (v1 has no adult mode)', () => {
    expect(base).toEqual({ language: 'vi', experience: 'kids', noOverflow: true, sound: true, ageBand: 'easy', avatar: 'cat', onboardingDone: false });
  });

  it('changes the language', () => {
    expect(settingsReducer(base, { type: 'setLanguage', language: 'en' }).language).toBe('en');
  });

  it('turns "tô không tràn viền" on and off', () => {
    const off = settingsReducer(base, { type: 'setNoOverflow', value: false });
    expect(off.noOverflow).toBe(false);
    expect(settingsReducer(off, { type: 'setNoOverflow', value: false })).toBe(off);
  });

  it('turns "âm thanh khi tô" on and off (F09)', () => {
    const off = settingsReducer(base, { type: 'setSound', value: false });
    expect(off.sound).toBe(false);
    expect(settingsReducer(off, { type: 'setSound', value: false })).toBe(off);
  });

  it('returns the same object when nothing changes', () => {
    expect(settingsReducer(base, { type: 'setLanguage', language: 'vi' })).toBe(base);
  });

  it('keeps valid saved values and ignores broken ones', () => {
    expect(settingsReducer(base, { type: 'hydrate', saved: { language: 'en', experience: 'kids' } })).toEqual({
      language: 'en',
      experience: 'kids',
      noOverflow: true, // saved before P3: default on (F03)
      sound: true, // saved before P4: default on (F09)
      ageBand: 'easy', // saved before P5: defaults, onboarding shown once
      avatar: 'cat',
      onboardingDone: false,
    });
    expect(settingsReducer(base, { type: 'hydrate', saved: { noOverflow: false } }).noOverflow).toBe(false);
    expect(settingsReducer(base, { type: 'hydrate', saved: { noOverflow: 'no' } }).noOverflow).toBe(true);
    expect(settingsReducer(base, { type: 'hydrate', saved: { sound: false } }).sound).toBe(false);
    expect(settingsReducer(base, { type: 'hydrate', saved: { language: 'fr', experience: 42 } })).toEqual(base);
    expect(settingsReducer(base, { type: 'hydrate', saved: null })).toEqual(base);
    expect(settingsReducer(base, { type: 'hydrate', saved: 'garbage' })).toEqual(base);
  });
});

describe('i18n', () => {
  it('has the same keys in vi and en', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
  });

  it('has no empty strings', () => {
    for (const text of [...Object.values(vi), ...Object.values(en)]) expect(text.trim()).not.toBe('');
  });

  it('translates and fills params', () => {
    expect(translate('vi', 'tab.draw')).toBe('Vẽ tự do');
    expect(translate('en', 'tab.draw')).toBe('Draw');
  });
});

describe('config', () => {
  it('v1 is kids only: adult mode and AI creation are off', () => {
    expect(FEATURES.adultMode).toBe(false);
    expect(FEATURES.aiCreate).toBe(false);
  });
});

// WCAG contrast ratio between two #RRGGBB colours.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each(Object.entries(THEMES) as [string, Palette][])('theme %s', (_name, c) => {
  it('main and muted text are readable on background and cards (≥ 4.5)', () => {
    for (const bg of [c.bg, c.surface]) {
      expect(contrast(c.text, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.textMuted, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('button text is readable on primary and inverse (≥ 4.5)', () => {
    expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.onInverse, c.inverse)).toBeGreaterThanOrEqual(4.5);
  });

  it('primary used as text (links like "Xem hết") is readable on background (≥ 4.5)', () => {
    expect(contrast(c.primary, c.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('colouring paper is always white', () => {
    expect(c.paper).toBe('#FFFFFF');
  });
});

describe('theme', () => {
  it('light and dark have the same tokens', () => {
    expect(Object.keys(THEMES.dark).sort()).toEqual(Object.keys(THEMES.light).sort());
  });

  it('has 48 distinct kids colours, 4 full pages', () => {
    expect(new Set(KIDS_PALETTE).size).toBe(48);
    expect(KIDS_PALETTE.length % PALETTE_PAGE_SIZE).toBe(0);
  });
});
