import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../src/components/Buttons';
import { ARTWORKS, getArtworkAssets } from '../src/data/catalog';
import type { ArtworkLevel } from '../src/data/types';
import { agePicture } from '../src/features/home/picks';
import type { MessageKey } from '../src/i18n';
import { useSettings } from '../src/store/settings';
import { MIN_TOUCH, RADIUS, SPACE, TYPE, useTheme, type Palette } from '../src/theme';

// S01 – Onboarding, design 02 only (design 01 "choose experience" is hidden while
// FEATURES.adultMode is off, D2). Shown until "Bắt đầu tô màu" is pressed: killing the app
// before that shows it again. 3–6 is pre-selected (A34).
// `?mode=change`: same picker opened from S09 "Đổi độ tuổi" (after the parental gate),
// with a back button and "Lưu".

const OPTIONS: { level: ArtworkLevel; title: MessageKey; body: MessageKey; bg: keyof Palette }[] = [
  { level: 'easy', title: 'age.easy', body: 'age.easyBody', bg: 'mintSoft' },
  { level: 'medium', title: 'age.medium', body: 'age.mediumBody', bg: 'peachSoft' },
];

export default function OnboardingScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const changing = mode === 'change';
  const { t, ageBand, finishOnboarding, setAgeBand } = useSettings();
  const c = useTheme();
  const [selected, setSelected] = useState<ArtworkLevel>(changing ? ageBand : 'easy');

  const done = () => {
    if (changing) {
      setAgeBand(selected);
      router.back();
    } else {
      finishOnboarding(selected);
      router.replace('/');
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: c.bg }]}>
      {/* First run: no swipe back (nothing behind). */}
      <Stack.Screen options={{ gestureEnabled: changing }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.inner}>
          <View style={styles.top}>
            {changing && (
              <Pressable
                onPress={() => router.back()}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={t('common.back')}
                style={({ pressed }) => [styles.back, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="chevron-left" size={22} color={c.text} />
              </Pressable>
            )}
          </View>
          <Text style={[TYPE.display, styles.title, { color: c.text }]} accessibilityRole="header">
            {t(changing ? 'onboarding.changeTitle' : 'onboarding.title')}
          </Text>
          <Text style={[TYPE.body, styles.body, { color: c.textMuted }]}>{t('onboarding.body')}</Text>

          <View style={styles.cards} accessibilityRole="radiogroup">
            {OPTIONS.map((o) => {
              const on = o.level === selected;
              const art = agePicture(ARTWORKS, o.level);
              const thumb = art ? getArtworkAssets(art.id)?.thumb : undefined;
              return (
                <Pressable
                  key={o.level}
                  onPress={() => setSelected(o.level)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${t(o.title)}, ${t(o.body)}`}
                  style={[styles.card, { backgroundColor: c.surface, borderColor: on ? c.inverse : c.border, borderWidth: on ? 2 : 1 }]}
                >
                  <View style={[styles.art, { backgroundColor: c[o.bg] }]}>
                    {thumb !== undefined && (
                      <View style={[styles.artPaper, { backgroundColor: c.paper }]}>
                        <Image source={thumb} style={StyleSheet.absoluteFill} contentFit="contain" />
                      </View>
                    )}
                  </View>
                  <View style={styles.cardRow}>
                    <View style={styles.flex}>
                      <Text style={[TYPE.title, { color: c.text }]}>{t(o.title)}</Text>
                      <Text style={[TYPE.body, { color: c.textMuted }]}>{t(o.body)}</Text>
                    </View>
                    <View style={[styles.radio, { borderColor: on ? c.success : c.borderStrong }]}>
                      {on && <View style={[styles.radioDot, { backgroundColor: c.success }]} />}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={styles.bottom}>
        <PillButton label={t(changing ? 'onboarding.save' : 'onboarding.start')} onPress={done} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: SPACE.xl },
  inner: { width: '100%', maxWidth: 520 },
  top: { height: MIN_TOUCH, marginTop: SPACE.sm, marginBottom: SPACE.lg, justifyContent: 'center' },
  back: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, lineHeight: 36 },
  body: { marginTop: SPACE.sm, marginBottom: SPACE.xl },
  cards: { gap: SPACE.lg },
  card: { borderRadius: RADIUS.lg, padding: SPACE.md },
  art: { height: 112, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  artPaper: { width: 92, height: 92, borderRadius: RADIUS.sm, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.md, paddingHorizontal: SPACE.xs },
  flex: { flex: 1 },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 14, height: 14, borderRadius: 7 },
  bottom: { width: '100%', maxWidth: 520 + SPACE.xl * 2, alignSelf: 'center', paddingHorizontal: SPACE.xl, paddingVertical: SPACE.md },
});
