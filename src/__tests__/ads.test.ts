import { createAds } from '../features/ads/controller';
import { noopBackend } from '../features/ads/noop';
import { AD_RULES, canShowInterstitial } from '../features/ads/rules';
import type { InterstitialBackend } from '../features/ads/types';

const START = 1_000_000;
const SEC = 1000;
const MIN = 60 * SEC;

describe('canShowInterstitial (F06)', () => {
  it('uses 30 s after start and 3 minutes between two ads', () => {
    expect(AD_RULES.firstInterstitialAfterMs).toBe(30 * SEC);
    expect(AD_RULES.interstitialMinGapMs).toBe(3 * MIN);
  });

  it('never shows in the first 30 s after the app starts', () => {
    expect(canShowInterstitial(START, START, null)).toBe(false);
    expect(canShowInterstitial(START + 29_999, START, null)).toBe(false);
    expect(canShowInterstitial(START + 30 * SEC, START, null)).toBe(true);
  });

  it('first ad of the session: only the 30 s rule applies', () => {
    expect(canShowInterstitial(START + 10 * MIN, START, null)).toBe(true);
  });

  it('at most one ad every 3 minutes', () => {
    const shown = START + 1 * MIN;
    expect(canShowInterstitial(shown + 1 * MIN, START, shown)).toBe(false);
    expect(canShowInterstitial(shown + 3 * MIN - 1, START, shown)).toBe(false);
    expect(canShowInterstitial(shown + 3 * MIN, START, shown)).toBe(true);
  });

  it('the 30 s rule wins even if lastShownAt is old (clock / new session)', () => {
    expect(canShowInterstitial(START + 10 * SEC, START, START - 10 * MIN)).toBe(false);
  });
});

/** Fake SDK: an ad is loaded after preload() when `fill` is true; show() resolves `showResult`. */
function fakeBackend(opts: { fill?: boolean; showResult?: boolean } = {}) {
  const calls = { init: 0, preload: 0, show: 0 };
  let loaded = false;
  let closeAd: ((shown: boolean) => void) | null = null;
  const backend: InterstitialBackend = {
    init: async () => {
      calls.init++;
    },
    preload: () => {
      calls.preload++;
      if (opts.fill !== false) loaded = true;
    },
    isReady: () => loaded,
    show: () => {
      calls.show++;
      loaded = false;
      return new Promise<boolean>((resolve) => {
        closeAd = resolve;
        if (opts.showResult !== undefined) resolve(opts.showResult);
      });
    },
  };
  return { backend, calls, close: (shown = true) => closeAd?.(shown) };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('createAds controller (F06)', () => {
  it('init once, then preloads the first ad', async () => {
    const { backend, calls } = fakeBackend();
    const ads = createAds(backend, () => START, START);
    ads.init();
    ads.init();
    await flush();
    expect(calls.init).toBe(1);
    expect(calls.preload).toBe(1);
  });

  it('no ad before init (e.g. while consent is pending)', async () => {
    const { backend, calls } = fakeBackend();
    const ads = createAds(backend, () => START + 10 * MIN, START);
    ads.preload();
    expect(calls.preload).toBe(0);
    await expect(ads.maybeShowInterstitial('exit_coloring')).resolves.toBe(false);
  });

  it('no ad in the first 30 s, even when one is loaded', async () => {
    let now = START;
    const { backend, calls } = fakeBackend({ showResult: true });
    const ads = createAds(backend, () => now, START);
    ads.init();
    await flush();
    now = START + 20 * SEC;
    await expect(ads.maybeShowInterstitial('exit_coloring')).resolves.toBe(false);
    expect(calls.show).toBe(0);
  });

  it('leaving twice within 3 minutes shows only one ad', async () => {
    let now = START;
    const { backend, calls } = fakeBackend({ showResult: true });
    const ads = createAds(backend, () => now, START);
    ads.init();
    await flush();
    now = START + 1 * MIN;
    await expect(ads.maybeShowInterstitial('exit_coloring')).resolves.toBe(true);
    ads.preload(); // next colouring screen
    now = START + 3 * MIN;
    await expect(ads.maybeShowInterstitial('exit_coloring')).resolves.toBe(false);
    now = START + 4 * MIN;
    await expect(ads.maybeShowInterstitial('exit_coloring')).resolves.toBe(true);
    expect(calls.show).toBe(2);
  });

  it('never waits for an ad to load: not loaded → leave now, and start loading', async () => {
    const { backend, calls } = fakeBackend({ fill: false });
    const ads = createAds(backend, () => START + 10 * MIN, START);
    ads.init();
    await flush();
    const before = calls.preload;
    await expect(ads.maybeShowInterstitial('exit_coloring')).resolves.toBe(false);
    expect(calls.show).toBe(0);
    expect(calls.preload).toBe(before + 1);
  });

  it('resolves only when the ad is closed (navigation waits for it)', async () => {
    const fake = fakeBackend();
    const ads = createAds(fake.backend, () => START + 10 * MIN, START);
    ads.init();
    await flush();
    let done = false;
    const p = ads.maybeShowInterstitial('exit_coloring').then((v) => {
      done = true;
      return v;
    });
    await flush();
    expect(done).toBe(false);
    fake.close(true);
    await expect(p).resolves.toBe(true);
  });

  it('a second exit while an ad is on screen does not show another one', async () => {
    const fake = fakeBackend();
    const ads = createAds(fake.backend, () => START + 10 * MIN, START);
    ads.init();
    await flush();
    const first = ads.maybeShowInterstitial('exit_coloring');
    await expect(ads.maybeShowInterstitial('exit_coloring')).resolves.toBe(false);
    fake.close(true);
    await first;
    expect(fake.calls.show).toBe(1);
  });

  it('an ad that failed to show does not count for the 3 minutes', async () => {
    let now = START + 1 * MIN;
    let result = false;
    const { backend, calls } = fakeBackend();
    const wrapped: InterstitialBackend = {
      ...backend,
      show: () => {
        calls.show++;
        return Promise.resolve(result);
      },
    };
    const ads = createAds(wrapped, () => now, START);
    ads.init();
    await flush();
    await expect(ads.maybeShowInterstitial('exit_coloring')).resolves.toBe(false);
    result = true;
    now += 10 * SEC;
    await expect(ads.maybeShowInterstitial('exit_coloring')).resolves.toBe(true);
  });

  it('no-op backend (Expo Go / ads off): never shows, never throws', async () => {
    const ads = createAds(noopBackend, () => START + 10 * MIN, START);
    ads.init();
    ads.preload();
    await expect(ads.maybeShowInterstitial('exit_coloring')).resolves.toBe(false);
  });
});
