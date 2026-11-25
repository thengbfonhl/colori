import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { KIDS_PALETTE } from '../theme';

// Light confetti for S05 (design 07), made with Reanimated only (no extra library).
// Falls once, then stays out of sight. Pieces never take touches.

const COUNT = 26;
/** Bright palette colours (same in light and dark mode). */
const COLORS = [KIDS_PALETTE[0], KIDS_PALETTE[2], KIDS_PALETTE[4], KIDS_PALETTE[6], KIDS_PALETTE[7], KIDS_PALETTE[8], KIDS_PALETTE[13]];

type Piece = { x: number; w: number; h: number; color: string; delay: number; duration: number; drift: number; spin: number; round: boolean };

function makePieces(width: number): Piece[] {
  // Deterministic spread (no Math.random in render): evenly across the width with jitter.
  return Array.from({ length: COUNT }, (_, i) => {
    const j = (k: number) => ((Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1 + 1) % 1;
    return {
      x: (i / COUNT) * width + j(1) * (width / COUNT),
      w: 6 + j(2) * 6,
      h: 10 + j(3) * 8,
      color: COLORS[i % COLORS.length],
      delay: j(4) * 900,
      duration: 2200 + j(5) * 1400,
      drift: (j(6) - 0.5) * 80,
      spin: (j(7) - 0.5) * 900,
      round: i % 4 === 0,
    };
  });
}

function ConfettiPiece({ piece, height }: { piece: Piece; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(piece.delay, withTiming(1, { duration: piece.duration, easing: Easing.in(Easing.quad) }));
  }, [t, piece]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1,
    transform: [
      { translateY: -40 + t.value * (height + 80) },
      { translateX: Math.sin(t.value * Math.PI * 2) * piece.drift },
      { rotate: `${t.value * piece.spin}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.piece,
        { left: piece.x, width: piece.w, height: piece.round ? piece.w : piece.h, borderRadius: piece.round ? piece.w / 2 : 2, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

export function Confetti() {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo(() => makePieces(width), [width]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: 'absolute', top: 0 },
});
