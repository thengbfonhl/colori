import { useColorScheme } from 'react-native';

// Design tokens for Colori. Light values were measured from the design images in
// docs/assets/design (D12: 80–90% match is enough). Dark values are derived by the dev (D13):
// warm dark background (not pure black), cards one step lighter, brighter terracotta.
//
// Rules:
// - Components never hard-code colours, they use these tokens.
// - The colouring paper, artwork thumbnails and gallery images are ALWAYS white (`paper`),
//   in both modes, shown inside a card with a border.
// - The 48 kids colours (`KIDS_PALETTE`) are the same in both modes: a picture coloured in
//   dark mode must look the same as in light mode.

const light = {
  bg: '#F6F3EB', // cream screen background
  surface: '#FFFFFF', // cards, tab bar, bottom sheets
  surfaceAlt: '#EDE8DD', // segmented control track, unselected tool buttons
  text: '#292935',
  textMuted: '#6A676F',
  border: '#EBE9E3',
  borderStrong: '#DFD8C8',

  // Design measures #B05642, which is 4.45:1 on bg; darkened a touch to reach 4.5:1 for small text.
  primary: '#AD5440', // terracotta: "Tô ngay", "Bắt đầu tô màu", active tab
  onPrimary: '#FFFFFF',
  /** Dark chip: selected tool, check badge, selected card outline. */
  inverse: '#292935',
  onInverse: '#FFFFFF',

  success: '#5E9773', // switch on, progress on green cards
  danger: '#C0473A', // "Xoá"
  star: '#E8C265',
  switchOff: '#CEC8BC',
  /** Behind modals / parental gate sheet. */
  scrim: 'rgba(41, 41, 53, 0.45)',

  // Accent pairs: `x` for strong marks (progress, radio, dots), `xSoft` for card backgrounds.
  mint: '#83BCA3',
  mintSoft: '#EDF5F1',
  green: '#5E9773',
  greenSoft: '#E5F1E7',
  blue: '#7BA5D4',
  blueSoft: '#E7F2F9',
  lavender: '#9F8DC0',
  lavenderSoft: '#EFECF6',
  peach: '#E6B38B',
  peachSoft: '#FAF1E4',
  pink: '#E3ABC2',
  pinkSoft: '#F3EAF2',
  roseSoft: '#F5E4DF', // "Xe cộ" card (design 04)
  yellowSoft: '#FBF3DC',

  /** Colouring paper. Always white, in both modes. */
  paper: '#FFFFFF',
  /** Line art ink. */
  ink: '#1F1F27',
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#1C1A17',
  surface: '#27241F',
  surfaceAlt: '#332F29',
  text: '#F3EFE6',
  textMuted: '#B4AEA4',
  border: '#38332C',
  borderStrong: '#4A443B',

  primary: '#E08A72',
  onPrimary: '#1C1A17',
  inverse: '#F3EFE6',
  onInverse: '#1C1A17',

  success: '#7DB892',
  danger: '#EE8577',
  star: '#F0CC70',
  switchOff: '#5A544A',
  scrim: 'rgba(0, 0, 0, 0.6)',

  mint: '#8FCAB0',
  mintSoft: '#1F2E28',
  green: '#7DB892',
  greenSoft: '#1F2E24',
  blue: '#8FB5E2',
  blueSoft: '#1D2934',
  lavender: '#B5A4D8',
  lavenderSoft: '#292538',
  peach: '#E9BC97',
  peachSoft: '#33291F',
  pink: '#E8B6CA',
  pinkSoft: '#352530',
  roseSoft: '#36261F',
  yellowSoft: '#332E1C',

  paper: '#FFFFFF',
  ink: '#1F1F27',
};

export const THEMES = { light, dark } as const;

