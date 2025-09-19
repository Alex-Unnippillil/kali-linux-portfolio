import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { DependencyProbeResult } from '../lib/dependencyProbes';

export interface BootState {
  checked: boolean;
  result: DependencyProbeResult | null;
}

export interface BootStateContextValue {
  state: BootState;
  setBootState: (
    value: BootState | ((previous: BootState) => BootState),
  ) => void;
}

const defaultState: BootState = {
  checked: false,
  result: null,
};

export const BootStateContext = createContext<BootStateContextValue>({
  state: defaultState,
  setBootState: () => {},
});

export function BootStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BootState>(defaultState);

  const setBootState = useCallback<BootStateContextValue['setBootState']>((value) => {
    setState((previous) => (typeof value === 'function' ? value(previous) : value));
  }, []);

  const contextValue = useMemo<BootStateContextValue>(
    () => ({
      state,
      setBootState,
    }),
    [state, setBootState],
  );

  return <BootStateContext.Provider value={contextValue}>{children}</BootStateContext.Provider>;
}

export function useBootState() {
  return useContext(BootStateContext);
}
