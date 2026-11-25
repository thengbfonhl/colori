// Shared types of the analytics layer (F07). No import of the native Firebase modules here, so
// this file is safe in Expo Go and in Jest.
import type { AdPlacement } from '../ads/types';

/** Time spent on a picture, in buckets (F07): never the exact time. */
export type DurationBucket = '<5m' | '5-15m' | '>15m';

/**
 * Every event the app may send (F07). Kids app: no personal data, no free text, only ids of
 * bundled artworks and fixed values. `app_open` is sent by the Firebase SDK itself.
 */
export type AnalyticsEvent =
  | { name: 'artwork_start'; params: { artwork_id: string; category: string; level: string } }
  | { name: 'artwork_complete'; params: { artwork_id: string; duration_bucket: DurationBucket } }
  | { name: 'free_draw_save' }
  | { name: 'artwork_saved_to_photos' }
  | { name: 'artwork_shared' }
  | { name: 'ad_interstitial_shown'; params: { placement: AdPlacement } }
  | { name: 'ad_interstitial_failed'; params: { placement: AdPlacement } };

/**
 * One SDK behind the analytics layer: Firebase (development / store builds) or nothing
 * (Expo Go, web, a build without the Firebase files). Every method never throws.
 */
export interface MonitoringBackend {
  /** Turns Analytics collection on / off (ANALYTICS flags). Crashlytics is not affected. */
  init(analyticsEnabled: boolean): void;
  logEvent(name: string, params?: Record<string, string>): void;
  /** Non-fatal error for Crashlytics, with a short context label (no personal data). */
  recordError(error: Error, context: string): void;
}

/** What the rest of the app uses (`monitoring` from src/features/analytics). */
export interface Monitoring {
  init(): void;
  track(event: AnalyticsEvent): void;
  /** Reports a caught error to Crashlytics. Never throws. */
  reportError(error: unknown, context: string): void;
}
