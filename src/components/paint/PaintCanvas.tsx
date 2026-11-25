import { Feather } from '@expo/vector-icons';
import {
  Canvas,
  FilterMode,
  Group,
  Image as SkiaImage,
  ImageShader,
  MipmapMode,
  Path,
  Rect,
  Shader,
  usePathValue,
  type SkImage,
} from '@shopify/react-native-skia';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { getMaskEffect, hexToUnit } from '../../engine/paintLayer';
import { shouldAddPoint, traceStroke } from '../../engine/stroke';
import { panBy, viewToImage, zoomAt, ZOOM_STEP } from '../../engine/transform';
import { useSettings } from '../../store/settings';
import { RADIUS, SPACE, useTheme } from '../../theme';
import type { ViewTransformState } from './useViewTransform';

/** Finger movement (pt) under which a touch is a tap, above which it is a drag. */
export const TAP_SLOP = 12;

/**
 * - fill: one-finger TAP colours, one-finger DRAG moves the zoomed picture (A21);
 * - draw: one-finger drag draws (brush / eraser); moving only with two fingers (A22);
 * - view: "Xem tranh", drag / pinch only.
 * Two fingers always zoom and move.
 */
export type CanvasMode = 'fill' | 'draw' | 'view';

type Props = {
  side: number;
  /** Picture size in px (paint layer, region map). */
  size: number;
  ready: boolean;
  paint: SkImage | null;
  /** Line art drawn on top (colouring). None for free drawing. */
  lineImg?: SkImage | null;
  /**
   * Region map for the screen, to clip the line being drawn ("tô không tràn viền").
   * Must be a raster image used only here, never drawn by the engine's offscreen surface.
   */
  regionsImg?: SkImage | null;
  view: ViewTransformState;
  mode: CanvasMode;
  /** Colour and width (picture px) of the line being drawn. */
  strokeColor: string;
  strokeWidth: number;
  /** Region a line starting at picture point (x, y) is clipped to; 0 = not clipped. */
  clipAt?: (x: number, y: number) => number;
  /** Tap in fill mode, picture px. */
  onTap?: (x: number, y: number) => void;
  /** Finished line in draw mode (flat picture px). `isTap`: the finger did not move. Returns false if nothing was drawn. */
  onStroke?: (points: number[], isTap: boolean) => boolean;
};

const NEAREST = { filter: FilterMode.Nearest, mipmap: MipmapMode.None };

type StrokeState = { active: boolean; cancelled: boolean; moved: boolean; ox: number; oy: number; seq: number };

