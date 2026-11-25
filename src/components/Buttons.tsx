import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { MIN_TOUCH, RADIUS, SPACE, TYPE, useTheme } from '../theme';

type Icon = keyof typeof Feather.glyphMap;

/**
 * Big pill buttons of S05 / S08 (design 07, 13).
 * - primary: terracotta ("Tô tranh khác", "Tiếp tục chỉnh sửa");
 * - secondary: white card ("Bộ sưu tập", "🔒 Chia sẻ").
 */
export function PillButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: Icon;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const primary = variant === 'primary';
  const fg = primary ? c.onPrimary : c.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.pill,
        primary ? { backgroundColor: c.primary } : { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 },
        { opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {icon && <Feather name={icon} size={17} color={fg} />}
      <Text style={[TYPE.button, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Square action of S08 (design 13): icon above a small label. */
export function ActionTile({
  label,
  icon,
  onPress,
  danger,
  locked,
  accessibilityLabel,
}: {
  label: string;
  icon: Icon;
  onPress: () => void;
  danger?: boolean;
  /** Small lock badge: the action goes through the parental gate. */
  locked?: boolean;
  accessibilityLabel?: string;
}) {
  const c = useTheme();
  const fg = danger ? c.danger : c.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.tile, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <Feather name={icon} size={20} color={fg} />
      <Text style={[TYPE.caption, styles.tileText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {locked && <Feather name="lock" size={11} color={c.textMuted} style={styles.lock} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: MIN_TOUCH + 4,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.sm,
  },
  tile: {
    flex: 1,
    minHeight: 68,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.xs,
  },
  tileText: { fontFamily: TYPE.bodyStrong.fontFamily },
  lock: { position: 'absolute', top: 8, right: 8 },
});
