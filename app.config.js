// Expo config for A19 Colori. Kids app (Families / Kids policy): only the permissions we
// really need, no tracking identifiers. Values marked "P4", "P6", "P7" were added in those phases.
//
// Splash colours must match `bg` in src/theme.ts (light / dark).
const fs = require('fs');
const path = require('path');

const SPLASH_BG = { light: '#F6F3EB', dark: '#1C1A17' };
const PHOTO_ADD_TEXT = 'Colori cần quyền này để lưu tranh bé đã tô vào thư viện Ảnh.';

// Environment (.env, see .env.example). Expo CLI loads .env into process.env before reading
// this file; on EAS the values come from the build profile / EAS environment variables.
// No secrets here: the app has no server or API. Every value read by the JS code goes through
// `extra` and is read back in src/config.ts.
const env = (name, fallback = '') => {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : fallback;
};

/**
 * Temporary outside links until Q12 is answered (A32). Used when .env does not set them.
 * `npm run check:release` fails while a link still contains "example.com".
 */
const TEMP_LINKS = {
  privacyPolicy: 'https://example.com/apps/colori/privacy',
  contactEmail: 'support@example.com',
};

/**
 * AdMob (F06). Builds that are not production always use Google's sample app ids and test ad
 * units, so a development / preview / store-test build can never show a real ad. Production
 * takes the real ids from .env / EAS environment variables (ADMOB_*); they are not in the repo.
 */
const ADMOB_TEST_APP_IDS = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
};

function admobConfig(appEnv) {
  if (appEnv !== 'production') {
    return { appIdAndroid: ADMOB_TEST_APP_IDS.android, appIdIos: ADMOB_TEST_APP_IDS.ios, interstitialAndroid: '', interstitialIos: '' };
  }
  const ids = {
    appIdAndroid: env('ADMOB_APP_ID_ANDROID'),
    appIdIos: env('ADMOB_APP_ID_IOS'),
    interstitialAndroid: env('ADMOB_INTERSTITIAL_ANDROID'),
    interstitialIos: env('ADMOB_INTERSTITIAL_IOS'),
  };
  // A production build without the real ids would crash (no app id) or ship test ids: stop here.
  const missing = Object.entries(ids).filter(([, v]) => !v || v.includes('3940256099942544'));
  if (missing.length) {
    throw new Error(`APP_ENV=production cần AdMob ID thật: ${missing.map(([k]) => k).join(', ')} (ADMOB_* trong .env / biến môi trường EAS, F06)`);
  }
  return ids;
}

/**
 * Firebase (P7 / F07). The two config files are not in the repo (.gitignore): paths come from
 * .env / EAS "file" environment variables (GOOGLE_SERVICES_PLIST, GOOGLE_SERVICES_JSON).
 * - Both files present: Firebase plugins are added (Analytics + Crashlytics).
 * - Missing, not production: the build has no Firebase at all (the JS layer then sends nothing).
 *   Expo Go never needs them.
 * - Missing, production: stop here, a store build must have Crashlytics.
 * Kids settings (no ad id, SSAID, IDFV…) are in firebase.json, read by the native build.
 */
function firebaseConfig(appEnv) {
  const files = {
    ios: path.resolve(__dirname, env('GOOGLE_SERVICES_PLIST', './GoogleService-Info.plist')),
    android: path.resolve(__dirname, env('GOOGLE_SERVICES_JSON', './google-services.json')),
  };
  const missing = Object.entries(files).filter(([, f]) => !fs.existsSync(f));
  if (!missing.length) return files;
  if (appEnv === 'production') {
    throw new Error(`APP_ENV=production cần file Firebase: ${missing.map(([, f]) => f).join(', ')} (GOOGLE_SERVICES_PLIST / GOOGLE_SERVICES_JSON, F07)`);
  }
  return null;
}

