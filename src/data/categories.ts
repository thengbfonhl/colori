import type { MessageKey } from '../i18n';

// Picture categories (docs/content/content-spec.md §1), in display order.
// The pipeline validates sources.csv against the same ids (scripts/lib/sources.mjs,
// a unit test keeps both lists equal).
export const CATEGORY_IDS = ['animals', 'sea', 'vehicles', 'sweets', 'dinosaurs', 'fairytale', 'nature', 'vietnam'] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Theme tokens allowed as a category card background (design 04: soft pastel cards). */
export type CategoryColor =
  | 'peachSoft'
  | 'blueSoft'
  | 'roseSoft'
  | 'pinkSoft'
  | 'greenSoft'
  | 'lavenderSoft'
  | 'mintSoft'
  | 'yellowSoft';

export type Category = {
  id: CategoryId;
  title: MessageKey;
  /** Card background, a token of src/theme.ts (never a hex value). */
  color: CategoryColor;
};

// The icon of a category is a line-art picture from that category (F08), chosen at
// runtime by `categoryIcon()` in catalog.ts, so it follows the content.
export const CATEGORIES: readonly Category[] = [
  { id: 'animals', title: 'category.animals', color: 'peachSoft' },
  { id: 'sea', title: 'category.sea', color: 'blueSoft' },
  { id: 'vehicles', title: 'category.vehicles', color: 'roseSoft' },
  { id: 'sweets', title: 'category.sweets', color: 'pinkSoft' },
  { id: 'dinosaurs', title: 'category.dinosaurs', color: 'greenSoft' },
  { id: 'fairytale', title: 'category.fairytale', color: 'lavenderSoft' },
  { id: 'nature', title: 'category.nature', color: 'mintSoft' },
  { id: 'vietnam', title: 'category.vietnam', color: 'yellowSoft' },
];
