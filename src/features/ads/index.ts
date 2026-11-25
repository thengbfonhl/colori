import { Platform } from 'react-native';
import { ADS } from '../../config';
import { isExpoGo } from '../../lib/env';
import { monitoring } from '../analytics';
import { createAds } from './controller';
import { noopBackend } from './noop';
import type { InterstitialBackend } from './types';

export { AD_RULES, canShowInterstitial } from './rules';
export type { AdPlacement, Ads } from './types';

// Ads layer (F06). AdMob is a native module that Expo Go does not have: in Expo Go the
// no-op backend is used and admob.ts (which imports react-native-google-mobile-ads) is never
// evaluated, so the app does not crash. Same when ads are turned off (ADS in src/config.ts).

function pickBackend(): InterstitialBackend {
  if (!ADS.enabled || Platform.OS === 'web' || isExpoGo()) return noopBackend;
  if (Platform.OS === 'ios' && !ADS.enabledIos) return noopBackend; // Q6
  try {
    return (require('./admob') as typeof import('./admob')).admobBackend;
  } catch {
    return noopBackend; // a build without the native module: no ads rather than a crash
  }
}

/**
 * Created when the app starts: the 30 s "no ad" window counts from here (rules.ts).
 * Each show attempt is sent as ad_interstitial_shown / ad_interstitial_failed (F07).
 */
export const ads = createAds(pickBackend(), Date.now, Date.now(), (result, placement) =>
  monitoring.track({ name: result === 'shown' ? 'ad_interstitial_shown' : 'ad_interstitial_failed', params: { placement } }),
);

/**
 * Leaving the colouring flow (S04 X / back, S05 "Tô tranh khác" / "Bộ sưu tập" / back,
 * S06 X / back – Q11): the caller saves first, then an interstitial is shown if the rules allow
 * it and one is already loaded, then `navigate` runs (after the ad is closed). Never waits for
 * an ad to load and never throws.
 */
export async function leaveColoringFlow(navigate: () => void): Promise<void> {
  try {
    await ads.maybeShowInterstitial('exit_coloring');
  } catch {
    // never block leaving the screen
  }
  navigate();
}
