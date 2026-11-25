import { Directory, File, Paths } from 'expo-file-system';
import { monitoring } from '../features/analytics';

// Picture files of a work (F04), in documentDirectory/works/<id>/ (never the cache directory,
// the OS may clear it):
// - paint.png  the paint layer (transparent where nothing is coloured), to keep editing;
// - thumb.png  384 px, paper + paint + line art, for the grids (S06, S07);
// - final.png  paper + paint + line art, for S05 / S08, sharing and saving to Photos.

export type WorkFileName = 'paint.png' | 'thumb.png' | 'final.png';

function workDir(workId: string): Directory {
  return new Directory(Paths.document, 'works', workId);
}

function workFile(workId: string, name: WorkFileName): File {
  return new File(workDir(workId), name);
}

/**
 * Writes atomically: a temporary file first, then renamed over the old one, so the app
 * being killed in the middle never leaves a broken file.
 */
export function writeWorkFile(workId: string, name: WorkFileName, png: Uint8Array): void {
  const dir = workDir(workId);
  dir.create({ intermediates: true, idempotent: true });
  const tmp = new File(dir, `${name}.tmp`);
  tmp.writeSync(png);
  tmp.moveSync(new File(dir, name), { overwrite: true });
}

export function savePaint(workId: string, png: Uint8Array): void {
  writeWorkFile(workId, 'paint.png', png);
}

/** file:// URI of a work file (for <Image>, sharing; it may not exist yet). */
export function workFileUri(workId: string, name: WorkFileName): string {
  return workFile(workId, name).uri;
}

export const paintUri = (workId: string) => workFileUri(workId, 'paint.png');
export const thumbUri = (workId: string) => workFileUri(workId, 'thumb.png');
export const finalUri = (workId: string) => workFileUri(workId, 'final.png');

export function workFileExists(workId: string, name: WorkFileName): boolean {
  try {
    return workFile(workId, name).exists;
  } catch {
    return false;
  }
}

/** Last change of a work file in ms, or null when it does not exist. */
export function workFileTime(workId: string, name: WorkFileName): number | null {
  try {
    const f = workFile(workId, name);
    return f.exists ? f.modificationTime : null;
  } catch {
    return null;
  }
}

/** Saved paint layer, or null when there is none (or it cannot be read). */
export function loadPaint(workId: string): Uint8Array | null {
  try {
    const file = workFile(workId, 'paint.png');
    return file.exists ? file.bytesSync() : null;
  } catch {
    return null;
  }
}

/** Deletes every file of a work (S08 "Xoá"). Never throws: a leftover folder is harmless. */
export function deleteWorkFiles(workId: string): void {
  try {
    const dir = workDir(workId);
    if (dir.exists) dir.delete();
  } catch (e) {
    monitoring.reportError(e, 'delete_work_files');
  }
}
