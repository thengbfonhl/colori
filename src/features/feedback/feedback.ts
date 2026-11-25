import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { useSettings } from '../../store/settings';
import { monitoring } from '../analytics';

// Sounds and haptics (F09). The three sounds are synthesised by the dev
// (scripts/build-sounds.mjs, A27). Background music: v1.1 (FEATURES.music).
//
// - Loaded once when the app opens (initSounds), played without blocking the UI.
// - Each sound has one player: playing it again restarts it, so fast taps never stack up
//   into a distorted noise.
// - iOS silent switch is respected (playsInSilentMode: false); other apps' music keeps playing.
// - "Âm thanh khi tô" off (settings.sound): no sound, haptics stay.

const SOURCES = {
  pop: require('../../../assets/sounds/pop.wav'),
  tada: require('../../../assets/sounds/tada.wav'),
  tick: require('../../../assets/sounds/tick.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

let players: Partial<Record<SoundName, AudioPlayer>> | null = null;

/** Prepares the players (root layout, once). Never throws: the app works without sound. */
export function initSounds(): void {
  if (players) return;
  players = {};
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  for (const name of Object.keys(SOURCES) as SoundName[]) {
    try {
      players[name] = createAudioPlayer(SOURCES[name]);
    } catch (e) {
      // No sound for this one; the app works the same.
      monitoring.reportError(e, `sound_${name}`);
    }
  }
}

function play(name: SoundName): void {
  const p = players?.[name];
  if (!p) return;
  try {
    p.seekTo(0).catch(() => {});
    p.play();
  } catch {
    // ignore: a sound must never break colouring
  }
}

const haptic = (fn: () => Promise<void>) => {
  fn().catch(() => {});
};

/** Feedback for the events of F09, following the "Âm thanh khi tô" setting. */
export function useFeedback() {
  const { sound } = useSettings();
  return useMemo(
    () => ({
      /** A region is coloured. */
      fill() {
        if (sound) play('pop');
        haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
      },
      /** A picture is finished (S05). */
      complete() {
        if (sound) play('tada');
        haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      },
      /** Main buttons (optional in F09): S05 / S08 main actions. */
      tap() {
        if (sound) play('tick');
      },
      /** Wrong parental gate answer: haptic only. */
      wrong() {
        haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
      },
    }),
    [sound],
  );
}
