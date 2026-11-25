import { Skia, useImage, type SkImage } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ArtworkAssetSet } from '../data/artworkAssets';
import type { Artwork } from '../data/types';
import { createPaintLayer, DEFAULT_PAINT_STRATEGY, rasterImage, readRegionPixels, type PaintLayer } from './paintLayer';
import { buildRegionPixels, computeProgress, decodeRegionIds, maxRegionId, regionAt } from './regionMap';
import { useDisposeLater, usePaintSession } from './usePaintSession';

type Options = {
  artwork: Artwork;
  assets: ArtworkAssetSet;
  /** Saved paint layer (paint.png bytes) and filled regions, when continuing a work. */
  initialPaint: Uint8Array | null;
  initialFilled: readonly number[];
};

/**
 * Colouring engine state for one artwork (F02, F03): loads the line art and region map, owns
 * the paint layer and its undo history, tracks which regions are coloured.
 */
export function useColoring({ artwork, assets, initialPaint, initialFilled }: Options) {
  const regionsImg = useImage(assets.regions);
  const lineImg = useImage(assets.line);
  const session = usePaintSession(initialFilled);
  const { start } = session;
  const [error, setError] = useState<string | null>(null);
  // Raster copy of the region map for the screen's <Canvas> (live clipped line). The engine's
  // offscreen surface (JS thread) and the screen (UI thread) never share one image.
  const [regionsView, setRegionsView] = useState<SkImage | null>(null);
  const layer = useRef<PaintLayer | null>(null);
  const map = useRef<{ ids: Uint16Array; size: number } | null>(null);
  // Only the first value matters (loading happens once).
  const initial = useRef(initialPaint);

  useEffect(() => {
    if (!regionsImg || layer.current) return;
    try {
      const size = regionsImg.width();
      const px = readRegionPixels(regionsImg);
      const ids = decodeRegionIds(px, size);
      setRegionsView(rasterImage(px, size));
      map.current = { ids, size };
      const saved = initial.current ? Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(initial.current)) : null;
      const index = DEFAULT_PAINT_STRATEGY === 'cpu' ? buildRegionPixels(ids, maxRegionId(artwork)) : undefined;
      layer.current = createPaintLayer(DEFAULT_PAINT_STRATEGY, { regions: regionsImg, size, initial: saved, index });
      start(layer.current);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [regionsImg, artwork, start]);

  useDisposeLater(layer);

  /** Region under picture pixel (x, y); 0 when outside the picture or not loaded yet. */
  const regionAtPoint = useCallback((x: number, y: number): number => {
    const m = map.current;
    return m ? regionAt(m.ids, m.size, x, y) : 0;
  }, []);

  const progress = useMemo(() => computeProgress(session.filled, artwork), [session.filled, artwork]);

  return {
    ready: session.paint !== null && lineImg !== null,
    error,
    paint: session.paint,
    lineImg,
    /** Region map for the screen's canvas (raster copy, see above). */
    regionsView,
    /** Side of the region map / paint layer in px. */
    size: map.current?.size ?? artwork.size.regions,
    filled: session.filled,
    progress,
    canUndo: session.canUndo,
    canRedo: session.canRedo,
    regionAt: regionAtPoint,
    apply: session.apply,
    undo: session.undo,
    redo: session.redo,
    encodePng: session.encodePng,
  };
}
