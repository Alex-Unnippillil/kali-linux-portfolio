"use client";

import { useCallback, useMemo } from 'react';
import { useSyncExternalStore } from 'react';
import chaosState, { type ChaosAppState, type ChaosFault } from '../lib/dev/chaosState';

const EMPTY_STATE: ChaosAppState = {
  timeout: false,
  partialData: false,
  corruptChunk: false,
};

export interface UseChaosResult {
  faults: ChaosAppState;
  isEnabled: (fault: ChaosFault) => boolean;
  setFault: (fault: ChaosFault, value: boolean) => void;
  toggleFault: (fault: ChaosFault) => void;
  reset: () => void;
  isDev: boolean;
}

export default function useChaos(appId: string): UseChaosResult {
  const snapshot = useSyncExternalStore(
    chaosState.subscribe,
    chaosState.getSnapshot,
    chaosState.getSnapshot,
  );

  const faults = snapshot[appId] ?? EMPTY_STATE;

  const isEnabled = useCallback(
    (fault: ChaosFault) => chaosState.isEnabled(appId, fault),
    [appId],
  );

  const setFault = useCallback(
    (fault: ChaosFault, value: boolean) => chaosState.setFault(appId, fault, value),
    [appId],
  );

  const toggleFault = useCallback(
    (fault: ChaosFault) => chaosState.toggleFault(appId, fault),
    [appId],
  );

  const reset = useCallback(() => chaosState.resetApp(appId), [appId]);

  return useMemo(
    () => ({
      faults: { ...EMPTY_STATE, ...faults },
      isEnabled,
      setFault,
      toggleFault,
      reset,
      isDev: chaosState.isDev,
    }),
    [faults, isEnabled, reset, setFault, toggleFault],
  );
}
