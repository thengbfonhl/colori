import { streakDays } from '../../lib/format';
import type { Work } from '../../store/worksReducer';

// Gallery lists and stats (S07). Pure functions, unit tested.

export type GalleryTab = 'done' | 'progress' | 'favorite';

/**
 * Works of a gallery tab, colouring works and free drawings together (S07):
 * - done: finished, most recently finished first;
 * - progress: not finished, most recently worked on first;
 * - favorite: ♡ ones, most recently worked on first.
 */
export function galleryList(works: Record<string, Work>, tab: GalleryTab): Work[] {
  const all = Object.values(works);
  switch (tab) {
    case 'done':
      return all
        .filter((w) => w.status === 'done')
        .sort((a, b) => (b.completedAt ?? b.updatedAt) - (a.completedAt ?? a.updatedAt));
    case 'progress':
      return all.filter((w) => w.status === 'in_progress').sort((a, b) => b.updatedAt - a.updatedAt);
    case 'favorite':
      return all.filter((w) => w.favorite).sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export type GalleryStats = {
  /** "Tranh hoàn thành": finished works (colouring + free drawings). */
  done: number;
  /** "Thời gian sáng tạo": time spent on every work still in the gallery. */
  timeMs: number;
  /** "Chuỗi liên tiếp": consecutive active days up to today (see streakDays). */
  streak: number;
};

export function galleryStats(works: Record<string, Work>, activeDays: readonly string[], now: number): GalleryStats {
  let done = 0;
  let timeMs = 0;
  for (const w of Object.values(works)) {
    if (w.status === 'done') done++;
    timeMs += w.timeSpentMs;
  }
  return { done, timeMs, streak: streakDays(activeDays, now) };
}
