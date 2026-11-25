import { extraLinks } from './lib/env';

// Feature flags (docs/features/F08). v1 = Kids only; the rest is kept for later versions.
// Do not delete code behind a flag that is off: it is prepared for Adult mode (D2).
export const FEATURES = {
  adultMode: false, // D2 – when on: design 01 (choose experience), 03, 05, 08
  aiCreate: false, // D3 – AI picture creation, later version
  worlds: false, // "Thế giới khám phá" – v1.1
  badges: false, // badges – v1.1
  printPdf: false, // v1.1
  music: false, // background music – v1.1 (Q9)
  galleryStats: true, // "Nên có" (Q20), turn off if cut
} as const;

export type FeatureName = keyof typeof FEATURES;

/**
 * Ads (F06): interstitial only, when leaving the colouring flow. Expo Go never shows ads
 * (no native module). `enabledIos` is the Q6 fallback: an iOS build without ads if Apple
 * rejects ads in a kids app.
 */
export const ADS = {
  enabled: true,
  enabledIos: true,
} as const;

/**
 * Firebase (F07, Q5 → A39). Expo Go never sends anything (no native module).
 * - `enabled` / `enabledIos`: Analytics events. `enabledIos` is the Q6 fallback (like
 *   `ADS.enabledIos`): an iOS build without Analytics if Apple rejects analytics in a kids app.
 * - Crashlytics stays on whenever Firebase is in the build (crash logs only, no user id).
 */
export const ANALYTICS = {
  enabled: true,
  enabledIos: true,
} as const;

/**
 * Outside links of S11 (opened only after the parental gate in S09).
 * Values come from .env (PRIVACY_URL, CONTACT_EMAIL, IOS_APP_STORE_ID) through app.config.js
 * `extra.links`. Without .env they are the temporary example.com values of A32;
 * `npm run check:release` fails while they are (Q12).
 */
export const LINKS = {
  ...extraLinks(),
  androidPackage: 'com.innofly.colori',
} as const;
