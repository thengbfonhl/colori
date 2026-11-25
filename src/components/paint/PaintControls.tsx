import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MessageKey } from '../../i18n';
import { useSettings } from '../../store/settings';
import { MIN_TOUCH, RADIUS, SPACE, TYPE, useTheme } from '../../theme';

// Buttons shared by the colouring screen (S04) and free drawing (S06), design 06.

export function RoundButton({
  icon,
  label,
  onPress,
  disabled,
  primary,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const c = useTheme();
  const bg = primary && !disabled ? c.primary : c.surface;
  const fg = primary && !disabled ? c.onPrimary : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.round, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}
    >
      <Feather name={icon} size={20} color={fg} />
    </Pressable>
  );
}

export function ToolButton({
  label,
  icon,
  onPress,
  active,
  disabled,
}: {
  label: MessageKey;
  icon: (color: string) => React.ReactNode;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const { t } = useSettings();
  const c = useTheme();
  const fg = active ? c.onInverse : c.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t(label)}
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => [styles.tool, { backgroundColor: active ? c.inverse : c.bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}
    >
      {icon(fg)}
      <Text style={[TYPE.tab, { color: fg, fontSize: 12 }]} numberOfLines={1}>
        {t(label)}
      </Text>
    </Pressable>
  );
}

/** "Xem tranh" mode: tools and palette are hidden, one button brings them back (S04). */
export function ViewingBar({ bottomInset, onPress }: { bottomInset: number; onPress: () => void }) {
  const { t } = useSettings();
  const c = useTheme();
  return (
    <View style={[styles.viewingBar, { paddingBottom: bottomInset + SPACE.md }]}>
      <Pressable
        onPress={onPress}
        style={[styles.viewingButton, { backgroundColor: c.inverse }]}
        accessibilityRole="button"
        accessibilityLabel={t('tool.view')}
      >
        <Feather name="eye-off" size={20} color={c.onInverse} />
        <Text style={[TYPE.bodyStrong, { color: c.onInverse }]}>{t('tool.view')}</Text>
      </Pressable>
    </View>
  );
}

export const paintStyles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm },
  titleBox: { flex: 1, alignItems: 'center' },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACE.md,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560, // tablet: tools are not stretched (S04)
  },
  tools: { flexDirection: 'row', gap: SPACE.sm, paddingHorizontal: SPACE.lg, marginBottom: SPACE.sm },
});

const styles = StyleSheet.create({
  round: { width: MIN_TOUCH - 4, height: MIN_TOUCH - 4, borderRadius: RADIUS.pill, alignItems: 'center', justifyContent: 'center' },
  tool: { flex: 1, minHeight: 60, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', gap: 4 },
  viewingBar: { alignItems: 'center', paddingTop: SPACE.md },
  viewingButton: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, paddingHorizontal: SPACE.xl, height: MIN_TOUCH, borderRadius: RADIUS.pill },
});
