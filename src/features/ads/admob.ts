import Constants from 'expo-constants';
import { Platform } from 'react-native';
import mobileAds, { AdEventType, AdsConsent, InterstitialAd, MaxAdContentRating, TestIds } from 'react-native-google-mobile-ads';
import { appEnv } from '../../lib/env';
import { monitoring } from '../analytics';
import type { InterstitialBackend } from './types';

// AdMob backend (F06). Native module: only loaded through index.ts outside Expo Go
// (development build / store builds). Kids app (docs/03):
// - interstitial only, G rating, child-directed, under age of consent, non-personalised;
// - no ATT, no IDFA, AD_ID permission blocked on Android (app.config.js);
// - UMP is called with tagForUnderAgeOfConsent: Google's UMP then never shows a consent form
//   (verified in P6, F06 "Kết quả xác minh"), and the app is never blocked by it.
// Analytics events ad_interstitial_shown / ad_interstitial_failed: sent by the controller (P7).

/** Every request: non-personalised ads only (Families policy). */
const REQUEST_OPTIONS = { requestNonPersonalizedAdsOnly: true } as const;

/** Test ad unit in every build that is not production (F06); real unit from .env / EAS env in production. */
function interstitialUnitId(): string | null {
  if (appEnv() !== 'production') return TestIds.INTERSTITIAL;
  const admob = (Constants.expoConfig?.extra?.admob ?? {}) as Record<string, unknown>;
  const id = Platform.OS === 'ios' ? admob.interstitialIos : admob.interstitialAndroid;
  return typeof id === 'string' && id.trim() !== '' ? id.trim() : null; // missing: no ads, never a test id
}

const unitId = interstitialUnitId();
let sdkReady = false;
let ad: InterstitialAd | null = null;
let loading = false;

function destroy(target: InterstitialAd | null): void {
  try {
    target?.destroy();
  } catch {
    // already destroyed
  }
}

/** Consent info update. Offline: the answer of the last session (false the very first time). */
async function canRequestAds(): Promise<boolean> {
  try {
    const info = await AdsConsent.requestInfoUpdate({ tagForUnderAgeOfConsent: true });
    return info.canRequestAds;
  } catch {
    try {
      return (await AdsConsent.getConsentInfo()).canRequestAds;
    } catch {
      return false;
    }
  }
}

export const admobBackend: InterstitialBackend = {
  async init() {
    if (!unitId) return;
    try {
      // Before initialize(): the SDK may request ads as soon as it starts.
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: true,
        tagForUnderAgeOfConsent: true,
      });
      if (!(await canRequestAds())) return;
      await mobileAds().initialize();
      sdkReady = true;
    } catch (e) {
      // No ads this session; the app works the same.
      monitoring.reportError(e, 'ads_init');
    }
  },

  preload() {
    if (!sdkReady || !unitId || loading || ad?.loaded) return;
    destroy(ad); // an ad that failed to load
    try {
      const next = InterstitialAd.createForAdRequest(unitId, REQUEST_OPTIONS);
      ad = next;
      loading = true;
      const offLoaded = next.addAdEventListener(AdEventType.LOADED, () => {
        loading = false;
        offLoaded();
        offError();
      });
      const offError = next.addAdEventListener(AdEventType.ERROR, () => {
        loading = false; // no fill, offline…: the next preload() tries again
        offLoaded();
        offError();
      });
      next.load();
    } catch {
      loading = false;
      ad = null;
    }
  },

  isReady() {
    return sdkReady && ad !== null && ad.loaded;
  },

  show() {
    const current = ad;
    if (!sdkReady || !current || !current.loaded) return Promise.resolve(false);
    ad = null; // one show per ad; the next one is loaded when the child opens a colouring screen
    return new Promise<boolean>((resolve) => {
      let done = false;
      const offs: Array<() => void> = [];
      const finish = (shown: boolean) => {
        if (done) return;
        done = true;
        for (const off of offs) off();
        destroy(current);
        resolve(shown);
      };
      try {
        offs.push(current.addAdEventListener(AdEventType.CLOSED, () => finish(true)));
        offs.push(current.addAdEventListener(AdEventType.ERROR, () => finish(false)));
        current.show().catch(() => finish(false));
      } catch {
        finish(false);
      }
    });
  },
};
