import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ParentalGateSheet, type GateReason } from './ParentalGateSheet';
import { initialLock, type GateLock } from './question';

export type { GateReason };

type Gate = {
  /**
   * Shows the parental gate (F05). Resolves true when the parent answered right, false when
   * cancelled (Huỷ, drag down, tap outside, Android back) or after 3 wrong answers.
   * Every action asks again: the result is never remembered.
   */
  requireParent: (reason: GateReason) => Promise<boolean>;
};

const GateContext = createContext<Gate | null>(null);

export function ParentalGateProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<{ reason: GateReason; key: number } | null>(null);
  /** Resolver of the gate being shown; null when closed. */
  const pending = useRef<((ok: boolean) => void) | null>(null);
  // 3 wrong answers lock the gate for 30 s, also across closing / opening it (F05).
  const lockState = useRef<GateLock>(initialLock());
  const lock = useMemo(() => ({ get: () => lockState.current, set: (l: GateLock) => (lockState.current = l) }), []);

  const requireParent = useCallback(
    (reason: GateReason) =>
      new Promise<boolean>((resolve) => {
        if (pending.current) {
          resolve(false); // already asking (double tap)
          return;
        }
        pending.current = resolve;
        setOpen({ reason, key: Date.now() });
      }),
    [],
  );

  const onDone = useCallback((passed: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setOpen(null);
    // Resolve after the sheet is gone, so a share sheet / dialog opened next is not hidden by it.
    if (resolve) setTimeout(() => resolve(passed), 250);
  }, []);

  const value = useMemo(() => ({ requireParent }), [requireParent]);
  return (
    <GateContext.Provider value={value}>
      {children}
      {open && <ParentalGateSheet key={open.key} reason={open.reason} lock={lock} onDone={onDone} />}
    </GateContext.Provider>
  );
}

export function useParentalGate(): Gate {
  const gate = useContext(GateContext);
  if (!gate) throw new Error('useParentalGate must be used inside <ParentalGateProvider>');
  return gate;
}
