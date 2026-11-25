import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as StoreReview from 'expo-store-review';
import React from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoMark } from '../src/components/illustrations';
import { LINKS } from '../src/config';
import { ARTWORKS } from '../src/data/catalog';
import { useSettings } from '../src/store/settings';
import { MIN_TOUCH, RADIUS, SPACE, TYPE, useTheme } from '../src/theme';

// S11 – Thông tin & chính sách (no design: list style of design 14). Only reachable after the
// parental gate in S09, so the links here do not ask again.
// LINKS are temporary until Q12 (A32): check:release fails while they are.

function appVersion(): string {
  const cfg = Constants.expoConfig;
  const version = cfg?.version ?? '?';
  const build = Platform.OS === 'ios' ? cfg?.ios?.buildNumber : cfg?.android?.versionCode;
  return build !== undefined && build !== null ? `${version} (${build})` : version;
}

export default function AboutScreen() {
  const { t, language } = useSettings();
  const c = useTheme();
  const insets = useSafeAreaInsets();

  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert(t('about.openError')));

  const rate = async () => {
    try {
      if (await StoreReview.hasAction()) {
        await StoreReview.requestReview();
        return;
      }
    } catch {
      // fall through to the store page
    }
    if (Platform.OS === 'android') open(`market://details?id=${LINKS.androidPackage}`);
    else if (LINKS.iosAppStoreId) open(`itms-apps://apps.apple.com/app/id${LINKS.iosAppStoreId}?action=write-review`);
    else Alert.alert(t('about.rateUnavailable'));
  };

  const credits = ARTWORKS.filter((a) => a.source.type === 'cc-by');
  const placeholders = ARTWORKS.filter((a) => a.source.type === 'ai-placeholder').length;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [styles.back, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="chevron-left" size={22} color={c.text} />
        </Pressable>
        <Text style={[TYPE.heading, styles.flex, { color: c.text }]} accessibilityRole="header" numberOfLines={1}>
          {t('about.title')}
        </Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}>
        <View style={styles.inner}>
          <View style={styles.brand}>
            <LogoMark size={44} />
            <Text style={[TYPE.display, { color: c.text }]}>{t('app.name')}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <Row icon="shield" label={t('about.privacy')} external onPress={() => open(LINKS.privacyPolicy)} />
            <Sep />
            <Row icon="star" label={t('about.rate')} onPress={rate} />
            <Sep />
            <Row icon="mail" label={t('about.contact')} external onPress={() => open(`mailto:${LINKS.contactEmail}?subject=Colori`)} />
            <Sep />
            <Row icon="file-text" label={t('about.licenses')} onPress={() => router.push('/licenses')} />
          </View>

          <Text style={[TYPE.heading, styles.section, { color: c.text }]} accessibilityRole="header">
            {t('about.content')}
          </Text>
          <View style={[styles.card, styles.credits, { backgroundColor: c.surface }]}>
            <Text style={[TYPE.body, { color: c.text }]}>{t('about.contentFont')}</Text>
            <Text style={[TYPE.body, { color: c.text }]}>{t('about.contentIcons')}</Text>
            <Text style={[TYPE.body, { color: c.text }]}>{t('about.contentOwn')}</Text>
            <Text style={[TYPE.body, { color: c.text }]}>{t('about.contentArt')}</Text>
            {credits.map((a) => (
              <Text key={a.id} style={[TYPE.caption, { color: c.textMuted }]}>
                {t('about.credit', { title: a.title[language], author: a.source.ref })}
              </Text>
            ))}
            {placeholders > 0 && <Text style={[TYPE.caption, { color: c.danger }]}>{t('about.contentArtTemp', { n: placeholders })}</Text>}
          </View>

          <View style={[styles.card, styles.versionRow, { backgroundColor: c.surface }]}>
            <Text style={[TYPE.body, styles.flex, { color: c.text }]}>{t('about.version')}</Text>
            <Text style={[TYPE.body, { color: c.textMuted }]}>{appVersion()}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, onPress, external }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; external?: boolean }) {
  const c = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole={external ? 'link' : 'button'} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}>
      <Feather name={icon} size={19} color={c.textMuted} />
      <Text style={[TYPE.body, styles.flex, { color: c.text }]}>{label}</Text>
      <Feather name={external ? 'external-link' : 'chevron-right'} size={18} color={c.textMuted} />
    </Pressable>
  );
}

function Sep() {
  const c = useTheme();
  return <View style={[styles.sep, { backgroundColor: c.border }]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm },
  back: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: SPACE.lg },
  inner: { width: '100%', maxWidth: 600 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginVertical: SPACE.lg },
  card: { borderRadius: RADIUS.lg, paddingHorizontal: SPACE.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: MIN_TOUCH + 8 },
  sep: { height: StyleSheet.hairlineWidth },
  section: { marginTop: SPACE.xl, marginBottom: SPACE.md },
  credits: { paddingVertical: SPACE.md, gap: SPACE.sm },
  versionRow: { flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH + 8, marginTop: SPACE.lg },
});
