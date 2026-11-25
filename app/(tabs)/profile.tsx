import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../src/components/avatars';
import { TabScreen } from '../../src/components/TabScreen';
import { AVATAR_IDS, AVATAR_NAME, type AvatarId } from '../../src/data/avatars';
import { useParentalGate } from '../../src/features/gate/ParentalGate';
import { useSettings } from '../../src/store/settings';
import { useWorks } from '../../src/store/works';
import { MIN_TOUCH, RADIUS, SPACE, TYPE, useTheme } from '../../src/theme';

// S09 – Cá nhân (design 14, v1 parts): profile card (avatar only, no name: A31), settings for
// the child (no gate), "Dành cho bố mẹ" (every row behind the parental gate, F05).
// Hidden in v1: badges (FEATURES.badges), background music (FEATURES.music), AI creation (D3).
// No ads on this screen.

export default function ProfileScreen() {
  const { t, avatar, ageBand, sound, noOverflow, language, setSound, setNoOverflow, setLanguage, setAvatar } = useSettings();
  const { works } = useWorks();
  const { requireParent } = useParentalGate();
  const c = useTheme();
  const [picking, setPicking] = useState(false);
  const done = useMemo(() => Object.values(works).filter((w) => w.status === 'done').length, [works]);
  const name = t('profile.name', { animal: t(AVATAR_NAME[avatar]) });

  const changeAge = async () => {
    if (await requireParent('settings')) router.push({ pathname: '/onboarding', params: { mode: 'change' } });
  };
  const changeLanguage = async () => {
    if (!(await requireParent('settings'))) return;
    Alert.alert(t('profile.language'), undefined, [
      { text: t('language.vi'), onPress: () => setLanguage('vi') },
      { text: t('language.en'), onPress: () => setLanguage('en') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };
  const openAbout = async () => {
    if (await requireParent('external')) router.push('/about');
  };

  return (
    <TabScreen title="tab.profile">
      <View style={[styles.profile, { backgroundColor: c.mintSoft }]}>
        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={t('profile.changeAvatar')}
          hitSlop={6}
        >
          <Avatar id={avatar} size={64} />
          <View style={[styles.editBadge, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Feather name="edit-2" size={12} color={c.text} />
          </View>
        </Pressable>
        <View style={styles.flex}>
          <Text style={[TYPE.title, { color: c.text }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[TYPE.caption, { color: c.textMuted }]}>{t(ageBand === 'easy' ? 'age.easy' : 'age.medium')}</Text>
        </View>
        <View style={styles.count} accessible accessibilityLabel={`${done} ${t('profile.pictures')}`}>
          <Text style={[TYPE.title, { color: c.text }]}>{done}</Text>
          <Text style={[TYPE.caption, { color: c.textMuted }]}>{t('profile.pictures')}</Text>
        </View>
      </View>

      <Text style={[TYPE.heading, styles.section, { color: c.text }]} accessibilityRole="header">
        {t('profile.kidSettings')}
      </Text>
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <SwitchRow label={t('profile.sound')} value={sound} onChange={setSound} />
        <View style={[styles.sep, { backgroundColor: c.border }]} />
        <SwitchRow label={t('profile.noOverflow')} value={noOverflow} onChange={setNoOverflow} />
      </View>

      <View style={styles.sectionRow}>
        <Feather name="lock" size={16} color={c.text} />
        <Text style={[TYPE.heading, { color: c.text }]} accessibilityRole="header">
          {t('profile.parents')}
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <LinkRow label={t('profile.age')} value={t(ageBand === 'easy' ? 'age.easy' : 'age.medium')} onPress={changeAge} />
        <View style={[styles.sep, { backgroundColor: c.border }]} />
        <LinkRow label={t('profile.language')} value={t(language === 'vi' ? 'language.vi' : 'language.en')} onPress={changeLanguage} />
        <View style={[styles.sep, { backgroundColor: c.border }]} />
        <LinkRow label={t('profile.about')} onPress={openAbout} />
      </View>

      <AvatarPicker
        visible={picking}
        current={avatar}
        onClose={() => setPicking(false)}
        onPick={(id) => {
          setAvatar(id);
          setPicking(false);
        }}
      />
    </TabScreen>
  );
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[TYPE.body, styles.flex, { color: c.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: c.success, false: c.switchOff }}
        thumbColor={c.paper}
        ios_backgroundColor={c.switchOff}
      />
    </View>
  );
}

function LinkRow({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  const { t } = useSettings();
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('work.locked', { label: value ? `${label}: ${value}` : label })}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text style={[TYPE.body, styles.flex, { color: c.text }]}>{label}</Text>
      {value && <Text style={[TYPE.body, { color: c.textMuted }]}>{value}</Text>}
      <Feather name="chevron-right" size={20} color={c.textMuted} />
    </Pressable>
  );
}

/** Choose one of the 6 animal avatars (child setting: no gate). */
function AvatarPicker({
  visible,
  current,
  onClose,
  onPick,
}: {
  visible: boolean;
  current: AvatarId;
  onClose: () => void;
  onPick: (id: AvatarId) => void;
}) {
  const { t } = useSettings();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]} onPress={onClose} accessibilityLabel={t('common.cancel')} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + SPACE.lg }]}>
          <View style={styles.sheetHead}>
            <Text style={[TYPE.title, styles.flex, { color: c.text }]} accessibilityRole="header">
              {t('profile.chooseAvatar')}
            </Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" style={styles.cancel}>
              <Text style={[TYPE.bodyStrong, { color: c.primary }]}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
          <View style={styles.avatarGrid}>
            {AVATAR_IDS.map((id) => (
              <Pressable
                key={id}
                onPress={() => onPick(id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: id === current }}
                accessibilityLabel={t(AVATAR_NAME[id])}
                style={({ pressed }) => [styles.avatarCell, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Avatar id={id} size={76} selected={id === current} />
                <Text style={[TYPE.bodyStrong, { color: c.text }]}>{t(AVATAR_NAME[id])}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderRadius: RADIUS.lg, padding: SPACE.lg, marginTop: SPACE.md },
  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { alignItems: 'center' },
  section: { marginTop: SPACE.xl, marginBottom: SPACE.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.xl, marginBottom: SPACE.md },
  card: { borderRadius: RADIUS.lg, paddingHorizontal: SPACE.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: MIN_TOUCH + 8 },
  sep: { height: StyleSheet.hairlineWidth },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 560, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACE.xl },
  sheetHead: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACE.lg },
  cancel: { minHeight: MIN_TOUCH, justifyContent: 'center' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: SPACE.lg },
  avatarCell: { width: '33.33%', alignItems: 'center', gap: SPACE.xs },
});
