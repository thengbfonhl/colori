import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { PillButton } from '../../src/components/Buttons';
import { gridColumns, TabScreen, useContentWidth } from '../../src/components/TabScreen';
import { FEATURES } from '../../src/config';
import { galleryList, galleryStats, type GalleryTab } from '../../src/features/works/gallery';
import { WorkThumb, workTitle } from '../../src/features/works/WorkThumb';
import type { MessageKey } from '../../src/i18n';
import { formatDayMonth, formatDuration } from '../../src/lib/format';
import { useSettings } from '../../src/store/settings';
import { useWorks } from '../../src/store/works';
import type { Work } from '../../src/store/worksReducer';
import { RADIUS, SPACE, TYPE, useTheme } from '../../src/theme';

// S07 – Bộ sưu tập (design 12): stats (Q20 → A29), 3 tabs, grid of colouring works and free
// drawings, empty states. Tapping a picture opens S08. Updates by itself from WorksContext.

const TABS: { key: GalleryTab; label: MessageKey; empty: MessageKey; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'done', label: 'gallery.tabDone', empty: 'gallery.emptyDone', icon: 'award' },
  { key: 'progress', label: 'gallery.tabProgress', empty: 'gallery.emptyProgress', icon: 'edit-2' },
  { key: 'favorite', label: 'gallery.tabFavorite', empty: 'gallery.emptyFavorite', icon: 'heart' },
];

const isTab = (v: unknown): v is GalleryTab => v === 'done' || v === 'progress' || v === 'favorite';

export default function GalleryScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const { t, language } = useSettings();
  const { works, activeDays } = useWorks();
  const c = useTheme();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<GalleryTab>(isTab(params.tab) ? params.tab : 'done');

  // "Bộ sưu tập" from S05 opens the "Đã hoàn thành" tab.
  useEffect(() => {
    if (isTab(params.tab)) setTab(params.tab);
  }, [params.tab]);

  const list = useMemo(() => galleryList(works, tab), [works, tab]);
  const stats = useMemo(() => galleryStats(works, activeDays, Date.now()), [works, activeDays]);
  const contentWidth = useContentWidth();
  const cols = gridColumns(width);
  const cellWidth = Math.floor((contentWidth - SPACE.md * (cols - 1)) / cols);
  const current = TABS.find((x) => x.key === tab) ?? TABS[0];

  return (
    <TabScreen title="tab.gallery">
      <View style={[styles.stats, { backgroundColor: c.surface }]}>
        <Stat value={String(stats.done)} label={t('gallery.statDone')} />
        {FEATURES.galleryStats && (
          <>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <Stat value={formatDuration(stats.timeMs, language)} label={t('gallery.statTime')} />
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <Stat value={stats.streak === 1 ? t('gallery.daysOne') : t('gallery.days', { n: stats.streak })} label={t('gallery.statStreak')} />
          </>
        )}
      </View>

      <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]} accessibilityRole="tablist">
        {TABS.map((x) => {
          const active = x.key === tab;
          return (
            <Pressable
              key={x.key}
              onPress={() => setTab(x.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.segmentItem, active && [styles.segmentActive, { backgroundColor: c.surface, shadowColor: c.text }]]}
            >
              <Text style={[TYPE.bodyStrong, styles.segmentText, { color: active ? c.text : c.textMuted }]} numberOfLines={2}>
                {t(x.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {list.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: c.surface }]}>
          <View style={[styles.emptyArt, { backgroundColor: c.yellowSoft }]}>
            <Feather name={current.icon} size={36} color={c.peach} />
          </View>
          <Text style={[TYPE.body, styles.emptyText, { color: c.textMuted }]}>{t(current.empty)}</Text>
          <PillButton label={t('gallery.goHome')} onPress={() => router.navigate('/')} style={styles.emptyButton} />
        </View>
      ) : (
        <View style={styles.grid}>
          {list.map((w) => (
            <GalleryCell key={w.id} work={w} width={cellWidth} title={workTitle(w, language, t)} />
          ))}
        </View>
      )}
    </TabScreen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const c = useTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={[TYPE.heading, styles.statValue, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[TYPE.caption, styles.statLabel, { color: c.textMuted }]} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function GalleryCell({ work, width, title }: { work: Work; width: number; title: string }) {
  const { t } = useSettings();
  const c = useTheme();
  const sub =
    work.status === 'done'
      ? t('gallery.doneOn', { date: formatDayMonth(work.completedAt ?? work.updatedAt) })
      : work.kind === 'free'
        ? t('draw.status')
        : t('artwork.inProgress', { p: Math.round(work.progress * 100) });
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/work/[workId]', params: { workId: work.id } })}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${sub}`}
    >
      <WorkThumb work={work} style={styles.thumb} />
      <View style={styles.cellText}>
        <Text style={[TYPE.bodyStrong, styles.flex, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>
        {work.favorite && <Feather name="heart" size={14} color={c.primary} />}
      </View>
      <Text style={[TYPE.caption, { color: c.textMuted }]} numberOfLines={1}>
        {sub}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, paddingVertical: SPACE.md, marginTop: SPACE.md },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: SPACE.xs },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 11, lineHeight: 14, textAlign: 'center' },
  divider: { width: 1, alignSelf: 'stretch' },
  segment: { flexDirection: 'row', borderRadius: RADIUS.pill, padding: SPACE.xs, marginTop: SPACE.lg, marginBottom: SPACE.lg },
  segmentItem: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.pill, paddingHorizontal: SPACE.xs },
  segmentActive: { shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 13, lineHeight: 17, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, rowGap: SPACE.lg },
  thumb: { marginBottom: SPACE.sm },
  cellText: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs },
  flex: { flex: 1 },
  empty: { alignItems: 'center', padding: SPACE.xl, borderRadius: RADIUS.lg, gap: SPACE.md },
  emptyArt: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center' },
  emptyButton: { alignSelf: 'stretch' },
});
