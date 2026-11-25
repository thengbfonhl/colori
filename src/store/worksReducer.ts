// Works = the child's pictures (F04 "Mô hình dữ liệu"). Pure reducer, unit tested.
// P2: colouring works. P3: free drawings. P4: favourites, deletion, stars, active days, schema v2.

import { dayKey } from '../lib/format';

export type WorkKind = 'coloring' | 'free';
export type WorkStatus = 'in_progress' | 'done';

export type Work = {
  /** = artworkId for a colouring work; "draw-<timestamp>" for free drawing (P3). */
  id: string;
  kind: WorkKind;
  artworkId: string | null;
  status: WorkStatus;
  /** 0..1, counted regions only. */
  progress: number;
  /** Region ids that have a non-white colour. */
  filled: number[];
  favorite: boolean;
  /** Only counted while the colouring screen is visible and the app is in the foreground. */
  timeSpentMs: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
};

/**
 * v1 (P2–P3): { schemaVersion: 1, works }.
 * v2 (P4): + stars, starred, activeDays.
 */
export const WORKS_SCHEMA_VERSION = 2;

/** Active days kept for the streak (Q20); older ones are dropped. */
export const MAX_ACTIVE_DAYS = 400;

export type WorksState = {
  schemaVersion: typeof WORKS_SCHEMA_VERSION;
  works: Record<string, Work>;
  /** "+1 ngôi sao" (S05): one per artwork, at its first completion. Free drawings earn none (A23). */
  stars: number;
  /** Artworks that already earned their star. Kept after the work is deleted: a star is earned only once. */
  starred: string[];
  /** Local days ("YYYY-MM-DD", sorted) with colouring or drawing, for the streak in S07 (Q20). */
  activeDays: string[];
};

export const emptyWorks = (): WorksState => ({
  schemaVersion: WORKS_SCHEMA_VERSION,
  works: {},
  stars: 0,
  starred: [],
  activeDays: [],
});

export type WorksAction =
  | { type: 'hydrate'; saved: unknown }
  | { type: 'saveColoring'; artworkId: string; filled: number[]; progress: number; addTimeMs: number; now: number }
  | { type: 'saveFree'; workId: string; addTimeMs: number; now: number }
  | { type: 'complete'; workId: string; now: number }
  | { type: 'setFavorite'; workId: string; favorite: boolean }
  | { type: 'delete'; workId: string };

const FREE_PREFIX = 'draw-';

/** Id of a new free drawing (F04: "draw-<timestamp>"). */
export function newFreeWorkId(now: number): string {
  return `${FREE_PREFIX}${now}`;
}

export function isFreeWorkId(id: string): boolean {
  return /^draw-\d+$/.test(id);
}

/** Free drawings, newest first (S06 "Tranh bé đã vẽ"). */
export function freeWorks(works: Record<string, Work>): Work[] {
  return Object.values(works)
    .filter((w) => w.kind === 'free')
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** True when completing this work now gives "+1 ngôi sao" (S05): first completion of a colouring work. */
export function earnsStar(state: WorksState, workId: string): boolean {
  const w = state.works[workId];
  if (!w || w.kind !== 'coloring' || w.artworkId === null) return false;
  return !state.starred.includes(w.artworkId);
}

function isWork(w: unknown): w is Work {
  if (!w || typeof w !== 'object') return false;
  const o = w as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    (o.kind === 'coloring' || o.kind === 'free') &&
    (o.status === 'in_progress' || o.status === 'done') &&
    typeof o.progress === 'number' &&
    Array.isArray(o.filled) &&
    typeof o.updatedAt === 'number'
  );
}

/** Fills fields that older saved works may lack, so the screens can trust every field. */
function normalizeWork(w: Work): Work {
  return {
    ...w,
    artworkId: w.kind === 'coloring' ? (typeof w.artworkId === 'string' ? w.artworkId : w.id) : null,
    favorite: w.favorite === true,
    timeSpentMs: typeof w.timeSpentMs === 'number' && w.timeSpentMs > 0 ? w.timeSpentMs : 0,
    createdAt: typeof w.createdAt === 'number' ? w.createdAt : w.updatedAt,
    completedAt: typeof w.completedAt === 'number' ? w.completedAt : null,
  };
}

const isDay = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

