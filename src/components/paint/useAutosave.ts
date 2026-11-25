import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import { monitoring } from '../../features/analytics';

/** Autosave after the last change (F04). */
export const AUTOSAVE_MS = 1500;

/**
 * Autosave for the colouring and free drawing screens (F04 "Tự lưu"):
 * after AUTOSAVE_MS without changes, when the app goes to the background, and when the screen
 * closes. `write(addTimeMs, final)` writes the files + the Work; it gets the time spent since the
 * last save, counted only while this screen is shown and the app is in the foreground (S04).
 * `final` is false for the timed autosave (paint.png + thumb.png only, cheap) and true when
 * leaving, going to the background or finishing (final.png too).
 * If `write` throws, the changes stay pending and the next save tries again.
 */
export function useAutosave(write: (addTimeMs: number, final: boolean) => void, flush: () => void) {
  const dirty = useRef(false);
  /** A timed autosave ran since final.png was last written. */
  const finalPending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSince = useRef<number | null>(Date.now());
  const pendingTime = useRef(0);
  const writeRef = useRef(write);
  writeRef.current = write;

  const takeActiveTime = () => {
    const now = Date.now();
    if (activeSince.current !== null) {
      pendingTime.current += now - activeSince.current;
      activeSince.current = now;
    }
    const ms = pendingTime.current;
    pendingTime.current = 0;
    return ms;
  };

  const saveNow = useCallback((final: boolean) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current && !(final && finalPending.current)) return;
    const ms = takeActiveTime();
    try {
      writeRef.current(ms, final);
      dirty.current = false;
      finalPending.current = !final;
    } catch (e) {
      pendingTime.current += ms; // keep it for the next try
      monitoring.reportError(e, 'autosave');
    }
  }, []);

  const markDirty = useCallback(() => {
    dirty.current = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveNow(false), AUTOSAVE_MS);
  }, [saveNow]);

  /** Saves now even without changes (e.g. "Xong" / "Lưu"). */
  const saveForced = useCallback(() => {
    dirty.current = true;
    saveNow(true);
  }, [saveNow]);

  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') activeSince.current = Date.now();
      else {
        saveNow(true);
        flushRef.current();
        if (activeSince.current !== null) pendingTime.current += Date.now() - activeSince.current;
        activeSince.current = null;
      }
    });
    return () => {
      sub.remove();
      saveNow(true); // leaving the screen (X, back gesture, Android back)
    };
  }, [saveNow]);

  /** Saves pending changes now, with final.png (leaving the screen before an interstitial, F06). */
  const saveFinal = useCallback(() => saveNow(true), [saveNow]);

  return useMemo(() => ({ markDirty, saveForced, saveFinal }), [markDirty, saveForced, saveFinal]);
}
