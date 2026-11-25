import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, BackHandler, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ColorPalette } from '../../src/components/ColorPalette';
import { EraserIcon } from '../../src/components/icons';
import { PaintCanvas } from '../../src/components/paint/PaintCanvas';
import { paintStyles, RoundButton, ToolButton, ViewingBar } from '../../src/components/paint/PaintControls';
import { SizeSlider } from '../../src/components/paint/SizeSlider';
import { useAutosave } from '../../src/components/paint/useAutosave';
import { useViewTransform } from '../../src/components/paint/useViewTransform';
import { writeWorkImages } from '../../src/engine/compose';
import { ads, leaveColoringFlow } from '../../src/features/ads';
import { BRUSH_RANGE, BRUSH_WIDTH, ERASER_RANGE, ERASER_WIDTH, REFERENCE_SIZE, scaledWidth, WHITE } from '../../src/engine/ops';
import { useFreeDrawing } from '../../src/engine/useFreeDrawing';
import { formatDayMonth } from '../../src/lib/format';
import { useSettings } from '../../src/store/settings';
import { loadPaint, savePaint } from '../../src/store/workFiles';
import { useWorks } from '../../src/store/works';
import { isFreeWorkId } from '../../src/store/worksReducer';
import { KIDS_PALETTE, RADIUS, SPACE, TYPE, useTheme } from '../../src/theme';

// S06 – free drawing canvas: the S04 canvas without regions (P3). Brush, eraser, "Xoá hết",
// undo / redo, autosave, ✓ Lưu. P4: thumb.png / final.png, ✓ Lưu opens S05 without a star (A23).
// P6: X / Android back = save → interstitial if allowed (F06, Q11: same rule as S04) → back.

type Tool = 'brush' | 'eraser';

export default function DrawScreen() {
  const { workId } = useLocalSearchParams<{ workId: string }>();
  const { t } = useSettings();
  const valid = typeof workId === 'string' && isFreeWorkId(workId);

  React.useEffect(() => {
    if (!valid) Alert.alert(t('color.loadError'), undefined, [{ text: t('common.ok'), onPress: () => router.back() }]);
  }, [valid, t]);

  if (!valid) return null;
  return <DrawingView key={workId} workId={workId} />;
}

