import { canShowInterstitial } from './rules';
import type { AdPlacement, Ads, InterstitialBackend } from './types';

/** Called once per show attempt (F07 events ad_interstitial_shown / ad_interstitial_failed). */
export type AdResultListener = (result: 'shown' | 'failed', placement: AdPlacement) => void;

/**
 * Applies the frequency rules (rules.ts) on top of a backend. Pure JS, unit tested with a fake
 * backend. The time of app start and of the last interstitial live only in memory: a new app
 * start begins a new 30 s window, like the convention.
 */
export function createAds(
  backend: InterstitialBackend,
  now: () => number = Date.now,
  appStartedAt: number = now(),
  onResult: AdResultListener = () => {},
): Ads {
  let lastShownAt: number | null = null;
  let initStarted = false;
  let showing = false;
  const report: AdResultListener = (result, placement) => {
    try {
      onResult(result, placement);
    } catch {
      // a listener must never break leaving the screen
    }
  };

  return {
    init() {
      if (initStarted) return;
      initStarted = true;
      backend.init().then(
        () => backend.preload(),
        () => {},
      );
    },
    preload() {
      if (initStarted) backend.preload();
    },
    async maybeShowInterstitial(placement: AdPlacement) {
      if (showing || !initStarted) return false;
      if (!canShowInterstitial(now(), appStartedAt, lastShownAt)) return false;
      if (!backend.isReady()) {
        backend.preload(); // not loaded yet: leave now, the next exit may have one
        return false;
      }
      showing = true;
      lastShownAt = now();
      try {
        const shown = await backend.show();
        if (!shown) lastShownAt = null; // failed to show: it does not count for the 3 minutes
        report(shown ? 'shown' : 'failed', placement);
        return shown;
      } finally {
        showing = false;
      }
    },
  };
}
