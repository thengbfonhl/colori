// Shared types of the ads layer (F06). No import of the native AdMob module here, so this
// file is safe in Expo Go and in Jest.

/** Where an interstitial may appear. v1: only when leaving the colouring flow (S04 / S05 / S06). */
export type AdPlacement = 'exit_coloring';

/**
 * One SDK behind the ads layer: AdMob (development / store builds) or nothing (Expo Go, ads off).
 * It knows nothing about the frequency rules; the controller applies them.
 */
export interface InterstitialBackend {
  /** Child-directed configuration + consent (UMP) + SDK init. Called once; never throws. */
  init(): Promise<void>;
  /** Starts loading the next interstitial if none is loaded or loading. Never throws. */
  preload(): void;
  /** True when an interstitial is loaded and can be shown right away. */
  isReady(): boolean;
  /**
   * Shows the loaded interstitial and resolves when it is closed (true), or right away with
   * false when it could not be shown. Never rejects.
   */
  show(): Promise<boolean>;
}

/** What the screens use (`ads` from src/features/ads). */
export interface Ads {
  init(): void;
  /** Called when the child opens a colouring / drawing screen (F06: load before it is needed). */
  preload(): void;
  /**
   * Shows an interstitial if the rules allow it and one is already loaded, and resolves when it
   * is closed. Resolves right away otherwise: never waits for an ad to load (F06).
   */
  maybeShowInterstitial(placement: AdPlacement): Promise<boolean>;
}
