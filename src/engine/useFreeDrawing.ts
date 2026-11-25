import { Skia } from '@shopify/react-native-skia';
import { useEffect, useRef, useState } from 'react';
import { REFERENCE_SIZE } from './ops';
import { createPaintLayer, DEFAULT_PAINT_STRATEGY, type PaintLayer } from './paintLayer';
import { useDisposeLater, usePaintSession } from './usePaintSession';

/** Free drawing paper (S06): square, same size as the artworks. */
export const FREE_DRAWING_SIZE = REFERENCE_SIZE;

const NO_FILLED: readonly number[] = [];

/** Engine for free drawing (S06): a paint layer without regions, with undo history. */
export function useFreeDrawing(initialPaint: Uint8Array | null) {
  const session = usePaintSession(NO_FILLED);
  const { start } = session;
  const [error, setError] = useState<string | null>(null);
  const layer = useRef<PaintLayer | null>(null);
  const initial = useRef(initialPaint);

  useEffect(() => {
    if (layer.current) return;
    try {
      const saved = initial.current ? Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(initial.current)) : null;
      layer.current = createPaintLayer(DEFAULT_PAINT_STRATEGY, { regions: null, size: FREE_DRAWING_SIZE, initial: saved });
      start(layer.current);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [start]);

  useDisposeLater(layer);

  return {
    ready: session.paint !== null,
    error,
    paint: session.paint,
    size: FREE_DRAWING_SIZE,
    /** Operations applied in this session (0 = nothing drawn since the screen was opened). */
    applied: session.applied,
    canUndo: session.canUndo,
    canRedo: session.canRedo,
    apply: session.apply,
    undo: session.undo,
    redo: session.redo,
    encodePng: session.encodePng,
  };
}
