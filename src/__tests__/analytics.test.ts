import { createAds } from '../features/ads/controller';
import type { InterstitialBackend } from '../features/ads/types';
import { createMonitoring, durationBucket } from '../features/analytics/controller';
import { noopMonitoring } from '../features/analytics/noop';
import type { MonitoringBackend } from '../features/analytics/types';

const MIN = 60_000;

function fakeBackend() {
  const events: Array<{ name: string; params?: Record<string, string> }> = [];
  const errors: Array<{ message: string; context: string }> = [];
  const inits: boolean[] = [];
  const backend: MonitoringBackend = {
    init: (enabled) => inits.push(enabled),
    logEvent: (name, params) => events.push({ name, params }),
    recordError: (error, context) => errors.push({ message: error.message, context }),
  };
  return { backend, events, errors, inits };
}

describe('durationBucket (F07)', () => {
  it('uses <5m, 5-15m, >15m', () => {
    expect(durationBucket(0)).toBe('<5m');
    expect(durationBucket(5 * MIN - 1)).toBe('<5m');
    expect(durationBucket(5 * MIN)).toBe('5-15m');
    expect(durationBucket(15 * MIN)).toBe('5-15m');
    expect(durationBucket(15 * MIN + 1)).toBe('>15m');
  });

  it('invalid values count as <5m', () => {
    expect(durationBucket(-1)).toBe('<5m');
    expect(durationBucket(Number.NaN)).toBe('<5m');
  });
});

describe('createMonitoring (F07)', () => {
  it('sends events with their params as strings', () => {
    const f = fakeBackend();
    const m = createMonitoring(f.backend, true);
    m.track({ name: 'artwork_start', params: { artwork_id: 'animals-cat', category: 'animals', level: 'easy' } });
    m.track({ name: 'artwork_shared' });
    expect(f.events).toEqual([
      { name: 'artwork_start', params: { artwork_id: 'animals-cat', category: 'animals', level: 'easy' } },
      { name: 'artwork_shared', params: undefined },
    ]);
  });

  it('cuts param values to the Firebase limit of 100 characters', () => {
    const f = fakeBackend();
    createMonitoring(f.backend, true).track({ name: 'artwork_complete', params: { artwork_id: 'x'.repeat(150), duration_bucket: '<5m' } });
    expect(f.events[0].params?.artwork_id).toHaveLength(100);
  });

  it('Analytics off (ANALYTICS flags, Q6): no event, Crashlytics still works', () => {
    const f = fakeBackend();
    const m = createMonitoring(f.backend, false);
    m.init();
    m.track({ name: 'free_draw_save' });
    m.reportError(new Error('boom'), 'autosave');
    expect(f.inits).toEqual([false]);
    expect(f.events).toEqual([]);
    expect(f.errors).toEqual([{ message: 'boom', context: 'autosave' }]);
  });

  it('init runs once', () => {
    const f = fakeBackend();
    const m = createMonitoring(f.backend, true);
    m.init();
    m.init();
    expect(f.inits).toEqual([true]);
  });

  it('reportError accepts any thrown value and cleans the context label', () => {
    const f = fakeBackend();
    const m = createMonitoring(f.backend, true);
    m.reportError('text', 'sound pop');
    m.reportError({ odd: true }, 'C:\\Users\\name\\file');
    expect(f.errors[0]).toEqual({ message: 'text', context: 'sound_pop' });
    expect(f.errors[1].message).toBe('Non-Error value thrown');
    expect(f.errors[1].context).toMatch(/^[\w.-]+$/);
  });

  it('never throws, even if the SDK does', () => {
    const throwing: MonitoringBackend = {
      init: () => {
        throw new Error('init');
      },
      logEvent: () => {
        throw new Error('log');
      },
      recordError: () => {
        throw new Error('record');
      },
    };
    const m = createMonitoring(throwing, true);
    expect(() => m.init()).not.toThrow();
    expect(() => m.track({ name: 'artwork_saved_to_photos' })).not.toThrow();
    expect(() => m.reportError(new Error('x'), 'y')).not.toThrow();
  });

  it('the no-op backend (Expo Go) accepts everything', () => {
    const m = createMonitoring(noopMonitoring, true);
    expect(() => {
      m.init();
      m.track({ name: 'artwork_shared' });
      m.reportError(new Error('x'), 'y');
    }).not.toThrow();
  });
});

describe('ad events (F07 ad_interstitial_shown / ad_interstitial_failed)', () => {
  const START = 1_000_000;
  function adBackend(showResult: boolean): InterstitialBackend {
    return { init: () => Promise.resolve(), preload: () => {}, isReady: () => true, show: () => Promise.resolve(showResult) };
  }
  const settle = () => new Promise((r) => setTimeout(r, 0));

  it('reports shown / failed for each show attempt, nothing when the rules say no', async () => {
    const results: string[] = [];
    let now = START + 10 * MIN;
    const ads = createAds(adBackend(true), () => now, START, (r, p) => results.push(`${r}:${p}`));
    ads.init();
    await settle();
    expect(await ads.maybeShowInterstitial('exit_coloring')).toBe(true);
    now += MIN; // inside the 3 minutes: not attempted, nothing reported
    expect(await ads.maybeShowInterstitial('exit_coloring')).toBe(false);
    expect(results).toEqual(['shown:exit_coloring']);

    const failed: string[] = [];
    const ads2 = createAds(adBackend(false), () => START + 10 * MIN, START, (r) => failed.push(r));
    ads2.init();
    await settle();
    await ads2.maybeShowInterstitial('exit_coloring');
    expect(failed).toEqual(['failed']);
  });

  it('a throwing listener never breaks leaving the screen', async () => {
    const ads = createAds(adBackend(true), () => START + 10 * MIN, START, () => {
      throw new Error('listener');
    });
    ads.init();
    await settle();
    await expect(ads.maybeShowInterstitial('exit_coloring')).resolves.toBe(true);
  });
});
