import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

// Tool icons that Feather does not have (F08 "Icon"): drawn by us, Feather-like style
// (24×24, 2 px round strokes). Owned by the company, no attribution needed.

type IconProps = { size?: number; color: string };

/** Paint bucket pouring a drop ("Tô màu"). */
export function BucketIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 9h11l-1.6 10.2a1 1 0 0 1-1 .8H7.6a1 1 0 0 1-1-.8L5 9z" />
      <Path d="M6.5 9c0-3 1.8-5 4-5s4 2 4 5" />
      <Path d="M16 9c2.2 0 3.5 1.2 3.5 3.5" />
      <Circle cx={19.5} cy={16.5} r={1.5} />
    </Svg>
  );
}

/** Eraser block ("Cục tẩy"). */
export function EraserIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3.7 15.3 13.3 5.7a1.5 1.5 0 0 1 2.1 0l3.9 3.9a1.5 1.5 0 0 1 0 2.1L11 20H8.4a1.5 1.5 0 0 1-1-.4l-3.7-3.7a.4.4 0 0 1 0-.6z" />
      <Path d="M8.5 10.5l6 6" />
      <Path d="M11 20h9" />
    </Svg>
  );
}

/** Filled five-point star ("+1 ngôi sao", S05). Geometry computed, not copied from an icon set. */
export function StarIcon({ size = 24, color, stroke }: IconProps & { stroke?: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 10 : 4.4;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(12 + r * Math.cos(a)).toFixed(2)} ${(12.6 + r * Math.sin(a)).toFixed(2)}`);
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={`M${pts.join(' L')} Z`} fill={color} stroke={stroke ?? color} strokeWidth={1.2} strokeLinejoin="round" />
    </Svg>
  );
}
