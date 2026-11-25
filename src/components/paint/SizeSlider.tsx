import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { fractionOf, stepValue, valueAt, type Range } from '../../lib/slider';
import { RADIUS, SPACE, useTheme } from '../../theme';

const THUMB = 28;
const TRACK = 6;
/** Largest preview dot (pt), so a big eraser does not push the layout around. */
const PREVIEW_MAX = 40;

type Props = {
  /** Width in picture px. */
  value: number;
  range: Range;
  onChange: (value: number) => void;
  /** Picture px → screen pt at zoom 1, for the preview dot. */
  previewScale: number;
  /** Ink colour of the preview dot; null = eraser (white dot with an outline). */
  color: string | null;
  label: string;
  /** Keeps the row's space but shows nothing (fill tool), so the canvas never changes size. */
  hidden?: boolean;
};

/**
 * Brush / eraser size (A26): a preview dot showing the line width + a slider. Built with the
 * gesture handler already in the app (no slider library). Drag or tap anywhere on the track.
 */
export function SizeSlider({ value, range, onChange, previewScale, color, label, hidden }: Props) {
  const c = useTheme();
  const [width, setWidth] = useState(0);
  // Local value while dragging; the screen only gets the final one (no re-render per move).
  const [dragValue, setDragValue] = useState<number | null>(null);
  const shown = dragValue ?? value;
  const latest = useRef({ width, range, onChange });
  latest.current = { width, range, onChange };

  useEffect(() => setDragValue(null), [value]);

  const gesture = useMemo(() => {
    const at = (x: number) => {
      const { width: w, range: r } = latest.current;
      return valueAt(w > THUMB ? (x - THUMB / 2) / (w - THUMB) : 0, r);
    };
    return Gesture.Pan()
      .runOnJS(true)
      .minDistance(0)
      .onBegin((e) => setDragValue(at(e.x)))
      .onUpdate((e) => setDragValue(at(e.x)))
      .onFinalize((e) => {
        const v = at(e.x);
        setDragValue(v);
        latest.current.onChange(v);
      });
  }, []);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const left = fractionOf(shown, range) * Math.max(0, width - THUMB);
  const dot = Math.max(4, Math.min(PREVIEW_MAX, shown * previewScale));
  const ink = color ?? c.paper;

  if (hidden) return <View style={styles.row} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden />;

  return (
    <View style={styles.row}>
      <View style={styles.preview}>
        <View
          style={{
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: ink,
            borderWidth: color === null || ink.toUpperCase() === c.paper.toUpperCase() ? 1.5 : 0,
            borderColor: c.textMuted,
          }}
        />
      </View>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.trackBox}
          onLayout={onLayout}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: range.min, max: range.max, now: shown }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => onChange(stepValue(value, range, e.nativeEvent.actionName === 'increment' ? 1 : -1))}
        >
          <View style={[styles.track, { backgroundColor: c.surfaceAlt }]} />
          <View style={[styles.fill, { backgroundColor: c.primary, width: left + THUMB / 2 }]} />
          <View style={[styles.thumb, { left, backgroundColor: c.surface, borderColor: c.primary }]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.lg, marginBottom: SPACE.xs, minHeight: 44 },
  preview: { width: PREVIEW_MAX + 4, height: PREVIEW_MAX + 4, alignItems: 'center', justifyContent: 'center' },
  trackBox: { flex: 1, height: 44, justifyContent: 'center' },
  track: { position: 'absolute', left: 0, right: 0, height: TRACK, borderRadius: RADIUS.pill },
  fill: { position: 'absolute', left: 0, height: TRACK, borderRadius: RADIUS.pill },
  thumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2, borderWidth: 3 },
});
