import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PillButton } from '../../src/components/Buttons';
import { Confetti } from '../../src/components/Confetti';
import { StarIcon } from '../../src/components/icons';
import { leaveColoringFlow } from '../../src/features/ads';
import { durationBucket, monitoring } from '../../src/features/analytics';
import { useFeedback } from '../../src/features/feedback/feedback';
import { useParentalGate } from '../../src/features/gate/ParentalGate';
import { shareWork } from '../../src/features/works/workActions';
import { useFinalImage } from '../../src/features/works/workImage';
import { workTitle } from '../../src/features/works/WorkThumb';
import { formatDayMonth } from '../../src/lib/format';
import { goToTab } from '../../src/lib/nav';
import { useSettings } from '../../src/store/settings';
import { useWorks } from '../../src/store/works';
import { RADIUS, SPACE, TYPE, useTheme } from '../../src/theme';

// S05 – Hoàn thành (design 07). Reached with router.replace from S04 (✓ Xong / 100%) or S06
// (✓ Lưu). The work is already saved and completed there (final.png, status, star: F04);
// `star=1` when this completion earned "+1 ngôi sao" (first completion of the artwork).
// Back (Android) goes to Home, never to the colouring screen.
// P6: interstitial check (F06) when leaving with "Tô tranh khác" / "Bộ sưu tập" / Android back
// (back = "Tô tranh khác", decided 18/11). Never on Chia sẻ.

export default function CompleteScreen() {
  const { workId, star } = useLocalSearchParams<{ workId: string; star?: string }>();
  const { t, language } = useSettings();
  const { works } = useWorks();
  const { requireParent } = useParentalGate();
  const feedback = useFeedback();
  const c = useTheme();
  const work = works[workId ?? ''];
  const final = useFinalImage(work);

  // "tada" + haptic once when the screen opens (F09), and the F07 event: artwork_complete
  // (coloring, time spent in buckets) or free_draw_save (S06 ✓ Lưu). S05 opens only from
  // S04 / S06 when the work was just completed / saved (router.replace).
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    played.current = true;
    feedback.complete();
    if (work?.kind === 'coloring' && work.artworkId) {
      monitoring.track({
        name: 'artwork_complete',
        params: { artwork_id: work.artworkId, duration_bucket: durationBucket(work.timeSpentMs) },
      });
    } else if (work?.kind === 'free') {
      monitoring.track({ name: 'free_draw_save' });
    }
  }, [feedback]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving S05 ends the colouring flow: interstitial if allowed, then the tab (F06).
  const leaving = useRef(false);
  const leave = useCallback((navigate: () => void) => {
    if (leaving.current) return;
    leaving.current = true;
    leaveColoringFlow(navigate);
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leave(() => goToTab('home'));
      return true;
    });
    return () => sub.remove();
  }, [leave]);

  const another = () => {
    feedback.tap();
    leave(() => goToTab('home'));
  };
  const gallery = () => {
    feedback.tap();
    leave(() => goToTab('gallery', { tab: 'done' }));
  };
  const share = async () => {
    if (!work || !(await requireParent('share'))) return;
    await shareWork(work.id, t('work.share'));
  };

  const free = work?.kind === 'free';
  const title = work ? workTitle(work, language, t) : '';
  const date = work ? formatDayMonth(work.completedAt ?? work.updatedAt) : '';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: c.mintSoft }]}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.inner}>
          <View style={styles.starRow}>
            {star === '1' && (
              <Animated.View entering={ZoomIn.delay(250).springify()} style={[styles.chip, { backgroundColor: c.surface }]}>
                <StarIcon size={18} color={c.star} />
                <Text style={[TYPE.bodyStrong, { color: c.text }]}>{t('complete.star')}</Text>
              </Animated.View>
            )}
          </View>

          <Text style={[TYPE.display, styles.title, { color: c.text }]} accessibilityRole="header">
            {t(free ? 'complete.titleFree' : 'complete.title')}
          </Text>

          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={[styles.card, { backgroundColor: c.surface, shadowColor: c.text }]}>
            <View style={[styles.picture, { backgroundColor: c.paper, borderColor: c.border }]}>
              {final.uri ? (
                <Image
                  key={final.version}
                  source={{ uri: final.uri }}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  cachePolicy="none"
                  accessibilityLabel={title}
                />
              ) : (
                <ActivityIndicator style={StyleSheet.absoluteFill} color={c.primary} />
              )}
            </View>
            <View style={styles.cardRow}>
              <Text style={[TYPE.bodyStrong, styles.flex, { color: c.text }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[TYPE.caption, { color: c.textMuted }]}>{date}</Text>
            </View>
          </Animated.View>

          <View style={styles.saved}>
            <Feather name="check" size={16} color={c.success} />
            <Text style={[TYPE.bodyStrong, { color: c.success }]}>{t('complete.saved')}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttons}>
        <PillButton label={t('complete.another')} onPress={another} />
        <View style={styles.row}>
          <PillButton label={t('complete.gallery')} variant="secondary" onPress={gallery} style={styles.flex} />
          <PillButton
            label={t('work.share')}
            accessibilityLabel={t('work.locked', { label: t('work.share') })}
            icon="lock"
            variant="secondary"
            onPress={share}
            style={styles.flex}
          />
        </View>
      </View>
      <Confetti />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: SPACE.xl, paddingTop: SPACE.md },
  inner: { width: '100%', maxWidth: 440, alignItems: 'center' },
  starRow: { minHeight: 40, justifyContent: 'center', marginBottom: SPACE.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs + 2,
    paddingHorizontal: SPACE.md + 2,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.pill,
  },
  title: { textAlign: 'center', fontSize: 28, lineHeight: 36, marginBottom: SPACE.xl },
  card: {
    width: '86%',
    padding: SPACE.md,
    borderRadius: RADIUS.lg,
    transform: [{ rotate: '-3deg' }],
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  picture: { aspectRatio: 1, borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md, paddingHorizontal: SPACE.xs },
  saved: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs + 2, marginTop: SPACE.xl, marginBottom: SPACE.lg },
  buttons: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: SPACE.xl, paddingBottom: SPACE.md, gap: SPACE.md },
  row: { flexDirection: 'row', gap: SPACE.md },
  flex: { flex: 1 },
});
