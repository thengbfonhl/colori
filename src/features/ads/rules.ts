// Interstitial frequency rules (F06). Pure functions, unit tested.
// Rewritten from irregular_verbs_app/src/lib/ads.ts with the A19 gap of 3 minutes.

export const AD_RULES = {
  /** No interstitial in the first 30 s after the app starts (common convention). */
  firstInterstitialAfterMs: 30_000,
  /** At most one interstitial every 3 minutes (A19 sheet, stricter than the common 60 s). */
  interstitialMinGapMs: 180_000,
} as const;

/**
 * True when an interstitial may be shown now.
 * @param appStartedAt when the app (JS) started this session
 * @param lastShownAt when the last interstitial was shown this session, or null
 */
export function canShowInterstitial(now: number, appStartedAt: number, lastShownAt: number | null): boolean {
  if (now - appStartedAt < AD_RULES.firstInterstitialAfterMs) return false;
  return lastShownAt === null || now - lastShownAt >= AD_RULES.interstitialMinGapMs;
}
