import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TabScreen } from '../../src/components/TabScreen';
import { formatDayMonth } from '../../src/lib/format';
import { useSettings } from '../../src/store/settings';
import { WorkThumb } from '../../src/features/works/WorkThumb';
import { useWorks } from '../../src/store/works';
import { freeWorks, newFreeWorkId, type Work } from '../../src/store/worksReducer';
import { RADIUS, SPACE, TYPE, useTheme } from '../../src/theme';

// S06 – "Vẽ tự do" tab: a big "Vẽ tranh mới" card + the child's drawings, newest first.
// Tapping a drawing opens the picture detail S08 (A24); "Tiếp tục chỉnh sửa" there opens the canvas.

export default function DrawTab() {
  const { t } = useSettings();
  const { works } = useWorks();
  const c = useTheme();
  const drawings = useMemo(() => freeWorks(works), [works]);

  return (
    <TabScreen title="tab.draw">
      <Pressable
        onPress={() => router.push(`/draw/${newFreeWorkId(Date.now())}`)}
        style={({ pressed }) => [styles.newCard, { backgroundColor: c.blueSoft, opacity: pressed ? 0.8 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={t('draw.new')}
      >
        <View style={[styles.newIcon, { backgroundColor: c.surface }]}>
          <Feather name="edit-3" size={30} color={c.primary} />
        </View>
        <View style={styles.newText}>
          <Text style={[TYPE.title, { color: c.text }]}>{t('draw.new')}</Text>
          <Text style={[TYPE.body, { color: c.textMuted }]}>{t('draw.newBody')}</Text>
        </View>
        <Feather name="plus-circle" size={28} color={c.primary} />
      </Pressable>

      <Text style={[TYPE.heading, styles.section, { color: c.text }]} accessibilityRole="header">
        {t('draw.mine')}
      </Text>

      {drawings.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: c.surface }]}>
          <View style={[styles.emptyArt, { backgroundColor: c.yellowSoft }]}>
            <Feather name="image" size={36} color={c.peach} />
            <View style={[styles.emptyBrush, { backgroundColor: c.surface }]}>
              <Feather name="edit-2" size={18} color={c.primary} />
            </View>
          </View>
          <Text style={[TYPE.body, styles.emptyText, { color: c.textMuted }]}>{t('draw.empty')}</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {drawings.map((w) => (
            <DrawingCell key={w.id} work={w} />
          ))}
        </View>
      )}
    </TabScreen>
  );
}

function DrawingCell({ work }: { work: Work }) {
  const { t } = useSettings();
  const c = useTheme();
  const title = t('draw.title', { date: formatDayMonth(work.createdAt) });
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/work/[workId]', params: { workId: work.id } })}
      style={({ pressed }) => [styles.cell, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <WorkThumb work={work} style={styles.thumb} />
      <Text style={[TYPE.bodyStrong, { color: c.text }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[TYPE.caption, { color: c.textMuted }]}>{work.status === 'done' ? t('artwork.done') : t('draw.status')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  newCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg, marginTop: SPACE.md },
  newIcon: { width: 64, height: 64, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  newText: { flex: 1, gap: 2 },
  section: { marginTop: SPACE.xl, marginBottom: SPACE.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md },
  cell: { width: '47%', flexGrow: 1, maxWidth: 260, borderRadius: RADIUS.lg, padding: SPACE.sm, gap: 2 },
  thumb: { marginBottom: SPACE.xs },
  empty: { alignItems: 'center', padding: SPACE.xl, borderRadius: RADIUS.lg, gap: SPACE.md },
  emptyArt: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  emptyBrush: { position: 'absolute', right: 4, bottom: 4, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center' },
});
