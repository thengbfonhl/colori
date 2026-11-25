import type { MessageKey } from '../i18n';

// Avatars of the child's profile (S09, A33): 6 animal faces drawn by the dev as SVG
// (src/components/avatars.tsx). Only the id is saved in settings.
export const AVATAR_IDS = ['cat', 'bear', 'rabbit', 'fox', 'dino', 'whale'] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export const DEFAULT_AVATAR: AvatarId = 'cat';

/** Animal name, used in "Bé Mèo" (A31: no child name, only the avatar). */
export const AVATAR_NAME: Record<AvatarId, MessageKey> = {
  cat: 'avatar.cat',
  bear: 'avatar.bear',
  rabbit: 'avatar.rabbit',
  fox: 'avatar.fox',
  dino: 'avatar.dino',
  whale: 'avatar.whale',
};

export const isAvatarId = (v: unknown): v is AvatarId => typeof v === 'string' && (AVATAR_IDS as readonly string[]).includes(v);
