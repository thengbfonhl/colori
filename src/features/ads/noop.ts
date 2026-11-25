import type { InterstitialBackend } from './types';

/**
 * No ads: Expo Go (no native AdMob module), ADS_ENABLED off, or iOS with ADS_ENABLED_IOS off (Q6).
 * Leaving the colouring screen navigates right away.
 */
export const noopBackend: InterstitialBackend = {
  init: () => Promise.resolve(),
  preload: () => {},
  isReady: () => false,
  show: () => Promise.resolve(false),
};
