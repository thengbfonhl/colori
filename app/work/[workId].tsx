import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionTile, PillButton } from '../../src/components/Buttons';
import { Toast, useToast } from '../../src/components/Toast';
import { useFeedback } from '../../src/features/feedback/feedback';
import { useParentalGate } from '../../src/features/gate/ParentalGate';
import { saveWorkToPhotos, shareWork } from '../../src/features/works/workActions';
import { useFinalImage } from '../../src/features/works/workImage';
import { workTitle } from '../../src/features/works/WorkThumb';
import { formatDate, formatDurationLong } from '../../src/lib/format';
import { useSettings } from '../../src/store/settings';
import { deleteWorkFiles } from '../../src/store/workFiles';
import { useWorks } from '../../src/store/works';
import type { Work } from '../../src/store/worksReducer';
import { MIN_TOUCH, RADIUS, SPACE, TYPE, useTheme } from '../../src/theme';

// S08 – Chi tiết tranh (design 13, without "Adult Mode" and "In (PDF)"): favourite,
// "Tiếp tục chỉnh sửa", Chia sẻ + Lưu vào Ảnh (both behind the parental gate), Xoá (confirm
// dialog only, A30). No ads on this screen.

export default function WorkDetailScreen() {
  const { workId } = useLocalSearchParams<{ workId: string }>();
  const { t } = useSettings();
  const { works } = useWorks();
  const c = useTheme();
  const work = works[workId ?? ''];
  const deleting = useRef(false);

  if (!work) {
    return (
      <SafeAreaView style={[styles.root, styles.center, { backgroundColor: c.bg }]}>
        {!deleting.current && (
          <>
            <Text style={[TYPE.body, { color: c.textMuted }]}>{t('work.notFound')}</Text>
            <PillButton label={t('work.back')} variant="secondary" onPress={() => router.back()} />
          </>
        )}
      </SafeAreaView>
    );
  }
  return <WorkDetail work={work} deleting={deleting} />;
}

function WorkDetail({ work, deleting }: { work: Work; deleting: React.MutableRefObject<boolean> }) {
  const { t, language } = useSettings();
  const { dispatch } = useWorks();
  const { requireParent } = useParentalGate();
  const feedback = useFeedback();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const final = useFinalImage(work);
  const toast = useToast();
  const title = workTitle(work, language, t);

  const time = formatDurationLong(work.timeSpentMs, language);
  const line =
    work.status === 'done'
      ? t('work.doneLine', { date: formatDate(work.completedAt ?? work.updatedAt), time })
      : work.kind === 'free'
        ? t('work.drawingLine', { time })
        : t('work.progressLine', { p: Math.round(work.progress * 100), time });

  const toggleFavorite = () => dispatch({ type: 'setFavorite', workId: work.id, favorite: !work.favorite });

  const keepEditing = () => {
    feedback.tap();
    if (work.kind === 'coloring' && work.artworkId) router.push({ pathname: '/color/[artworkId]', params: { artworkId: work.artworkId } });
    else router.push({ pathname: '/draw/[workId]', params: { workId: work.id } });
  };

  const share = async () => {
    if (!final.uri || !(await requireParent('share'))) return;
    const r = await shareWork(work.id, t('work.share'));
    if (r === 'unavailable') Alert.alert(t('work.shareError'));
  };

  const saveToPhotos = async () => {
    if (!final.uri || !(await requireParent('saveImage'))) return;
    const r = await saveWorkToPhotos(work.id);
    if (r === 'saved') toast.show(t('work.savedToPhotos'));
    else if (r === 'denied')
      Alert.alert(t('work.permissionTitle'), t('work.permissionBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('work.openSettings'),
          // Opening the device Settings leaves the app: parental gate too (F05).
          onPress: async () => {
            if (await requireParent('systemSettings')) Linking.openSettings().catch(() => {});
          },
        },
      ]);
    else Alert.alert(t('work.saveError'));
  };

  const remove = () =>
    Alert.alert(t('work.deleteTitle'), t('work.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('work.delete'),
        style: 'destructive',
        onPress: () => {
          deleting.current = true;
          router.back();
          dispatch({ type: 'delete', workId: work.id });
          deleteWorkFiles(work.id);
        },
      },
    ]);

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <CircleButton icon="chevron-left" label={t('work.back')} onPress={() => router.back()} />
        <CircleButton
          icon="heart"
          label={t(work.favorite ? 'work.unfavorite' : 'work.favorite')}
          active={work.favorite}
          onPress={toggleFavorite}
        />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.xl }]}>
        <View style={styles.inner}>
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <View style={[styles.picture, { backgroundColor: c.paper }]}>
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
          </View>

          <Text style={[TYPE.title, styles.title, { color: c.text }]} accessibilityRole="header">
            {title}
          </Text>
          <Text style={[TYPE.caption, { color: c.textMuted }]}>{line}</Text>

          <PillButton label={t('work.continue')} onPress={keepEditing} style={styles.continue} />
          <View style={styles.actions}>
            <ActionTile
              label={t('work.share')}
              accessibilityLabel={t('work.locked', { label: t('work.share') })}
              icon="share"
              locked
              onPress={share}
            />
            <ActionTile
              label={t('work.saveToPhotos')}
              accessibilityLabel={t('work.locked', { label: t('work.saveToPhotos') })}
              icon="download"
              locked
              onPress={saveToPhotos}
            />
            <ActionTile label={t('work.delete')} icon="trash-2" danger onPress={remove} />
          </View>
        </View>
      </ScrollView>
      <Toast message={toast.message} bottom={insets.bottom + SPACE.xl} />
    </SafeAreaView>
  );
}

function CircleButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={active === undefined ? undefined : { selected: active }}
      style={({ pressed }) => [styles.circle, { backgroundColor: active ? c.primary : c.surface, opacity: pressed ? 0.7 : 1 }]}
    >
      <Feather name={icon} size={20} color={active ? c.onPrimary : c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: SPACE.lg, padding: SPACE.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm },
  circle: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', paddingHorizontal: SPACE.lg },
  inner: { width: '100%', maxWidth: 560 },
  card: { borderRadius: RADIUS.lg, padding: SPACE.md },
  picture: { aspectRatio: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  title: { marginTop: SPACE.lg },
  continue: { marginTop: SPACE.lg },
  actions: { flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md },
});
