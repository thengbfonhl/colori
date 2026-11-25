import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { emptyWorks, worksReducer, type Work, type WorksAction } from './worksReducer';

const STORAGE_KEY = 'colori:works:v1';
const SAVE_DEBOUNCE_MS = 300;

type WorksStore = {
  ready: boolean;
  works: Record<string, Work>;
  /** Stars earned (S05 "+1 ngôi sao"; shown in Cá nhân, P5). */
  stars: number;
  /** Local days with activity, for the streak (S07). */
  activeDays: string[];
  /** Whether this artwork already earned its "+1 ngôi sao" (a star is earned only once, F04). */
  starEarned: (artworkId: string) => boolean;
  dispatch: (action: WorksAction) => void;
  /** Writes the index now (used when the app goes to the background). */
  flush: () => void;
};

const WorksContext = createContext<WorksStore | null>(null);

export function WorksProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(worksReducer, undefined, emptyWorks);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((json) => {
        if (json) dispatch({ type: 'hydrate', saved: JSON.parse(json) as unknown });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const write = () => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(latest.current)).catch(() => {});
  };

  useEffect(() => {
    if (!ready) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(write, SAVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, ready]);

  const value = useMemo<WorksStore>(
    () => ({
      ready,
      works: state.works,
      stars: state.stars,
      activeDays: state.activeDays,
      starEarned: (artworkId: string) => latest.current.starred.includes(artworkId),
      dispatch,
      flush: () => {
        if (timer.current) clearTimeout(timer.current);
        write();
      },
    }),
    [ready, state.works, state.stars, state.activeDays],
  );

  return <WorksContext.Provider value={value}>{children}</WorksContext.Provider>;
}

export function useWorks(): WorksStore {
  const store = useContext(WorksContext);
  if (!store) throw new Error('useWorks must be used inside <WorksProvider>');
  return store;
}