/** Paper + paint layer + live line + line art, with zoom buttons (S04 / S06). */
export function PaintCanvas({
  side,
  size,
  ready,
  paint,
  lineImg,
  regionsImg,
  view,
  mode,
  strokeColor,
  strokeWidth,
  clipAt,
  onTap,
  onStroke,
}: Props) {
  const { t } = useSettings();
  const c = useTheme();
  const { scale, tx, ty, start } = view;

  // ---- line being drawn ---------------------------------------------------------------------
  // The drawing gesture runs on the JS thread (simple and safe: no calls between threads).
  // Only the points are sent to the UI thread, where the live line is traced each frame.
  /** Flat picture-px points of the line under the finger (copy for the UI thread). */
  const livePts = useSharedValue<number[]>([]);
  /** Region the live line is clipped to; 0 = none. */
  const liveTarget = useSharedValue(0);
  const livePath = usePathValue((builder) => {
    'worklet';
    traceStroke(livePts.value, builder);
  });
  const unitColor = useMemo(() => hexToUnit(strokeColor), [strokeColor]);
  const uniforms = useDerivedValue(() => ({ target: liveTarget.value, color: unitColor }));

  const points = useRef<number[]>([]);
  const stroke = useRef<StrokeState>({ active: false, cancelled: false, moved: false, ox: 0, oy: 0, seq: 0 });
  // The live line is removed once the paint layer shows it (no blink in between).
  const pendingClear = useRef<number | null>(null);
  useEffect(() => {
    if (pendingClear.current === null) return;
    if (pendingClear.current === stroke.current.seq && !stroke.current.active) livePts.value = [];
    pendingClear.current = null;
  }, [paint, livePts]);

  // Latest props for the gesture callbacks (the gesture is not rebuilt on every render).
  const latest = useRef({ clipAt, onTap, onStroke, side, size });
  latest.current = { clipAt, onTap, onStroke, side, size };

  const toImage = useCallback(
    (x: number, y: number) => viewToImage(x, y, view.current(), latest.current.side, latest.current.size),
    [view],
  );

  const beginStroke = useCallback(
    (x: number, y: number) => {
      const p = toImage(x, y);
      const s = stroke.current;
      stroke.current = { active: true, cancelled: false, moved: false, ox: x, oy: y, seq: s.seq + 1 };
      points.current = [p.x, p.y];
      liveTarget.value = latest.current.clipAt ? latest.current.clipAt(p.x, p.y) : 0;
      livePts.value = [p.x, p.y];
    },
    [toImage, liveTarget, livePts],
  );

  const moveStroke = useCallback(
    (x: number, y: number, pointers: number) => {
      const s = stroke.current;
      if (!s.active || s.cancelled) return;
      if (pointers > 1) {
        // A second finger cancels the line: zooming never leaves a stray line (F03).
        s.cancelled = true;
        livePts.value = [];
        return;
      }
      const dx = x - s.ox;
      const dy = y - s.oy;
      if (!s.moved && dx * dx + dy * dy > TAP_SLOP * TAP_SLOP) s.moved = true;
      const p = toImage(x, y);
      if (!shouldAddPoint(points.current, p.x, p.y)) return;
      points.current.push(p.x, p.y);
      livePts.value = points.current.slice();
    },
    [toImage, livePts],
  );

  const endStroke = useCallback(() => {
    const s = stroke.current;
    if (!s.active) return;
    s.active = false;
    const pts = points.current;
    points.current = [];
    if (s.cancelled || pts.length === 0) {
      livePts.value = [];
      return;
    }
    const drawn = latest.current.onStroke?.(pts, !s.moved) ?? false;
    if (drawn) pendingClear.current = s.seq;
    else livePts.value = [];
  }, [livePts]);

  const handleTap = useCallback(
    (x: number, y: number) => {
      const p = toImage(x, y);
      latest.current.onTap?.(p.x, p.y);
    },
    [toImage],
  );

  // ---- gestures -----------------------------------------------------------------------------
  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart((e) => {
        start.value = { scale: scale.value, tx: tx.value, ty: ty.value, fx: e.focalX, fy: e.focalY };
      })
      .onUpdate((e) => {
        const s = start.value;
        const v = panBy(zoomAt({ scale: s.scale, tx: s.tx, ty: s.ty }, e.scale, s.fx, s.fy, side), e.focalX - s.fx, e.focalY - s.fy, side);
        scale.value = v.scale;
        tx.value = v.tx;
        ty.value = v.ty;
      });

    if (mode === 'draw') {
      const draw = Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => beginStroke(e.x, e.y))
        .onUpdate((e) => moveStroke(e.x, e.y, e.numberOfPointers))
        .onFinalize(() => endStroke());
      return Gesture.Simultaneous(pinch, draw);
    }

    const pan = Gesture.Pan()
      .maxPointers(1) // a second finger before the drag starts → pinch takes over
      .minDistance(TAP_SLOP)
      .onStart(() => {
        start.value = { scale: scale.value, tx: tx.value, ty: ty.value, fx: 0, fy: 0 };
      })
      .onUpdate((e) => {
        const s = start.value;
        const v = panBy({ scale: s.scale, tx: s.tx, ty: s.ty }, e.translationX, e.translationY, side);
        tx.value = v.tx;
        ty.value = v.ty;
      });
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDistance(TAP_SLOP)
      .onEnd((e, success) => {
        if (success && mode === 'fill') handleTap(e.x, e.y);
      });
    // The first gesture to activate wins: a drag never colours, a tap never moves.
    return Gesture.Race(pinch, pan, tap);
  }, [mode, side, scale, tx, ty, start, beginStroke, moveStroke, endStroke, handleTap]);

  const k = side / size;
  return (
    <View style={[styles.card, { width: side, height: side, backgroundColor: c.paper, borderColor: c.border }]}>
      <GestureDetector gesture={gesture}>
        <View style={{ width: side, height: side }}>
          <Canvas style={{ width: side, height: side }}>
            <Group transform={view.transform}>
              <Rect x={0} y={0} width={side} height={side} color={c.paper} />
              <Group transform={[{ scale: k }]}>
                {paint && <SkiaImage image={paint} x={0} y={0} width={size} height={size} fit="fill" />}
                <Path path={livePath} style="stroke" strokeWidth={strokeWidth} strokeCap="round" strokeJoin="round" color={strokeColor}>
                  {regionsImg && clipAt && (
                    <Shader source={getMaskEffect()} uniforms={uniforms}>
                      <ImageShader image={regionsImg} tx="clamp" ty="clamp" sampling={NEAREST} />
                    </Shader>
                  )}
                </Path>
                {lineImg && <SkiaImage image={lineImg} x={0} y={0} width={size} height={size} fit="fill" />}
              </Group>
            </Group>
          </Canvas>
          {!ready && <ActivityIndicator style={StyleSheet.absoluteFill} color={c.primary} />}
        </View>
      </GestureDetector>
      <View style={styles.zoom}>
        <ZoomButton icon="plus" label={t('color.zoomIn')} onPress={() => view.zoomBy(ZOOM_STEP, side)} />
        <ZoomButton icon="minus" label={t('color.zoomOut')} onPress={() => view.zoomBy(1 / ZOOM_STEP, side)} />
      </View>
    </View>
  );
}

function ZoomButton({ icon, label, onPress }: { icon: 'plus' | 'minus'; label: string; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.zoomButton, { backgroundColor: c.bg, opacity: pressed ? 0.7 : 1 }]}
    >
      <Feather name={icon} size={20} color={c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  zoom: { position: 'absolute', right: SPACE.sm, bottom: SPACE.sm, gap: SPACE.sm },
  zoomButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
