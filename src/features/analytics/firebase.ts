import { getAnalytics, logEvent, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics';
import { getApps } from '@react-native-firebase/app';
import { getCrashlytics, log, recordError } from '@react-native-firebase/crashlytics';
import type { MonitoringBackend } from './types';

// Firebase backend (F07). Native modules: only loaded through index.ts outside Expo Go.
// Kids app (docs/03): the identifiers are switched off at build time in firebase.json
// (ad id, SSAID, IDFV, ad storage / ad user data / ad personalisation, SKAdNetwork) and the
// iOS IdentitySupport pod is left out (`withoutAdIdSupport`, app.config.js). Here:
// - never setUserId / setUserProperty, never a user id on Crashlytics;
// - events carry only bundled artwork ids and fixed values (types.ts).
// Crashlytics installs its own handler for unhandled JS errors (fatal) when first used.

/** False when the build has no Firebase files (app.config.js), so no default app exists. */
function hasDefaultApp(): boolean {
  try {
    return getApps().length > 0;
  } catch {
    return false;
  }
}

export function createFirebaseMonitoring(): MonitoringBackend | null {
  if (!hasDefaultApp()) return null;
  const analytics = getAnalytics();
  const crashlytics = getCrashlytics(); // also installs the JS crash handler
  return {
    init(analyticsEnabled) {
      setAnalyticsCollectionEnabled(analytics, analyticsEnabled).catch(() => {});
    },
    logEvent(name, params) {
      logEvent(analytics, name, params);
    },
    recordError(error, context) {
      log(crashlytics, context);
      recordError(crashlytics, error, context);
    },
  };
}
