import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSettings } from '../store/settings';
import { KIDS_PALETTE, PALETTE_PAGE_SIZE, SPACE, useTheme } from '../theme';

const COLUMNS = 6;
const SWATCH = 44;

/**
 * Kids colour palette (design 06): pages of 2 rows × 6, swiped horizontally, with page dots.
 * Page 1 holds the 12 design colours, page 2 twelve brighter ones (decision 16/11),
 * page 3 bright/pastel and page 4 deep colours (decision 25/11): 48 colours, 4 pages.
 */
export function ColorPalette({ selected, onSelect }: { selected: string; onSelect: (color: string) => void }) {
  const { t } = useSettings();
  const c = useTheme();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const pages: string[][] = [];
  for (let i = 0; i < KIDS_PALETTE.length; i += PALETTE_PAGE_SIZE) pages.push(KIDS_PALETTE.slice(i, i + PALETTE_PAGE_SIZE));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View onLayout={onLayout}>
      {width > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {pages.map((colors, p) => (
            <View key={p} style={[styles.page, { width }]}>
              {colors.map((color, i) => {
                const active = color === selected;
                return (
                  <Pressable
                    key={color}
                    onPress={() => onSelect(color)}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={t('palette.color', { n: p * PALETTE_PAGE_SIZE + i + 1 })}
                    style={[
                      styles.swatch,
                      { width: (width - SPACE.lg * 2) / COLUMNS - SPACE.sm },
                    ]}
                  >
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: color, borderColor: active ? c.inverse : c.border, borderWidth: active ? 3 : 1 },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.dots}>
        {pages.map((_, p) => (
          <View key={p} style={[styles.pageDot, { backgroundColor: p === page ? c.text : c.borderStrong }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: SPACE.lg, rowGap: SPACE.sm },
  swatch: { alignItems: 'center', marginHorizontal: SPACE.xs, maxWidth: 64 },
  dot: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: SPACE.sm },
  pageDot: { width: 6, height: 6, borderRadius: 3 },
});
