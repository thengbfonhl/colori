import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Avatar } from '../../src/components/avatars';
import { StarIcon } from '../../src/components/icons';
import { PencilMascot } from '../../src/components/illustrations';
import { TabScreen, useContentWidth } from '../../src/components/TabScreen';
import { ARTWORKS, artworksIn, categoryIcon, getArtwork, getArtworkAssets } from '../../src/data/catalog';
import { CATEGORIES, type Category } from '../../src/data/categories';
import { continueWorks, dailyArtwork } from '../../src/features/home/picks';
import { WorkThumb } from '../../src/features/works/WorkThumb';
import { useSettings } from '../../src/store/settings';
import { useWorks } from '../../src/store/works';
import type { Work } from '../../src/store/worksReducer';
import { MIN_TOUCH, RADIUS, SPACE, TYPE, useTheme } from '../../src/theme';

// S02 – Home / Khám phá (design 04, v1 blocks only): header with stars + avatar, picture of
// the day, "Tiếp tục tô màu", topics. "Tranh mới hôm nay" comes later (A16), "Thế giới khám
// phá" is v1.1 (FEATURES.worlds). No ads on this screen.

const exists = (id: string) => getArtwork(id) !== undefined;

export default function HomeScreen() {
  const { t, language, ageBand, avatar } = useSettings();
  const { works, stars } = useWorks();
  const c = useTheme();
  const { width } = useWindowDimensions();
  const contentWidth = useContentWidth();

  // Changes at local midnight; recomputed whenever the screen renders.
  const daily = dailyArtwork(ARTWORKS, ageBand, Date.now());
  const continuing = useMemo(() => continueWorks(works, exists), [works]);
  const categories = useMemo(() => CATEGORIES.filter((cat) => artworksIn(cat.id).length > 0), []);
  const cols = width >= 600 ? 4 : 2;
  const catWidth = Math.floor((contentWidth - SPACE.md * (cols - 1)) / cols);

  const header = (
    <View style={styles.header}>
      <View style={styles.flex}>
        <Text style={[TYPE.caption, { color: c.textMuted }]}>{t('home.hello')}</Text>
        <Text style={[TYPE.title, { color: c.text }]} accessibilityRole="header">
          {t('home.title')}
        </Text>
      </View>
      <View style={[styles.stars, { backgroundColor: c.surface }]} accessible accessibilityLabel={t('home.stars', { n: stars })}>
        <StarIcon size={16} color={c.star} />
        <Text style={[TYPE.bodyStrong, { color: c.text }]}>{stars}</Text>
      </View>
      <Pressable onPress={() => router.navigate('/profile')} accessibilityRole="button" accessibilityLabel={t('home.profile')} hitSlop={6}>
        <Avatar id={avatar} size={44} />
      </Pressable>
    </View>
  );

  return (
    <TabScreen header={header}>
      {daily && (
        <View style={[styles.daily, { backgroundColor: c.mintSoft }]}>
          <PencilMascot height={84} />
          <View style={styles.dailyText}>
            <Text style={[TYPE.bodyStrong, { color: c.text }]}>{t('home.daily')}</Text>
            <Text style={[TYPE.heading, { color: c.text }]} numberOfLines={2}>
              {daily.title[language]}
            </Text>
            <Pressable
              onPress={() => router.push({ pathname: '/color/[artworkId]', params: { artworkId: daily.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${t('home.colorNow')}: ${daily.title[language]}`}
              style={({ pressed }) => [styles.colorNow, { backgroundColor: c.primary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="play" size={14} color={c.onPrimary} />
              <Text style={[TYPE.button, { color: c.onPrimary, fontSize: 15 }]}>{t('home.colorNow')}</Text>
            </Pressable>
          </View>
          <View style={[styles.dailyThumb, { backgroundColor: c.paper, borderColor: c.border }]}>
            <Image source={getArtworkAssets(daily.id)?.thumb} style={StyleSheet.absoluteFill} contentFit="contain" />
          </View>
        </View>
      )}

      {continuing.length > 0 && (
        <>
          <SectionTitle title={t('home.continue')} action={t('home.seeAll')} onAction={() => router.navigate({ pathname: '/gallery', params: { tab: 'progress' } })} />
          <FlatList
            horizontal
            data={continuing}
            keyExtractor={(w) => w.id}
            renderItem={({ item }) => <ContinueCard work={item} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.continueList}
            style={styles.continueOuter}
          />
        </>
      )}

      <SectionTitle title={t('home.categories')} />
      <View style={styles.grid}>
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} width={catWidth} />
        ))}
      </View>
    </TabScreen>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const c = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[TYPE.heading, styles.flex, { color: c.text }]} accessibilityRole="header">
        {title}
      </Text>
      {action && (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" style={styles.sectionAction}>
          <Text style={[TYPE.bodyStrong, { color: c.primary, fontSize: 14 }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

function ContinueCard({ work }: { work: Work }) {
  const { language } = useSettings();
  const c = useTheme();
  const art = getArtwork(work.artworkId ?? '');
  const pct = Math.round(work.progress * 100);
  const title = art?.title[language] ?? '';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/color/[artworkId]', params: { artworkId: work.artworkId ?? '' } })}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${pct}%`}
      style={({ pressed }) => [styles.continueCard, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
    >
      <WorkThumb work={work} />
      <Text style={[TYPE.bodyStrong, styles.continueTitle, { color: c.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.progressRow}>
        <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
          <View style={[styles.fill, { backgroundColor: c.green, width: `${pct}%` }]} />
        </View>
        <Text style={[TYPE.caption, { color: c.textMuted, fontSize: 12 }]}>{pct}%</Text>
      </View>
    </Pressable>
  );
}

function CategoryCard({ category, width }: { category: Category; width: number }) {
  const { t } = useSettings();
  const c = useTheme();
  const icon = categoryIcon(category.id);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/category/[id]', params: { id: category.id } })}
      accessibilityRole="button"
      accessibilityLabel={t(category.title)}
      style={({ pressed }) => [styles.catCard, { width, backgroundColor: c[category.color], opacity: pressed ? 0.75 : 1 }]}
    >
      <View style={[styles.catIcon, { backgroundColor: c.paper }]}>
        {icon && <Image source={getArtworkAssets(icon.id)?.thumb} style={StyleSheet.absoluteFill} contentFit="contain" />}
      </View>
      <Text style={[TYPE.bodyStrong, styles.flex, { color: c.text }]} numberOfLines={2}>
        {t(category.title)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  stars: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, paddingHorizontal: SPACE.md, height: 36, borderRadius: RADIUS.pill },
  daily: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderRadius: RADIUS.lg, padding: SPACE.md, marginTop: SPACE.lg },
  dailyText: { flex: 1, gap: 2 },
  dailyThumb: { width: 64, height: 64, borderRadius: RADIUS.sm, borderWidth: 1, overflow: 'hidden' },
  colorNow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACE.xs + 2,
    minHeight: 40,
    paddingHorizontal: SPACE.lg,
    borderRadius: RADIUS.pill,
    marginTop: SPACE.sm,
  },
  section: { flexDirection: 'row', alignItems: 'center', marginTop: SPACE.xl, marginBottom: SPACE.md },
  sectionAction: { minHeight: MIN_TOUCH - 16, justifyContent: 'center' },
  continueOuter: { marginHorizontal: -SPACE.lg - SPACE.xs },
  continueList: { gap: SPACE.md, paddingHorizontal: SPACE.lg + SPACE.xs },
  continueCard: { width: 150, borderRadius: RADIUS.lg, padding: SPACE.sm },
  continueTitle: { marginTop: SPACE.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.xs },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md },
  catCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 76, borderRadius: RADIUS.lg, padding: SPACE.md },
  catIcon: { width: 48, height: 48, borderRadius: RADIUS.sm, overflow: 'hidden' },
});
