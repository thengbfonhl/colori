import { Feather } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MessageKey } from '../../src/i18n';
import { useSettings } from '../../src/store/settings';
import { RADIUS, TYPE, useTheme } from '../../src/theme';

// Tab bar from design 04: white bar with rounded top corners, icon + label,
// active tab in terracotta. "Tạo tranh" (AI) is replaced by "Vẽ tự do" in v1 (D3).
const TABS: { name: string; label: MessageKey; icon: keyof typeof Feather.glyphMap }[] = [
  { name: 'index', label: 'tab.explore', icon: 'compass' },
  { name: 'draw', label: 'tab.draw', icon: 'edit-2' },
  { name: 'gallery', label: 'tab.gallery', icon: 'grid' },
  { name: 'profile', label: 'tab.profile', icon: 'user' },
];

export default function TabsLayout() {
  const { t, onboardingDone } = useSettings();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  // First run: the age question (S01) before anything else.
  if (!onboardingDone) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: TYPE.tab,
        tabBarItemStyle: styles.item,
        tabBarStyle: [
          styles.bar,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
            height: BAR_HEIGHT + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
            ...Platform.select({
              ios: { shadowColor: c.text },
              default: {},
            }),
          },
        ],
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.label),
            tabBarIcon: ({ color }) => <Feather name={tab.icon} size={21} color={color as string} />,
          }}
        />
      ))}
    </Tabs>
  );
}

/** Tab bar height without the bottom safe area. */
const BAR_HEIGHT = 62;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  item: { paddingTop: 2 },
});
