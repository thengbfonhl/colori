import type { AnalyticsEvent, DurationBucket, Monitoring, MonitoringBackend } from './types';

// Pure JS on top of a backend (F07), unit tested with a fake backend.

const MIN = 60_000;

/** F07: `<5m`, `5-15m`, `>15m`. Negative / invalid values count as `<5m`. */
export function durationBucket(ms: number): DurationBucket {
  if (!(ms >= 5 * MIN)) return '<5m';
  return ms <= 15 * MIN ? '5-15m' : '>15m';
}

/** Firebase limits: event param values ≤ 100 chars. Our values are short ids; cut just in case. */
const MAX_VALUE = 100;

/** Error label for Crashlytics: letters, digits, `_` `-` `.` only (no paths, no user data). */
function cleanContext(context: string): string {
  return context.replace(/[^\w.-]/g, '_').slice(0, 40) || 'unknown';
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(typeof error === 'string' ? error : 'Non-Error value thrown');
}

/**
 * @param analyticsEnabled false: events are dropped (ANALYTICS flags), Crashlytics still works.
 */
export function createMonitoring(backend: MonitoringBackend, analyticsEnabled: boolean): Monitoring {
  let initDone = false;
  return {
    init() {
      if (initDone) return;
      initDone = true;
      try {
        backend.init(analyticsEnabled);
      } catch {
        // never block the app start
      }
    },
    track(event) {
      if (!analyticsEnabled) return;
      try {
        const params = 'params' in event ? toParams(event) : undefined;
        backend.logEvent(event.name, params);
      } catch {
        // analytics must never break the app
      }
    },
    reportError(error, context) {
      try {
        backend.recordError(toError(error), cleanContext(context));
      } catch {
        // ignore
      }
    },
  };
}

function toParams(event: Extract<AnalyticsEvent, { params: unknown }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(event.params)) out[k] = String(v).slice(0, MAX_VALUE);
  return out;
}
