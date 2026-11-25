import { useBottomTabBarHeight } from 'expo-router/tabs';
import React from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MessageKey } from '../i18n';
import { useSettings } from '../store/settings';
import { SPACE, TYPE, useTheme } from '../theme';

/** Content never gets wider than this (tablets, S02 / S07 / S09): centred instead. */
export const MAX_CONTENT_WIDTH = 760;
/** Side padding of a tab page. */
export const PAGE_SIDE = SPACE.lg + SPACE.xs;

/** Usable width inside a TabScreen (for grids): window width capped, minus the side padding. */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width, MAX_CONTENT_WIDTH) - PAGE_SIDE * 2;
}

/** Grid columns for picture grids: 2 on phones, 3–4 on tablets (S03, S07). */
export function gridColumns(windowWidth: number): number {
  if (windowWidth >= 1000) return 4;
  if (windowWidth >= 600) return 3;
  return 2;
}

/**
 * Page frame for a tab: big title like design 12 ("Bộ sưu tập") or a custom `header` (Home),
 * content scrolls above the floating tab bar.
 */
export function TabScreen({ title, header, children }: { title?: MessageKey; header?: React.ReactNode; children?: React.ReactNode }) {
  const { t } = useSettings();
  const c = useTheme();
  // The tab bar floats (position absolute, rounded corners), so leave room for it.
  const tabBarHeight = useBottomTabBarHeight();
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + SPACE.xl }]}>
        <View style={styles.inner}>
          {header ??
            (title && (
              <Text style={[TYPE.display, { color: c.text }]} accessibilityRole="header">
                {t(title)}
              </Text>
            ))}
          {children ?? <Text style={[TYPE.body, styles.placeholder, { color: c.textMuted }]}>{t('common.comingSoon')}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: PAGE_SIDE, paddingTop: SPACE.md, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MAX_CONTENT_WIDTH - PAGE_SIDE * 2 },
  placeholder: { marginTop: SPACE.sm },
});
