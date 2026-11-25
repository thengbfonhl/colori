import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { gridColumns } from '../../src/components/TabScreen';
import { ARTWORKS, categoryIcon, getArtworkAssets } from '../../src/data/catalog';
import { CATEGORIES } from '../../src/data/categories';
import type { Artwork } from '../../src/data/types';
import { categoryArtworks } from '../../src/features/home/picks';
import { WorkThumb } from '../../src/features/works/WorkThumb';
import { useSettings } from '../../src/store/settings';
import { useWorks } from '../../src/store/works';
import type { Work } from '../../src/store/worksReducer';
import { MIN_TOUCH, RADIUS, SPACE, TYPE, useTheme } from '../../src/theme';

// S03 – pictures of one topic (no design yet: built in the style of 04 / 12). All pictures of
// the topic, the child's age group first (A34). A picture with a Work shows its coloured
// thumbnail and progress; tapping opens S04 in its saved state (also when finished).
// No locked pictures in v1 (Families: no rewarded ads). No ads on this screen.

const MAX_WIDTH = 900;
const SIDE = SPACE.lg;

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, ageBand } = useSettings();
  const { works } = useWorks();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const category = CATEGORIES.find((x) => x.id === id);
  const list = useMemo(() => (category ? categoryArtworks(ARTWORKS, category.id, ageBand) : []), [category, ageBand]);

  const cols = gridColumns(width);
  const inner = Math.min(width, MAX_WIDTH) - SIDE * 2;
  const cellWidth = Math.floor((inner - SPACE.md * (cols - 1)) / cols);
  const icon = category ? categoryIcon(category.id) : null;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { maxWidth: MAX_WIDTH }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [styles.back, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="chevron-left" size={22} color={c.text} />
        </Pressable>
        {category && (
          <View style={[styles.titleChip, { backgroundColor: c[category.color] }]}>
            <View style={[styles.icon, { backgroundColor: c.paper }]}>
              {icon && <Image source={getArtworkAssets(icon.id)?.thumb} style={StyleSheet.absoluteFill} contentFit="contain" />}
            </View>
            <View style={styles.flex}>
              <Text style={[TYPE.title, { color: c.text }]} numberOfLines={1} accessibilityRole="header">
                {t(category.title)}
              </Text>
              <Text style={[TYPE.caption, { color: c.textMuted }]}>{t('category.count', { n: list.length })}</Text>
            </View>
          </View>
        )}
      </View>

      <FlatList
        key={cols} // numColumns cannot change on the fly
        data={list}
        numColumns={cols}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <ArtworkCell artwork={item} work={works[item.id]} width={cellWidth} />}
        columnWrapperStyle={cols > 1 ? styles.row : undefined}
        contentContainerStyle={[styles.list, { width: inner + SIDE * 2, paddingBottom: insets.bottom + SPACE.xl }]}
        style={styles.listOuter}
        ListEmptyComponent={<Text style={[TYPE.body, styles.empty, { color: c.textMuted }]}>{t('category.empty')}</Text>}
        initialNumToRender={8}
        windowSize={7}
      />
    </SafeAreaView>
  );
}

function ArtworkCell({ artwork, work, width }: { artwork: Artwork; work: Work | undefined; width: number }) {
  const { t, language } = useSettings();
  const c = useTheme();
  const title = artwork.title[language];
  const pct = work ? Math.round(work.progress * 100) : 0;
  const done = work?.status === 'done';
  const status = done ? t('artwork.done') : work ? t('artwork.inProgress', { p: pct }) : t(artwork.level === 'easy' ? 'age.easy' : 'age.medium');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/color/[artworkId]', params: { artworkId: artwork.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${status}`}
      style={({ pressed }) => [styles.cell, { width, backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
    >
      <View>
        {work ? (
          <WorkThumb work={work} />
        ) : (
          <View style={[styles.thumb, { backgroundColor: c.paper, borderColor: c.border }]}>
            <Image source={getArtworkAssets(artwork.id)?.thumb} style={StyleSheet.absoluteFill} contentFit="contain" />
          </View>
        )}
        {done && (
          <View style={[styles.check, { backgroundColor: c.inverse }]}>
            <Feather name="check" size={14} color={c.onInverse} />
          </View>
        )}
      </View>
      <Text style={[TYPE.bodyStrong, styles.cellTitle, { color: c.text }]} numberOfLines={1}>
        {title}
      </Text>
      {work && !done ? (
        <View style={styles.progressRow}>
          <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
            <View style={[styles.fill, { backgroundColor: c.green, width: `${pct}%` }]} />
          </View>
          <Text style={[TYPE.caption, { color: c.textMuted, fontSize: 12 }]}>{pct}%</Text>
        </View>
      ) : (
        <Text style={[TYPE.caption, { color: c.textMuted }]} numberOfLines={1}>
          {status}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.md,
    paddingHorizontal: SIDE,
    paddingTop: SPACE.sm,
    paddingBottom: SPACE.md,
  },
  back: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
  titleChip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderRadius: RADIUS.lg, padding: SPACE.sm },
  icon: { width: 44, height: 44, borderRadius: RADIUS.sm, overflow: 'hidden' },
  listOuter: { flex: 1 },
  list: { alignSelf: 'center', paddingHorizontal: SIDE, paddingTop: SPACE.xs, gap: SPACE.md },
  row: { gap: SPACE.md },
  cell: { borderRadius: RADIUS.lg, padding: SPACE.sm },
  thumb: { aspectRatio: 1, borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  check: { position: 'absolute', top: SPACE.sm, right: SPACE.sm, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cellTitle: { marginTop: SPACE.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.xs },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  empty: { textAlign: 'center', marginTop: SPACE.xl },
});
