import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ColorPalette } from '../../src/components/ColorPalette';
import { BucketIcon, EraserIcon } from '../../src/components/icons';
import { PaintCanvas, type CanvasMode } from '../../src/components/paint/PaintCanvas';
import { paintStyles, RoundButton, ToolButton, ViewingBar } from '../../src/components/paint/PaintControls';
import { SizeSlider } from '../../src/components/paint/SizeSlider';
import { useAutosave } from '../../src/components/paint/useAutosave';
import { useViewTransform } from '../../src/components/paint/useViewTransform';
import { getArtwork, getArtworkAssets } from '../../src/data/catalog';
import type { ArtworkAssetSet } from '../../src/data/artworkAssets';
import type { Artwork } from '../../src/data/types';
import { BRUSH_RANGE, BRUSH_WIDTH, ERASER_RANGE, ERASER_WIDTH, REFERENCE_SIZE, scaledWidth, WHITE } from '../../src/engine/ops';
import { writeWorkImages } from '../../src/engine/compose';
import { useColoring } from '../../src/engine/useColoring';
import { ads, leaveColoringFlow } from '../../src/features/ads';
import { monitoring } from '../../src/features/analytics';
import { useFeedback } from '../../src/features/feedback/feedback';
import { useSettings } from '../../src/store/settings';
import { loadPaint, savePaint } from '../../src/store/workFiles';
import { useWorks } from '../../src/store/works';
import type { Work } from '../../src/store/worksReducer';
import { KIDS_PALETTE, RADIUS, SPACE, TYPE, useTheme } from '../../src/theme';

// S04 – colouring screen (design 06). P2: fill tool, zoom, progress, autosave, completion.
// P3: brush, eraser, "tô không tràn viền", undo / redo (F03).
// P4: thumb.png / final.png (F04), sounds + haptics (F09), finishing opens S05 (A18).
// P6: X / Android back = save → interstitial if allowed (F06) → back. No ad while colouring.
// P7: artwork_start (F07).

type Tool = 'fill' | 'brush' | 'eraser';

export default function ColorScreen() {
  const { artworkId } = useLocalSearchParams<{ artworkId: string }>();
  const artwork = getArtwork(artworkId ?? '');
  const assets = getArtworkAssets(artworkId ?? '');
  const { works } = useWorks();
  const { t } = useSettings();

  useEffect(() => {
    if (artwork && assets) return;
    // Bundled id that cannot be loaded (P2): reported to Crashlytics (P7), then back.
    monitoring.reportError(new Error(`Artwork not found: ${artworkId}`), 'artwork_load');
    Alert.alert(t('color.loadError'), undefined, [{ text: t('common.ok'), onPress: () => router.back() }]);
  }, [artwork, assets]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!artwork || !assets) return null;
  return <ColoringView key={artwork.id} artwork={artwork} assets={assets} work={works[artwork.id]} />;
}

