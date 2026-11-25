import { Platform } from 'react-native';
import { ANALYTICS } from '../../config';
import { isExpoGo } from '../../lib/env';
import { createMonitoring } from './controller';
import { noopMonitoring } from './noop';
import type { MonitoringBackend } from './types';

export { durationBucket } from './controller';
export type { AnalyticsEvent, DurationBucket, Monitoring } from './types';

// Analytics + Crashlytics layer (F07). Firebase is a native module that Expo Go does not have:
// in Expo Go the no-op backend is used and firebase.ts (which imports @react-native-firebase)
// is never evaluated, so the app does not crash. Same on web and in a build made without the
// Firebase files.

function pickBackend(): MonitoringBackend {
  if (Platform.OS === 'web' || isExpoGo()) return noopMonitoring;
  try {
    const { createFirebaseMonitoring } = require('./firebase') as typeof import('./firebase');
    return createFirebaseMonitoring() ?? noopMonitoring;
  } catch {
    return noopMonitoring; // a build without the native modules: nothing sent rather than a crash
  }
}

const analyticsEnabled = ANALYTICS.enabled && (Platform.OS !== 'ios' || ANALYTICS.enabledIos); // Q6

/** `monitoring.track(...)` for F07 events, `monitoring.reportError(...)` for caught errors. */
export const monitoring = createMonitoring(pickBackend(), analyticsEnabled);
