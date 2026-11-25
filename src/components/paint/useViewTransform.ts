import type { Transforms3d } from '@shopify/react-native-skia';
import { useCallback } from 'react';
import { useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { IDENTITY, zoomAt, type ViewTransform } from '../../engine/transform';

const ZOOM_ANIM = { duration: 180 };

export type ViewTransformState = {
  scale: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  /** Values when a pinch / drag started. */
  start: SharedValue<{ scale: number; tx: number; ty: number; fx: number; fy: number }>;
  /** Skia transform of the zoomed picture. */
  transform: SharedValue<Transforms3d>;
  current: () => ViewTransform;
  animateTo: (v: ViewTransform) => void;
  /** Zoom around the centre of a `side`-point canvas (+/− buttons). */
  zoomBy: (factor: number, side: number) => void;
  /** Back to the whole picture (Xem tranh, F03). */
  reset: () => void;
};

/** Zoom / pan state of a paint canvas, on the UI thread (F03 "Zoom / Pan"). */
export function useViewTransform(): ViewTransformState {
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const start = useSharedValue({ scale: 1, tx: 0, ty: 0, fx: 0, fy: 0 });
  const transform = useDerivedValue<Transforms3d>(() => [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }]);

  const animateTo = useCallback(
    (v: ViewTransform) => {
      scale.value = withTiming(v.scale, ZOOM_ANIM);
      tx.value = withTiming(v.tx, ZOOM_ANIM);
      ty.value = withTiming(v.ty, ZOOM_ANIM);
    },
    [scale, tx, ty],
  );
  const current = useCallback((): ViewTransform => ({ scale: scale.value, tx: tx.value, ty: ty.value }), [scale, tx, ty]);
  const zoomBy = useCallback(
    (factor: number, side: number) => animateTo(zoomAt(current(), factor, side / 2, side / 2, side)),
    [animateTo, current],
  );
  const reset = useCallback(() => animateTo(IDENTITY), [animateTo]);

  return { scale, tx, ty, start, transform, current, animateTo, zoomBy, reset };
}