function withDay(days: string[], day: string): string[] {
  if (days.includes(day)) return days;
  const next = [...days, day].sort();
  return next.length > MAX_ACTIVE_DAYS ? next.slice(next.length - MAX_ACTIVE_DAYS) : next;
}

/**
 * Reads saved data of any version (F04 "Giữ dữ liệu khi cập nhật app"); keeps only valid works so
 * a broken entry never crashes the app.
 * v1 → v2: works that were already done earn their star now; active days come from `updatedAt`.
 */
export function migrateWorks(saved: unknown): WorksState {
  const out = emptyWorks();
  if (!saved || typeof saved !== 'object') return out;
  const s = saved as { schemaVersion?: unknown; works?: unknown; stars?: unknown; starred?: unknown; activeDays?: unknown };
  if (s.works && typeof s.works === 'object') {
    for (const w of Object.values(s.works as Record<string, unknown>)) if (isWork(w)) out.works[w.id] = normalizeWork(w);
  }
  const works = Object.values(out.works);

  if (s.schemaVersion === 2) {
    out.starred = Array.isArray(s.starred) ? [...new Set(s.starred.filter((x): x is string => typeof x === 'string'))] : [];
    out.stars = typeof s.stars === 'number' && s.stars >= 0 ? Math.floor(s.stars) : out.starred.length;
    out.activeDays = Array.isArray(s.activeDays) ? [...new Set(s.activeDays.filter(isDay))].sort().slice(-MAX_ACTIVE_DAYS) : [];
    return out;
  }

  // v1 (or no version): derive the new fields from the works.
  out.starred = works.filter((w) => w.kind === 'coloring' && w.status === 'done').map((w) => w.artworkId as string);
  out.stars = out.starred.length;
  out.activeDays = [...new Set(works.map((w) => dayKey(w.updatedAt)))].sort().slice(-MAX_ACTIVE_DAYS);
  return out;
}

function put(state: WorksState, work: Work, now?: number): WorksState {
  return {
    ...state,
    works: { ...state.works, [work.id]: work },
    activeDays: now === undefined ? state.activeDays : withDay(state.activeDays, dayKey(now)),
  };
}

export function worksReducer(state: WorksState, action: WorksAction): WorksState {
  switch (action.type) {
    case 'hydrate':
      return migrateWorks(action.saved);
    case 'saveColoring': {
      const old = state.works[action.artworkId];
      const work: Work = {
        id: action.artworkId,
        kind: 'coloring',
        artworkId: action.artworkId,
        status: old?.status ?? 'in_progress',
        progress: Math.max(0, Math.min(1, action.progress)),
        filled: [...action.filled].sort((a, b) => a - b),
        favorite: old?.favorite ?? false,
        timeSpentMs: (old?.timeSpentMs ?? 0) + Math.max(0, action.addTimeMs),
        createdAt: old?.createdAt ?? action.now,
        updatedAt: action.now,
        completedAt: old?.completedAt ?? null,
      };
      return put(state, work, action.now);
    }
    case 'saveFree': {
      const old = state.works[action.workId];
      if (old && old.kind !== 'free') return state;
      const work: Work = {
        id: action.workId,
        kind: 'free',
        artworkId: null,
        status: old?.status ?? 'in_progress',
        progress: 0, // no progress in free drawing (S06)
        filled: [],
        favorite: old?.favorite ?? false,
        timeSpentMs: (old?.timeSpentMs ?? 0) + Math.max(0, action.addTimeMs),
        createdAt: old?.createdAt ?? action.now,
        updatedAt: action.now,
        completedAt: old?.completedAt ?? null,
      };
      return put(state, work, action.now);
    }
    case 'complete': {
      const old = state.works[action.workId];
      if (!old || old.status === 'done') return state;
      const star = earnsStar(state, action.workId);
      const work: Work = { ...old, status: 'done', completedAt: action.now, updatedAt: action.now };
      const next = put(state, work, action.now);
      return star ? { ...next, stars: state.stars + 1, starred: [...state.starred, old.artworkId as string] } : next;
    }
    case 'setFavorite': {
      const old = state.works[action.workId];
      if (!old || old.favorite === action.favorite) return state;
      // updatedAt is not changed: liking a picture is not working on it.
      return put(state, { ...old, favorite: action.favorite });
    }
    case 'delete': {
      if (!state.works[action.workId]) return state;
      const works = { ...state.works };
      delete works[action.workId];
      return { ...state, works };
    }
  }
}
