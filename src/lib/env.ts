import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * True when running inside the Expo Go app. Native modules that Expo Go does not ship
 * (AdMob, Firebase) must be replaced by no-op wrappers when this returns true.
 */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export type AppEnv = 'development' | 'preview' | 'store-test' | 'production';

/** APP_ENV from eas.json, passed through app.config.js `extra.appEnv`. */
export function appEnv(): AppEnv {
  const value = Constants.expoConfig?.extra?.appEnv;
  return value === 'preview' || value === 'store-test' || value === 'production' ? value : 'development';
}

export type Links = {
  privacyPolicy: string;
  contactEmail: string;
  /** App Store numeric id; empty until the App Store Connect record exists (phase B). */
  iosAppStoreId: string;
};

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Outside links from .env, passed through app.config.js `extra.links` (see .env.example). */
export function extraLinks(): Links {
  const links = (Constants.expoConfig?.extra?.links ?? {}) as Record<string, unknown>;
  return {
    privacyPolicy: str(links.privacyPolicy),
    contactEmail: str(links.contactEmail),
    iosAppStoreId: str(links.iosAppStoreId).replace(/\D/g, ''),
  };
}
