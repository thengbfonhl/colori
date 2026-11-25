import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { RADIUS, SPACE, TYPE, useTheme } from '../theme';

const SHOW_MS = 2200;

/** Small message at the bottom of a screen ("Đã lưu vào Ảnh", S08). */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const show = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), SHOW_MS);
  }, []);
  return { message, show };
}

export function Toast({ message, bottom }: { message: string | null; bottom: number }) {
  const c = useTheme();
  if (!message) return null;
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      style={[styles.toast, { backgroundColor: c.inverse, bottom }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Feather name="check-circle" size={18} color={c.onInverse} />
      <Text style={[TYPE.bodyStrong, { color: c.onInverse }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    borderRadius: RADIUS.pill,
  },
});