function DrawingView({ workId }: { workId: string }) {
  const { t } = useSettings();
  const { works, dispatch, flush } = useWorks();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const work = works[workId];

  const [initialPaint] = useState(() => loadPaint(workId));
  const [createdAt] = useState(() => work?.createdAt ?? Date.now());
  const engine = useFreeDrawing(initialPaint);

  const [color, setColor] = useState<string>(KIDS_PALETTE[0]); // first colour, like S04
  const [tool, setTool] = useState<Tool>('brush');
  const [viewing, setViewing] = useState(false);
  // Brush / eraser sizes (A26): a slider each, back to the default every time the screen opens.
  const [brushSize, setBrushSize] = useState(BRUSH_WIDTH);
  const [eraserSize, setEraserSize] = useState(ERASER_WIDTH);
  const lineWidth = scaledWidth(tool === 'eraser' ? eraserSize : brushSize, engine.size);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [touched, setTouched] = useState(initialPaint !== null);
  const side = Math.max(0, Math.floor(Math.min(area.w - SPACE.lg * 2, area.h - SPACE.lg - HINT_HEIGHT)));
  const view = useViewTransform();

  // A new drawing becomes a Work only once something is drawn (no empty drawings in the list).
  const exists = work !== undefined;
  const hasContent = exists || engine.applied > 0;

  const paintRef = React.useRef(engine.paint);
  paintRef.current = engine.paint;
  const autosave = useAutosave((addTimeMs, final) => {
    if (!hasContent) return;
    const png = engine.encodePng();
    if (!png) return;
    savePaint(workId, png);
    writeWorkImages(workId, paintRef.current, null, final); // no line art: paper + drawing
    dispatch({ type: 'saveFree', workId, addTimeMs, now: Date.now() });
  }, flush);

  const leaving = React.useRef(false);
  const save = () => {
    if (leaving.current) return;
    leaving.current = true;
    autosave.saveForced();
    dispatch({ type: 'complete', workId, now: Date.now() });
    flush();
    // S05 without "+1 ngôi sao" (A23); back from S05 never returns here.
    router.replace({ pathname: '/complete/[workId]', params: { workId, star: '0' } });
  };

  // ---- leaving (F06, Q11): X and Android back ----------------------------------------------
  React.useEffect(() => ads.preload(), []);
  const close = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    autosave.saveFinal(); // a new drawing with nothing drawn is still not saved (hasContent)
    flush();
    leaveColoringFlow(() => (router.canGoBack() ? router.back() : router.replace('/draw')));
  }, [autosave, flush]);
  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  const onStroke = useCallback(
    (points: number[]): boolean => {
      const erase = tool === 'eraser';
      const ok = engine.apply({
        type: 'stroke',
        points,
        color: erase ? WHITE : color,
        width: lineWidth,
        clip: 0, // no regions: "tô không tràn viền" does not apply (S06)
        region: 0,
        erase,
      });
      if (ok) {
        setTouched(true);
        autosave.markDirty();
      }
      return ok;
    },
    [engine, tool, color, autosave, lineWidth],
  );

  const clearAll = () =>
    Alert.alert(t('draw.clearTitle'), t('draw.clearBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('tool.clear'),
        style: 'destructive',
        onPress: () => {
          if (engine.apply({ type: 'clear' })) autosave.markDirty();
        },
      },
    ]);

  const undo = () => {
    engine.undo();
    autosave.markDirty();
  };
  const redo = () => {
    engine.redo();
    autosave.markDirty();
  };
  const toggleViewing = () => {
    if (!viewing) view.reset();
    setViewing((v) => !v);
  };

  const onArea = (e: LayoutChangeEvent) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <SafeAreaView edges={['top']} style={[paintStyles.root, { backgroundColor: c.blueSoft }]}>
      <View style={paintStyles.header}>
        <RoundButton icon="x" label={t('color.close')} onPress={close} />
        <View style={paintStyles.titleBox}>
          <Text style={[TYPE.heading, { color: c.text }]} numberOfLines={1}>
            {t('draw.title', { date: formatDayMonth(createdAt) })}
          </Text>
        </View>
        <RoundButton icon="rotate-ccw" label={t('color.undo')} disabled={!engine.canUndo} onPress={undo} />
        <RoundButton icon="rotate-cw" label={t('color.redo')} disabled={!engine.canRedo} onPress={redo} />
        <RoundButton icon="check" label={t('draw.save')} disabled={!hasContent} primary onPress={save} />
      </View>

      <View style={paintStyles.area} onLayout={onArea}>
        {side > 0 && (
          <>
            <PaintCanvas
              side={side}
              size={engine.size}
              ready={engine.ready}
              paint={engine.paint}
              view={view}
              mode={viewing ? 'view' : 'draw'}
              strokeColor={tool === 'eraser' ? WHITE : color}
              strokeWidth={lineWidth}
              onStroke={onStroke}
            />
            <View style={styles.hint}>
              {!touched && (
                <>
                  <Feather name="edit-3" size={20} color={c.primary} />
                  <View style={[styles.bubble, { backgroundColor: c.surface }]}>
                    <Text style={[TYPE.bodyStrong, { color: c.text }]}>{t('draw.hint')}</Text>
                  </View>
                </>
              )}
            </View>
          </>
        )}
      </View>

      {viewing ? (
        <ViewingBar bottomInset={insets.bottom} onPress={toggleViewing} />
      ) : (
        <View style={[paintStyles.panel, { backgroundColor: c.surface, paddingBottom: insets.bottom + SPACE.sm }]}>
          <View style={paintStyles.tools}>
            <ToolButton
              label="tool.brush"
              active={tool === 'brush'}
              icon={(col) => <Feather name="edit-3" size={22} color={col} />}
              onPress={() => setTool('brush')}
            />
            <ToolButton label="tool.eraser" active={tool === 'eraser'} icon={(col) => <EraserIcon color={col} />} onPress={() => setTool('eraser')} />
            <ToolButton
              label="tool.clear"
              disabled={!hasContent}
              icon={(col) => <Feather name="trash-2" size={22} color={col} />}
              onPress={clearAll}
            />
            <ToolButton label="tool.view" icon={(col) => <Feather name="eye" size={22} color={col} />} onPress={toggleViewing} />
          </View>
          <SizeSlider
            key={tool}
            value={tool === 'eraser' ? eraserSize : brushSize}
            range={tool === 'eraser' ? ERASER_RANGE : BRUSH_RANGE}
            onChange={tool === 'eraser' ? setEraserSize : setBrushSize}
            previewScale={side / REFERENCE_SIZE}
            color={tool === 'eraser' ? null : color}
            label={t(tool === 'eraser' ? 'size.eraser' : 'size.brush')}
          />
          <ColorPalette selected={color} onSelect={setColor} />
        </View>
      )}
    </SafeAreaView>
  );
}

/** Height kept under the canvas for the hint bubble. */
const HINT_HEIGHT = 52;

const styles = StyleSheet.create({
  hint: { height: HINT_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  bubble: { paddingHorizontal: SPACE.md, paddingVertical: SPACE.sm, borderRadius: RADIUS.md },
});