function ColoringView({ artwork, assets, work }: { artwork: Artwork; assets: ArtworkAssetSet; work: Work | undefined }) {
  const { t, language, noOverflow } = useSettings();
  const { dispatch, flush, starEarned } = useWorks();
  const feedback = useFeedback();
  const c = useTheme();
  const insets = useSafeAreaInsets();

  // Continue a saved work: its paint layer file and filled regions (read once).
  const [initialPaint] = useState(() => loadPaint(artwork.id));
  const [initialFilled] = useState<readonly number[]>(() => work?.filled ?? []);
  const engine = useColoring({ artwork, assets, initialPaint, initialFilled });

  const [color, setColor] = useState<string>(KIDS_PALETTE[0]);
  const [tool, setTool] = useState<Tool>('fill');
  const [viewing, setViewing] = useState(false);
  // Brush / eraser sizes (A26): a slider each, back to the default every time the screen opens.
  const [brushSize, setBrushSize] = useState(BRUSH_WIDTH);
  const [eraserSize, setEraserSize] = useState(ERASER_WIDTH);
  const lineWidth = scaledWidth(tool === 'eraser' ? eraserSize : brushSize, engine.size);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [touched, setTouched] = useState(initialFilled.length > 0);
  const side = Math.max(0, Math.floor(Math.min(area.w - SPACE.lg * 2, area.h - SPACE.lg - HINT_HEIGHT)));
  const view = useViewTransform();

  // ---- saving ---------------------------------------------------------------------------
  const latest = useRef({ filled: engine.filled, progress: engine.progress, paint: engine.paint, line: engine.lineImg });
  latest.current = { filled: engine.filled, progress: engine.progress, paint: engine.paint, line: engine.lineImg };
  const autosave = useAutosave((addTimeMs, final) => {
    const png = engine.encodePng();
    if (!png) return;
    savePaint(artwork.id, png);
    // thumb.png every time (grids), final.png when leaving / finishing (F04).
    writeWorkImages(artwork.id, latest.current.paint, latest.current.line, final);
    dispatch({
      type: 'saveColoring',
      artworkId: artwork.id,
      filled: [...latest.current.filled],
      progress: latest.current.progress,
      addTimeMs,
      now: Date.now(),
    });
  }, flush);

  // ---- completion (A18): 100% or ✓ Xong → S05 ---------------------------------------------
  const completed = useRef(work?.status === 'done');
  const leaving = useRef(false);
  const finish = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    autosave.saveForced(); // latest paint.png + thumb.png + final.png on disk, Work saved
    // "+1 ngôi sao" only at the first completion of this artwork (F04). Read before completing.
    const star = !completed.current && !starEarned(artwork.id);
    if (!completed.current) {
      completed.current = true;
      dispatch({ type: 'complete', workId: artwork.id, now: Date.now() });
    }
    flush();
    // Replace: back from S05 never returns to this screen (S05).
    router.replace({ pathname: '/complete/[workId]', params: { workId: artwork.id, star: star ? '1' : '0' } });
  }, [artwork.id, autosave, dispatch, flush, starEarned]);

  useEffect(() => {
    if (engine.progress >= 1 && !completed.current && engine.ready) finish();
  }, [engine.progress, engine.ready, finish]);

  // ---- analytics (F07): once per opening of the screen, new or continued picture -----------
  useEffect(() => {
    monitoring.track({ name: 'artwork_start', params: { artwork_id: artwork.id, category: artwork.category, level: artwork.level } });
  }, [artwork.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- leaving (F06): X and Android back ---------------------------------------------------
  useEffect(() => ads.preload(), []); // the interstitial for the exit loads while the child colours
  const close = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    autosave.saveFinal();
    flush();
    leaveColoringFlow(() => (router.canGoBack() ? router.back() : router.replace('/')));
  }, [autosave, flush]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  // ---- editing --------------------------------------------------------------------------
  const changed = useCallback(() => {
    setTouched(true);
    autosave.markDirty();
  }, [autosave]);

  /** Fill tool: tap colours the region. */
  const onTap = useCallback(
    (x: number, y: number) => {
      const region = engine.regionAt(x, y);
      if (region && engine.apply({ type: 'fill', region, color })) {
        feedback.fill();
        changed();
      }
    },
    [engine, color, changed, feedback],
  );

  /** Region a brush / eraser line starting at (x, y) stays in ("tô không tràn viền", F03). */
  const clipAt = useCallback((x: number, y: number) => (noOverflow ? engine.regionAt(x, y) : 0), [noOverflow, engine]);

  /** Brush / eraser line. An eraser tap makes the whole region white again (F03). */
  const onStroke = useCallback(
    (points: number[], isTap: boolean): boolean => {
      const region = engine.regionAt(points[0], points[1]);
      if (!region) return false;
      const erase = tool === 'eraser';
      const ok =
        erase && isTap
          ? engine.apply({ type: 'fill', region, color: WHITE })
          : engine.apply({
              type: 'stroke',
              points,
              color: erase ? WHITE : color,
              width: lineWidth,
              clip: noOverflow ? region : 0,
              region,
              erase,
            });
      if (ok) changed();
      return ok;
    },
    [engine, tool, color, noOverflow, changed, lineWidth],
  );

  const undo = () => {
    engine.undo();
    autosave.markDirty();
  };
  const redo = () => {
    engine.redo();
    autosave.markDirty();
  };

  const toggleViewing = () => {
    if (!viewing) view.reset(); // "Xem tranh" shows the whole picture (S04)
    setViewing((v) => !v);
  };

  // ---- render ---------------------------------------------------------------------------
  const percent = Math.round(engine.progress * 100);
  const canFinish = engine.filled.size > 0;
  const mode: CanvasMode = viewing ? 'view' : tool === 'fill' ? 'fill' : 'draw';
  const onArea = (e: LayoutChangeEvent) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <SafeAreaView edges={['top']} style={[paintStyles.root, { backgroundColor: c.mintSoft }]}>
      <View style={paintStyles.header}>
        <RoundButton icon="x" label={t('color.close')} onPress={close} />
        <View style={paintStyles.titleBox}>
          <Text style={[TYPE.heading, { color: c.text }]} numberOfLines={1}>
            {artwork.title[language]}
          </Text>
          <Text style={[TYPE.caption, { color: c.textMuted }]} numberOfLines={1}>
            {t('color.progress', { p: percent })}
          </Text>
        </View>
        <RoundButton icon="rotate-ccw" label={t('color.undo')} disabled={!engine.canUndo} onPress={undo} />
        <RoundButton icon="rotate-cw" label={t('color.redo')} disabled={!engine.canRedo} onPress={redo} />
        <RoundButton icon="check" label={t('color.done')} disabled={!canFinish} primary onPress={finish} />
      </View>

      <View style={paintStyles.area} onLayout={onArea}>
        {side > 0 && (
          <>
            <PaintCanvas
              side={side}
              size={engine.size}
              ready={engine.ready}
              paint={engine.paint}
              lineImg={engine.lineImg}
              regionsImg={engine.regionsView}
              view={view}
              mode={mode}
              strokeColor={tool === 'eraser' ? WHITE : color}
              strokeWidth={lineWidth}
              clipAt={noOverflow ? clipAt : undefined}
              onTap={onTap}
              onStroke={onStroke}
            />
            <View style={styles.hint}>
              {!touched && (
                <>
                  <Feather name="edit-2" size={20} color={c.primary} />
                  <View style={[styles.bubble, { backgroundColor: c.surface }]}>
                    <Text style={[TYPE.bodyStrong, { color: c.text }]}>{t('color.hint')}</Text>
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
            <ToolButton label="tool.fill" active={tool === 'fill'} icon={(col) => <BucketIcon color={col} />} onPress={() => setTool('fill')} />
            <ToolButton
              label="tool.brush"
              active={tool === 'brush'}
              icon={(col) => <Feather name="edit-3" size={22} color={col} />}
              onPress={() => setTool('brush')}
            />
            <ToolButton label="tool.eraser" active={tool === 'eraser'} icon={(col) => <EraserIcon color={col} />} onPress={() => setTool('eraser')} />
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
            hidden={tool === 'fill'}
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
