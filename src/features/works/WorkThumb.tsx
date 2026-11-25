import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { getArtwork, getArtworkAssets } from '../../data/catalog';
import type { Language, MessageKey, TranslateParams } from '../../i18n';
import { formatDayMonth } from '../../lib/format';
import { paintUri, thumbUri, workFileExists } from '../../store/workFiles';
import type { Work } from '../../store/worksReducer';
import { RADIUS, useTheme } from '../../theme';

/** Name shown for a work: the artwork title, or "Tranh vẽ dd/MM" for a free drawing (S06). */
export function workTitle(work: Work, language: Language, t: (key: MessageKey, params?: TranslateParams) => string): string {
  if (work.kind === 'coloring' && work.artworkId) {
    const a = getArtwork(work.artworkId);
    if (a) return a.title[language];
  }
  return t('draw.title', { date: formatDayMonth(work.createdAt) });
}

/**
 * Coloured thumbnail of a work on white paper (S06, S07). Uses thumb.png (F04). Works saved
 * before P4 have none until they are opened again: then paint.png + the line art are stacked.
 */
export function WorkThumb({ work, style }: { work: Work; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  const hasThumb = workFileExists(work.id, 'thumb.png');
  const line = work.kind === 'coloring' && work.artworkId ? getArtworkAssets(work.artworkId)?.line : undefined;
  return (
    <View style={[styles.thumb, { backgroundColor: c.paper, borderColor: c.border }, style]}>
      {/* Keyed by updatedAt: files are rewritten in place, a new key reloads them. */}
      {hasThumb ? (
        <Image key={`t${work.updatedAt}`} source={{ uri: thumbUri(work.id) }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="none" />
      ) : (
        <>
          <Image key={`p${work.updatedAt}`} source={{ uri: paintUri(work.id) }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="none" />
          {line !== undefined && <Image source={line} style={StyleSheet.absoluteFill} contentFit="contain" />}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { aspectRatio: 1, borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
});
