import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { AvatarId } from '../data/avatars';
import { ART, useTheme } from '../theme';

// The 6 profile avatars (S09, A33): simple animal faces drawn by the dev in a 64×64 box,
// Feather-like round strokes. Owned by the company, no attribution needed.

const S = { stroke: ART.ink, strokeWidth: 2.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function Eyes({ y = 34, dx = 9, cx = 32 }: { y?: number; dx?: number; cx?: number }) {
  return (
    <>
      <Circle cx={cx - dx} cy={y} r={2.6} fill={ART.ink} />
      <Circle cx={cx + dx} cy={y} r={2.6} fill={ART.ink} />
      <Circle cx={cx - dx + 0.9} cy={y - 0.9} r={0.8} fill={ART.white} />
      <Circle cx={cx + dx + 0.9} cy={y - 0.9} r={0.8} fill={ART.white} />
    </>
  );
}

function Cheeks({ y = 41, dx = 14 }: { y?: number; dx?: number }) {
  return (
    <>
      <Ellipse cx={32 - dx} cy={y} rx={3.2} ry={2} fill={ART.blush} />
      <Ellipse cx={32 + dx} cy={y} rx={3.2} ry={2} fill={ART.blush} />
    </>
  );
}

const Smile = ({ y = 42 }: { y?: number }) => <Path d={`M28 ${y} Q32 ${y + 4} 36 ${y}`} {...S} strokeWidth={2} fill="none" />;

function Cat() {
  return (
    <G>
      <Path d="M12 26 L14 8 L27 18 Z" fill={ART.catFur} {...S} />
      <Path d="M52 26 L50 8 L37 18 Z" fill={ART.catFur} {...S} />
      <Ellipse cx={32} cy={36} rx={22} ry={19} fill={ART.catFur} {...S} />
      <Path d="M16 13 L23 18 M48 13 L41 18" {...S} strokeWidth={1.6} stroke={ART.pinkInner} />
      <Eyes />
      <Cheeks />
      <Path d="M30 38.5 L34 38.5 L32 40.5 Z" fill={ART.pinkInner} {...S} strokeWidth={1.4} />
      <Path d="M32 40.5 V42 M32 42 Q29 45 27 43 M32 42 Q35 45 37 43" {...S} strokeWidth={1.8} fill="none" />
      <Path d="M6 36 H17 M7 41 L17 39 M58 36 H47 M57 41 L47 39" {...S} strokeWidth={1.4} />
    </G>
  );
}

function Bear() {
  return (
    <G>
      <Circle cx={15} cy={18} r={8} fill={ART.bearFur} {...S} />
      <Circle cx={49} cy={18} r={8} fill={ART.bearFur} {...S} />
      <Circle cx={15} cy={18} r={3.5} fill={ART.muzzle} />
      <Circle cx={49} cy={18} r={3.5} fill={ART.muzzle} />
      <Circle cx={32} cy={35} r={21} fill={ART.bearFur} {...S} />
      <Ellipse cx={32} cy={42} rx={10} ry={7.5} fill={ART.muzzle} {...S} strokeWidth={1.8} />
      <Eyes y={31} />
      <Ellipse cx={32} cy={39.5} rx={3.4} ry={2.4} fill={ART.ink} />
      <Path d="M32 42 V44 M28.5 45 Q32 48 35.5 45" {...S} strokeWidth={1.8} fill="none" />
    </G>
  );
}

function Rabbit() {
  return (
    <G>
      <Ellipse cx={23} cy={15} rx={6} ry={13} fill={ART.rabbitFur} {...S} />
      <Ellipse cx={41} cy={15} rx={6} ry={13} fill={ART.rabbitFur} {...S} />
      <Ellipse cx={23} cy={16} rx={2.6} ry={8} fill={ART.pinkInner} />
      <Ellipse cx={41} cy={16} rx={2.6} ry={8} fill={ART.pinkInner} />
      <Circle cx={32} cy={39} r={19} fill={ART.rabbitFur} {...S} />
      <Eyes y={37} dx={8} />
      <Cheeks y={44} dx={12} />
      <Path d="M30 42 L34 42 L32 44 Z" fill={ART.pinkInner} {...S} strokeWidth={1.4} />
      <Path d="M32 44 V46 M29 47.5 Q32 50 35 47.5" {...S} strokeWidth={1.8} fill="none" />
    </G>
  );
}

function Fox() {
  return (
    <G>
      <Path d="M10 30 L13 7 L27 19 Z" fill={ART.foxFur} {...S} />
      <Path d="M54 30 L51 7 L37 19 Z" fill={ART.foxFur} {...S} />
      <Path d="M14 12 L22 19 M50 12 L42 19" {...S} strokeWidth={1.6} stroke={ART.ink} />
      <Path d="M8 28 Q10 17 32 17 Q54 17 56 28 Q54 44 32 56 Q10 44 8 28 Z" fill={ART.foxFur} {...S} />
      <Path d="M14 36 Q22 34 32 44 Q42 34 50 36 Q46 47 32 56 Q18 47 14 36 Z" fill={ART.white} {...S} strokeWidth={1.8} />
      <Eyes y={31} dx={10} />
      <Ellipse cx={32} cy={47} rx={3.2} ry={2.4} fill={ART.ink} />
    </G>
  );
}

function Dino() {
  return (
    <G>
      <Path d="M20 14 L24 6 L28 13 L32 5 L36 13 L40 6 L44 14" fill={ART.dinoSpike} {...S} />
      <Path d="M10 36 Q10 13 32 13 Q54 13 54 36 Q54 56 32 56 Q10 56 10 36 Z" fill={ART.dinoSkin} {...S} />
      <Eyes y={31} dx={10} />
      <Cheeks y={39} dx={15} />
      <Circle cx={27} cy={42} r={1.2} fill={ART.ink} />
      <Circle cx={37} cy={42} r={1.2} fill={ART.ink} />
      <Path d="M22 46 Q32 53 42 46" {...S} strokeWidth={2} fill="none" />
      <Circle cx={18} cy={22} r={2} fill={ART.dinoSpike} />
      <Circle cx={45} cy={21} r={1.6} fill={ART.dinoSpike} />
    </G>
  );
}

function Whale() {
  return (
    <G>
      <Path d="M32 16 V8 M32 9 Q26 4 22 8 M32 9 Q38 4 42 8" {...S} stroke={ART.water} strokeWidth={2.2} fill="none" />
      <Path d="M8 38 Q8 18 32 18 Q56 18 56 38 Q56 52 32 52 Q8 52 8 38 Z" fill={ART.whaleSkin} {...S} />
      <Path d="M14 44 Q32 54 50 44" {...S} strokeWidth={1.6} fill="none" />
      <Eyes y={33} dx={10} />
      <Cheeks y={39} dx={16} />
      <Smile y={39} />
    </G>
  );
}

const FACES: Record<AvatarId, () => React.JSX.Element> = { cat: Cat, bear: Bear, rabbit: Rabbit, fox: Fox, dino: Dino, whale: Whale };

/** Round avatar on white paper (same look in light and dark mode). */
export function Avatar({ id, size = 48, selected }: { id: AvatarId; size?: number; selected?: boolean }) {
  const c = useTheme();
  const Face = FACES[id];
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: c.paper, borderColor: selected ? c.inverse : c.border },
        selected && styles.selected,
      ]}
    >
      <Svg width={size * 0.8} height={size * 0.8} viewBox="0 0 64 64">
        <Face />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  selected: { borderWidth: 3 },
});
