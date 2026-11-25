import { useImage } from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { getArtworkAssets } from '../../data/catalog';
import { decodePng, writeWorkImages } from '../../engine/compose';
import { finalUri, loadPaint, workFileTime } from '../../store/workFiles';
import type { Work } from '../../store/worksReducer';
import { monitoring } from '../analytics';

/**
 * final.png is written by the colouring / drawing screen when it closes, goes to the background
 * or finishes (F04). It can be missing or older than paint.png (works from P2/P3, or the app was
 * killed between an autosave and leaving the screen): then it must be made again from paint.png.
 */
export function finalIsStale(workId: string): boolean {
  const finalT = workFileTime(workId, 'final.png');
  if (finalT === null) return true;
  const paintT = workFileTime(workId, 'paint.png');
  return paintT !== null && paintT > finalT;
}

/**
 * file:// URI of an up-to-date final.png for S05 / S08 (null while it is being made, or when the
 * work has no picture). `version` changes when the file changes (to reload <Image>).
 * Only works while the screen is focused: S08 under the colouring screen does nothing.
 */
export function useFinalImage(work: Work | undefined): { uri: string | null; version: number } {
  const focused = useIsFocused();
  const id = work?.id ?? '';
  const [stale, setStale] = useState(() => (work ? finalIsStale(id) : false));
  const assets = work?.kind === 'coloring' && work.artworkId ? getArtworkAssets(work.artworkId) : undefined;
  // The line art is loaded only when final.png must be made again.
  const line = useImage(stale && assets ? assets.line : null);
  const [result, setResult] = useState<{ uri: string | null; version: number }>(() =>
    work && !stale ? { uri: finalUri(id), version: workFileTime(id, 'final.png') ?? 0 } : { uri: null, version: 0 },
  );

  useEffect(() => {
    if (!work || !focused) return;
    if (!finalIsStale(id)) {
      setStale(false);
      setResult({ uri: finalUri(id), version: workFileTime(id, 'final.png') ?? 0 });
      return;
    }
    setStale(true);
    if (assets && !line) return; // wait for the line art
    try {
      const paint = decodePng(loadPaint(id));
      writeWorkImages(id, paint, line, true);
      setStale(false);
      setResult({ uri: finalUri(id), version: workFileTime(id, 'final.png') ?? Date.now() });
    } catch (e) {
      setResult({ uri: null, version: 0 });
      monitoring.reportError(e, 'final_image');
    }
    // work.updatedAt: the work was saved again (e.g. after "Tiếp tục chỉnh sửa").
  }, [id, work?.updatedAt, focused, line]); // eslint-disable-line react-hooks/exhaustive-deps

  return result;
}
