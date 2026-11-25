import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { AvatarId } from '../data/avatars';
import type { ArtworkLevel } from '../data/types';
import { detectLanguage, translate, type Language, type MessageKey, type TranslateParams } from '../i18n';
import { defaultSettings, settingsReducer, type Settings } from './settingsReducer';

const STORAGE_KEY = 'colori:settings:v1';
const SAVE_DEBOUNCE_MS = 300;

type SettingsStore = Settings & {
  /** False until saved settings are loaded; the root layout keeps the splash until then. */
  ready: boolean;
  setLanguage: (language: Language) => void;
  setNoOverflow: (value: boolean) => void;
  setSound: (value: boolean) => void;
  setAgeBand: (ageBand: ArtworkLevel) => void;
  setAvatar: (avatar: AvatarId) => void;
  finishOnboarding: (ageBand: ArtworkLevel) => void;
  t: (key: MessageKey, params?: TranslateParams) => string;
};

const SettingsContext = createContext<SettingsStore | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(settingsReducer, undefined, () => defaultSettings(detectLanguage()));
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) dispatch({ type: 'hydrate', saved: JSON.parse(json) as unknown });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Save after changes, debounced (F08).
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, ready]);

  const setLanguage = useCallback((language: Language) => dispatch({ type: 'setLanguage', language }), []);
  const setNoOverflow = useCallback((value: boolean) => dispatch({ type: 'setNoOverflow', value }), []);
  const setSound = useCallback((value: boolean) => dispatch({ type: 'setSound', value }), []);
  const setAgeBand = useCallback((ageBand: ArtworkLevel) => dispatch({ type: 'setAgeBand', ageBand }), []);
  const setAvatar = useCallback((avatar: AvatarId) => dispatch({ type: 'setAvatar', avatar }), []);
  const finishOnboarding = useCallback((ageBand: ArtworkLevel) => dispatch({ type: 'finishOnboarding', ageBand }), []);

  const value = useMemo<SettingsStore>(
    () => ({
      ...state,
      ready,
      setLanguage,
      setNoOverflow,
      setSound,
      setAgeBand,
      setAvatar,
      finishOnboarding,
      t: (key, params) => translate(state.language, key, params),
    }),
    [state, ready, setLanguage, setNoOverflow, setSound, setAgeBand, setAvatar, finishOnboarding],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsStore {
  const store = useContext(SettingsContext);
  if (!store) throw new Error('useSettings must be used inside <SettingsProvider>');
  return store;
}
