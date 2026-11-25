import { requestPermissionsAsync, saveToLibraryAsync } from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { finalUri, workFileExists } from '../../store/workFiles';
import { monitoring } from '../analytics';

// Share / save to Photos (F04). Both are called only after the parental gate (F05).

export type ShareResult = 'shared' | 'unavailable' | 'error';

/** System share sheet with final.png. */
export async function shareWork(workId: string, dialogTitle: string): Promise<ShareResult> {
  try {
    if (!workFileExists(workId, 'final.png') || !(await Sharing.isAvailableAsync())) return 'unavailable';
    await Sharing.shareAsync(finalUri(workId), { mimeType: 'image/png', UTI: 'public.png', dialogTitle });
    // The share sheet was opened (the OS does not tell whether the parent picked a target).
    monitoring.track({ name: 'artwork_shared' });
    return 'shared';
  } catch (e) {
    monitoring.reportError(e, 'share');
    return 'error';
  }
}

export type SaveResult = 'saved' | 'denied' | 'error';

/**
 * Saves final.png to the photo library. Asks only for "add photos" (write only, never read
 * access: docs/03 §6). The legacy API is used because it works with write-only access.
 * Expo Go on Android is limited: re-check on a development build (P6 / phase B).
 */
export async function saveWorkToPhotos(workId: string): Promise<SaveResult> {
  try {
    if (!workFileExists(workId, 'final.png')) return 'error';
    const perm = await requestPermissionsAsync(true);
    if (!perm.granted) return 'denied';
    await saveToLibraryAsync(finalUri(workId));
    monitoring.track({ name: 'artwork_saved_to_photos' });
    return 'saved';
  } catch (e) {
    monitoring.reportError(e, 'save_to_photos');
    return 'error';
  }
}
