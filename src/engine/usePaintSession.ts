import type { SkImage } from '@shopify/react-native-skia';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Op } from './ops';
import type { PaintLayer } from './paintLayer';
import { PaintSession } from './paintSession';

export type PaintSessionState = {
  paint: SkImage | null;
  filled: ReadonlySet<number>;
  canUndo: boolean;
  canRedo: boolean;
  /** Operations applied in this session (0 = unchanged since the screen was opened). */
  applied: number;
};

/** React wrapper around PaintSession: call `start(layer)` once the layer exists. */
export function usePaintSession(initialFilled: readonly number[]) {
  const session = useRef<PaintSession | null>(null);
  const [state, setState] = useState<PaintSessionState>(() => ({
    paint: null,
    filled: new Set(initialFilled),
    canUndo: false,
    canRedo: false,
    applied: 0,
  }));
  const initial = useRef(initialFilled);

  const publish = useCallback(() => {
    const s = session.current;
    if (!s) return;
    setState({ paint: s.image, filled: s.filled, canUndo: s.canUndo, canRedo: s.canRedo, applied: s.applied });
  }, []);

  const start = useCallback(
    (layer: PaintLayer) => {
      session.current = new PaintSession(layer, initial.current);
      publish();
    },
    [publish],
  );

  const apply = useCallback(
    (op: Op) => {
      if (!session.current) return false;
      session.current.apply(op);
      publish();
      return true;
    },
    [publish],
  );
  const undo = useCallback(() => {
    if (session.current?.undo()) publish();
  }, [publish]);
  const redo = useCallback(() => {
    if (session.current?.redo()) publish();
  }, [publish]);
  const encodePng = useCallback((): Uint8Array | null => session.current?.encodePng() ?? null, []);

  return { ...state, start, apply, undo, redo, encodePng };
}

/**
 * Releases the paint layer one tick after unmount: the screen saves the paint layer in its own
 * unmount cleanup, which React may run after this one.
 */
export function useDisposeLater(layer: React.RefObject<PaintLayer | null>) {
  useEffect(
    () => () => {
      const l = layer.current;
      setTimeout(() => l?.dispose(), 0);
    },
    [layer],
  );
}
