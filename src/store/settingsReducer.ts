import { DEFAULT_AVATAR, isAvatarId, type AvatarId } from '../data/avatars';
import type { ArtworkLevel } from '../data/types';
import type { Language } from '../i18n';

// Pure reducer for app settings (no React, no storage) so it can be unit tested.
// Stars live in the works store (F04, P4), not here.

/** v1 is always 'kids'. 'adult' is prepared for later (D2). */
export type Experience = 'kids' | 'adult';

export type Settings = {
  language: Language;
  experience: Experience;
  /** "Tô không tràn viền" (F03): brush / eraser lines stay inside the region they start in. Switch in P5. */
  noOverflow: boolean;
  /** "Âm thanh khi tô" (F09): pop / tada / tick. Off = no sound, haptics stay. Switch in P5. */
  sound: boolean;
  /** Age group (D7): easy = 3–6 years, medium = 7–12 years. Chosen in S01, changed in S09 (gate). */
  ageBand: ArtworkLevel;
  /** Profile avatar (S09, A33). */
  avatar: AvatarId;
  /** S01 was finished; until then the app opens on the onboarding. */
  onboardingDone: boolean;
};

export type SettingsAction =
  | { type: 'hydrate'; saved: unknown }
  | { type: 'setLanguage'; language: Language }
  | { type: 'setNoOverflow'; value: boolean }
  | { type: 'setSound'; value: boolean }
  | { type: 'setAgeBand'; ageBand: ArtworkLevel }
  | { type: 'setAvatar'; avatar: AvatarId }
  /** S01 "Bắt đầu tô màu": saves the age group and never shows the onboarding again. */
  | { type: 'finishOnboarding'; ageBand: ArtworkLevel };

export const defaultSettings = (language: Language): Settings => ({
  language,
  experience: 'kids',
  noOverflow: true,
  sound: true,
  ageBand: 'easy', // A34: 3–6 is pre-selected in S01
  avatar: DEFAULT_AVATAR,
  onboardingDone: false,
});

/** Keeps only valid saved values, so old or broken storage never crashes the app. */
export function sanitize(saved: unknown, base: Settings): Settings {
  if (!saved || typeof saved !== 'object') return base;
  const s = saved as Partial<Record<keyof Settings, unknown>>;
  return {
    language: s.language === 'vi' || s.language === 'en' ? s.language : base.language,
    experience: s.experience === 'adult' || s.experience === 'kids' ? s.experience : base.experience,
    noOverflow: typeof s.noOverflow === 'boolean' ? s.noOverflow : base.noOverflow,
    sound: typeof s.sound === 'boolean' ? s.sound : base.sound,
    ageBand: s.ageBand === 'easy' || s.ageBand === 'medium' ? s.ageBand : base.ageBand,
    avatar: isAvatarId(s.avatar) ? s.avatar : base.avatar,
    onboardingDone: typeof s.onboardingDone === 'boolean' ? s.onboardingDone : base.onboardingDone,
  };
}

export function settingsReducer(state: Settings, action: SettingsAction): Settings {
  switch (action.type) {
    case 'hydrate':
      return sanitize(action.saved, state);
    case 'setLanguage':
      return state.language === action.language ? state : { ...state, language: action.language };
    case 'setNoOverflow':
      return state.noOverflow === action.value ? state : { ...state, noOverflow: action.value };
    case 'setSound':
      return state.sound === action.value ? state : { ...state, sound: action.value };
    case 'setAgeBand':
      return state.ageBand === action.ageBand ? state : { ...state, ageBand: action.ageBand };
    case 'setAvatar':
      return state.avatar === action.avatar ? state : { ...state, avatar: action.avatar };
    case 'finishOnboarding':
      return { ...state, ageBand: action.ageBand, onboardingDone: true };
  }
}
