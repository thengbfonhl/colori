import type { CategoryId } from '../../data/categories';
import type { Artwork, ArtworkLevel } from '../../data/types';
import type { Work } from '../../store/worksReducer';

// Choices of the Home (S02) and the category list (S03). Pure functions, unit tested.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Number of the local calendar day (same all day long, +1 at local midnight). */
export function localDayNumber(now: number): number {
  const d = new Date(now);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);
}

const byOrder = (a: Artwork, b: Artwork) => a.order - b.order;

/**
 * "Tranh của ngày" (S02): fixed for the whole day, changes the next day, offline.
 * Only artworks of the child's age group (A34); all artworks if that group has none.
 */
export function dailyArtwork(artworks: readonly Artwork[], ageBand: ArtworkLevel, now: number): Artwork | null {
  const kids = artworks.filter((a) => a.audience === 'kids');
  const fit = kids.filter((a) => a.level === ageBand).sort(byOrder);
  const list = fit.length > 0 ? fit : [...kids].sort(byOrder);
  if (list.length === 0) return null;
  return list[localDayNumber(now) % list.length];
}

/** Max cards in "Tiếp tục tô màu" (S02). */
export const CONTINUE_MAX = 10;

/**
 * "Tiếp tục tô màu" (S02): colouring works not finished yet, most recent first, max 10.
 * Free drawings are not shown here: they have their own tab (S06).
 */
export function continueWorks(works: Record<string, Work>, exists: (artworkId: string) => boolean): Work[] {
  return Object.values(works)
    .filter((w) => w.kind === 'coloring' && w.status === 'in_progress' && w.artworkId !== null && exists(w.artworkId))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, CONTINUE_MAX);
}

/** S03: every artwork of the category, the child's age group first, then manifest order (A34). */
export function categoryArtworks(artworks: readonly Artwork[], category: CategoryId, ageBand: ArtworkLevel): Artwork[] {
  return artworks
    .filter((a) => a.category === category && a.audience === 'kids')
    .sort((a, b) => Number(b.level === ageBand) - Number(a.level === ageBand) || byOrder(a, b));
}

/**
 * Picture of an age card in S01 (D12: line-art from the picture set): an easy sea animal
 * (the whale of design 02) for 3–6, an animal for 7–12; else the first picture of that level.
 */
export function agePicture(artworks: readonly Artwork[], level: ArtworkLevel): Artwork | null {
  const prefer: CategoryId = level === 'easy' ? 'sea' : 'animals';
  const ofLevel = artworks.filter((a) => a.level === level && a.audience === 'kids').sort(byOrder);
  return ofLevel.find((a) => a.category === prefer) ?? ofLevel[0] ?? null;
}