module.exports = () => {
  const appEnv = env('APP_ENV', 'development');
  const admob = admobConfig(appEnv);
  const firebase = firebaseConfig(appEnv);
  return {
    name: 'Colori',
    slug: 'colori',
    scheme: 'colori',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    description: 'Colori – tô màu cho bé 3–12 tuổi. Chạm để tô từng vùng, vẽ tự do, lưu tranh vào Bộ sưu tập. Chạy offline.',
    ios: {
      bundleIdentifier: 'com.innofly.colori',
      buildNumber: '1',
      supportsTablet: true,
      infoPlist: {
        CFBundleDevelopmentRegion: 'vi',
        CFBundleLocalizations: ['vi', 'en'],
        ITSAppUsesNonExemptEncryption: false,
        // Portrait only on iPad too (D9). Without this, App Store upload rejects an iPad app
        // that does not support all orientations (multitasking).
        UIRequiresFullScreen: true,
        // Only "add photos" (write), never read access (docs/03 §6). Used from P4.
        NSPhotoLibraryAddUsageDescription: PHOTO_ADD_TEXT,
      },
      ...(firebase ? { googleServicesFile: firebase.ios } : {}),
    },
    android: {
      package: 'com.innofly.colori',
      versionCode: 1,
      blockedPermissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.READ_CONTACTS',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_AUDIO',
        'android.permission.ACCESS_MEDIA_LOCATION',
        'android.permission.SYSTEM_ALERT_WINDOW',
        // No advertising ID for a kids app (docs/03). The Google Mobile Ads SDK (20.4.0+) adds
        // this permission to its manifest; blockedPermissions removes it from the merged manifest
        // (verified in P6, check the final manifest on the first Android build – phase B).
        'com.google.android.gms.permission.AD_ID',
      ],
      ...(firebase ? { googleServicesFile: firebase.android } : {}),
    },
    plugins: [
      'expo-router',
      'expo-image',
      'expo-localization',
      [
        'expo-splash-screen',
        {
          backgroundColor: SPLASH_BG.light,
          dark: { backgroundColor: SPLASH_BG.dark },
        },
      ],
      'expo-font',
      'expo-status-bar',
      // F09: short UI sounds only. No microphone, no background audio (kids app, docs/03).
      ['expo-audio', { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false }],
      'expo-sharing',
      [
        // P4: save to Photos. iOS: only "add photos" (NSPhotoLibraryUsageDescription removed, docs/03 §6).
        // Android: images only (no video / audio). Check the final permission list on the first
        // Android build (phase B) – the library still declares READ_MEDIA_IMAGES.
        'expo-media-library',
        {
          photosPermission: false,
          savePhotosPermission: PHOTO_ADD_TEXT,
          isAccessMediaLocationEnabled: false,
          granularPermissions: ['photo'],
        },
      ],
      [
        'expo-build-properties',
        {
          // D11: iOS 16.4+ (Android 7.0 / API 24 is already the SDK 58 default).
          // P7: @react-native-firebase 27 is SPM-only and needs dynamic frameworks (not 'static'
          // like jlpt_app on v26). Always on, so every iOS build links the same way (F07).
          ios: { deploymentTarget: '16.4', useFrameworks: 'dynamic' },
        },
      ],
      [
        // P6 / F06: interstitial only. No `userTrackingUsageDescription`: no ATT, no IDFA (docs/03).
        'react-native-google-mobile-ads',
        { androidAppId: admob.appIdAndroid, iosAppId: admob.appIdIos },
      ],
      // P7 / F07: only when the Firebase files exist (firebaseConfig). iOS without the
      // IdentitySupport pod: no IDFA code in the app (kids app, docs/03).
      ...(firebase
        ? [
            '@react-native-firebase/app',
            '@react-native-firebase/crashlytics',
            ['@react-native-firebase/analytics', { ios: { withoutAdIdSupport: true } }],
          ]
        : []),
    ],
    experiments: {
      typedRoutes: false,
    },
    extra: {
      appEnv,
      links: {
        privacyPolicy: env('PRIVACY_URL', TEMP_LINKS.privacyPolicy),
        contactEmail: env('CONTACT_EMAIL', TEMP_LINKS.contactEmail),
        iosAppStoreId: env('IOS_APP_STORE_ID'),
      },
      // P6: interstitial unit ids, read by src/features/ads/admob.ts in production only.
      admob: { interstitialAndroid: admob.interstitialAndroid, interstitialIos: admob.interstitialIos },
    },
  };
};
