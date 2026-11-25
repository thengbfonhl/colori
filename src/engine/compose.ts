import { FilterMode, MipmapMode, Skia, type SkImage } from '@shopify/react-native-skia';
import { writeWorkFile } from '../store/workFiles';
import { THEMES } from '../theme';

/** final.png side (F04): same as the paint layer, enough to share / save to Photos. */
export const FINAL_SIZE = 1024;
/** thumb.png side (F04). */
export const THUMB_SIZE = 384;

/**
 * Paper + paint layer + line art (the picture as the child sees it), as PNG bytes.
 * Uses a CPU (raster) surface on the JS thread: no GPU context shared with the screen.
 */
export function composePng(paint: SkImage | null, line: SkImage | null, size: number): Uint8Array {
  const surface = Skia.Surface.Make(size, size);
  if (!surface) throw new Error('Cannot create raster surface');
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color(THEMES.light.paper)); // the paper is always white (both themes)
  const dst = Skia.XYWHRect(0, 0, size, size);
  const draw = (img: SkImage) =>
    canvas.drawImageRectOptions(img, Skia.XYWHRect(0, 0, img.width(), img.height()), dst, FilterMode.Linear, MipmapMode.Linear, Skia.Paint());
  if (paint) draw(paint);
  if (line) draw(line);
  surface.flush();
  const snap = surface.makeImageSnapshot();
  const png = snap.encodeToBytes();
  snap.dispose?.();
  surface.dispose?.();
  return png;
}

/** Writes thumb.png and, when asked, final.png of a work (atomic writes, F04). */
export function writeWorkImages(workId: string, paint: SkImage | null, line: SkImage | null, withFinal: boolean): void {
  writeWorkFile(workId, 'thumb.png', composePng(paint, line, THUMB_SIZE));
  if (withFinal) writeWorkFile(workId, 'final.png', composePng(paint, line, FINAL_SIZE));
}

/** Decodes saved PNG bytes (paint.png) into an image, or null. */
export function decodePng(bytes: Uint8Array | null): SkImage | null {
  if (!bytes) return null;
  try {
    return Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(bytes));
  } catch {
    return null;
  }
}