/** Kids colours, identical in light and dark mode. Page 1 = the 12 colours of design 06. */
export const KIDS_PALETTE = [
  '#CC7662', // red clay
  '#E6B38B', // peach
  '#EFD684', // yellow
  '#A0CC92', // light green
  '#83BCA3', // mint
  '#AACEE7', // sky blue
  '#6D90E7', // blue
  '#B29FDB', // lavender
  '#E3ABC2', // pink
  '#AE8669', // brown
  '#FFFFFF', // white
  '#292935', // near black
  // Page 2 (added 16/11 at the user's request): brighter / deeper colours.
  '#E8483B', // red
  '#F5862A', // orange
  '#F7C531', // sunflower
  '#6CC04A', // grass green
  '#2E9D5B', // green
  '#1FA9A3', // teal
  '#43B6E8', // cyan
  '#2F5DB8', // royal blue
  '#7B4FC2', // purple
  '#E0559A', // magenta
  '#F4D1B0', // skin
  '#9B9BA3', // gray
  // Page 3 (added 25/11 at the user's request): extra bright and pastel colours.
  '#FF7F6E', // coral
  '#FFB347', // mango
  '#FFE45C', // lemon
  '#B7DD3F', // lime
  '#3FD18A', // spring green
  '#5ED6D0', // aqua
  '#3F51B5', // indigo
  '#A86CE0', // violet
  '#FF6FB5', // hot pink
  '#FFC2D1', // baby pink
  '#FFF3C4', // cream
  '#CFE6FF', // baby blue
  // Page 4 (added 25/11): deep / dark colours.
  '#9E2A2B', // maroon
  '#C4561D', // burnt orange
  '#C99A1E', // mustard
  '#7A8B2E', // olive
  '#1F6B3A', // forest green
  '#146C6C', // dark teal
  '#1E2F6B', // navy
  '#4B2A7B', // deep purple
  '#8E2A5E', // plum
  '#6B4226', // chocolate
  '#C98E5F', // tan
  '#5C5C66', // charcoal
] as const;

/**
 * Illustration colours (logo, pencil mascot, avatars: drawn by the dev, A33). Same in light and
 * dark mode, like the artworks: they are always drawn on their own white / soft card.
 */
export const ART = {
  ink: '#292935',
  white: '#FFFFFF',
  // Logo: three overlapping dots (design 01)
  logoRed: '#CC7662',
  logoGreen: '#83BCA3',
  logoPurple: '#B29FDB',
  // Pencil mascot (design 01, 04)
  pencil: '#C9654F',
  pencilShade: '#A9503D',
  eraser: '#E3ABC2',
  band: '#C9C3B6',
  wood: '#F2D3AE',
  blush: '#EFA9A0',
  // Avatars
  catFur: '#E6B38B',
  bearFur: '#AE8669',
  muzzle: '#F4D1B0',
  rabbitFur: '#F4F1EC',
  pinkInner: '#E3ABC2',
  foxFur: '#E58A4E',
  dinoSkin: '#A0CC92',
  dinoSpike: '#6CC04A',
  whaleSkin: '#AACEE7',
  water: '#6D90E7',
} as const;

/** Colours per palette page (2 rows × 6, design 06). */
export const PALETTE_PAGE_SIZE = 12;

// Be Vietnam Pro (SIL OFL 1.1, assets/fonts). React Native picks a custom font by family
// name, not by fontWeight, so each weight is its own family.
export const FONT = {
  regular: 'BeVietnamPro-Regular',
  medium: 'BeVietnamPro-Medium',
  semibold: 'BeVietnamPro-SemiBold',
  bold: 'BeVietnamPro-Bold',
  extrabold: 'BeVietnamPro-ExtraBold',
} as const;

/** Text styles (sizes measured from the design at phone width). */
export const TYPE = {
  display: { fontFamily: FONT.bold, fontSize: 26, lineHeight: 34 }, // "Bộ sưu tập", "Bé bao nhiêu tuổi?"
  title: { fontFamily: FONT.bold, fontSize: 22, lineHeight: 30 }, // "Hôm nay tô gì nhỉ?"
  heading: { fontFamily: FONT.bold, fontSize: 17, lineHeight: 24 }, // section titles
  body: { fontFamily: FONT.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: FONT.semibold, fontSize: 15, lineHeight: 22 },
  button: { fontFamily: FONT.bold, fontSize: 16, lineHeight: 22 },
  caption: { fontFamily: FONT.regular, fontSize: 13, lineHeight: 18 },
  tab: { fontFamily: FONT.semibold, fontSize: 11, lineHeight: 14 },
} as const;

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const RADIUS = { sm: 10, md: 16, lg: 20, xl: 28, pill: 999 } as const;
/** Kids tap with fingers: every button is at least this tall (F08). */
export const MIN_TOUCH = 48;

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
