import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { ART } from '../theme';

// Logo and pencil mascot (F08: drawn again by the dev as simple SVG after the design images,
// not copied from any icon set). Owned by the company, no attribution needed.

/** Colori logo mark: three overlapping dots (design 01). */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={12} cy={11} r={8} fill={ART.logoRed} opacity={0.95} />
      <Circle cx={20} cy={13} r={8} fill={ART.logoGreen} opacity={0.9} />
      <Circle cx={15} cy={21} r={8} fill={ART.logoPurple} opacity={0.9} />
    </Svg>
  );
}

/**
 * "Bạn Chì" – the pencil mascot (design 01 / 04): standing pencil with a face, waving.
 * Width : height = 0.8.
 */
export function PencilMascot({ height = 96 }: { height?: number }) {
  const width = height * 0.8;
  return (
    <Svg width={width} height={height} viewBox="0 0 80 100">
      <G stroke={ART.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {/* arms */}
        <Path d="M27 52 Q16 48 12 38" fill="none" />
        <Circle cx={11.5} cy={36} r={3} fill={ART.white} />
        <Path d="M53 54 Q64 58 67 66" fill="none" />
        <Circle cx={68} cy={68} r={3} fill={ART.white} />
        {/* eraser + metal band */}
        <Rect x={27} y={6} width={26} height={12} rx={5} fill={ART.eraser} />
        <Rect x={26} y={16} width={28} height={8} rx={2} fill={ART.band} />
        {/* body */}
        <Path d="M27 24 H53 V70 H27 Z" fill={ART.pencil} />
        <Path d="M45 25 V69" stroke={ART.pencilShade} strokeWidth={6} strokeLinecap="butt" />
        <Path d="M27 24 H53 V70 H27 Z" fill="none" />
        {/* wooden tip + lead */}
        <Path d="M27 70 L40 92 L53 70 Z" fill={ART.wood} />
        <Path d="M35.5 84.5 L40 92 L44.5 84.5 Z" fill={ART.ink} />
      </G>
      {/* face */}
      <Circle cx={34.5} cy={40} r={2.6} fill={ART.ink} />
      <Circle cx={45.5} cy={40} r={2.6} fill={ART.ink} />
      <Circle cx={35.3} cy={39.2} r={0.8} fill={ART.white} />
      <Circle cx={46.3} cy={39.2} r={0.8} fill={ART.white} />
      <Ellipse cx={31} cy={47} rx={3} ry={1.8} fill={ART.blush} />
      <Ellipse cx={49} cy={47} rx={3} ry={1.8} fill={ART.blush} />
      <Path d="M36 47 Q40 51.5 44 47" stroke={ART.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
