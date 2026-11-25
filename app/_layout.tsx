import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ads } from '../src/features/ads';
import { monitoring } from '../src/features/analytics';
import { initSounds } from '../src/features/feedback/feedback';
import { ParentalGateProvider } from '../src/features/gate/ParentalGate';
import { SettingsProvider, useSettings } from '../src/store/settings';
import { useWorks, WorksProvider } from '../src/store/works';
import { FONT, useTheme } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Fonts are bundled in the app (assets/fonts), so they work offline.
const FONT_FILES = {
  [FONT.regular]: require('../assets/fonts/BeVietnamPro-Regular.ttf'),
  [FONT.medium]: require('../assets/fonts/BeVietnamPro-Medium.ttf'),
  [FONT.semibold]: require('../assets/fonts/BeVietnamPro-SemiBold.ttf'),
  [FONT.bold]: require('../assets/fonts/BeVietnamPro-Bold.ttf'),
  [FONT.extrabold]: require('../assets/fonts/BeVietnamPro-ExtraBold.ttf'),
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <WorksProvider>
            <ParentalGateProvider>
              <AppStack />
            </ParentalGateProvider>
          </WorksProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppStack() {
  const { ready: settingsReady } = useSettings();
  const { ready: worksReady } = useWorks();
  const ready = settingsReady && worksReady;
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const c = useTheme();
  // If a font fails to load, still open the app with the system font rather than hang on the splash.
  const done = ready && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (done) SplashScreen.hideAsync().catch(() => {});
  }, [done]);

  // Sounds are loaded once, without blocking the splash (F09).
  useEffect(() => initSounds(), []);

  // Ads (F06): child-directed config + UMP + SDK init, once, in the background. No-op in Expo Go.
  useEffect(() => ads.init(), []);

  // Analytics + Crashlytics (F07): collection on / off from the ANALYTICS flags. No-op in Expo Go.
  useEffect(() => monitoring.init(), []);

  if (!done) return null;

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="category/[id]" />
        <Stack.Screen name="about" />
        <Stack.Screen name="licenses" />
        <Stack.Screen name="color/[artworkId]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="draw/[workId]" options={{ gestureEnabled: false }} />
        {/* S05: back goes to Home, never to the colouring screen (handled in the screen). */}
        <Stack.Screen name="complete/[workId]" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="work/[workId]" />
      </Stack>
    </>
  );
}
