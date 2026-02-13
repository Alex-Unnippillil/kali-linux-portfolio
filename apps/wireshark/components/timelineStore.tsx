import React, {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

export interface TimelineState {
  domain: [number, number];
  window: [number, number];
  brush: [number, number] | null;
}

type Listener = () => void;

type StateUpdater = (state: TimelineState) => TimelineState;

export interface TimelineStore {
  getState: () => TimelineState;
  subscribe: (listener: Listener) => () => void;
  setDomain: (domain: [number, number]) => void;
  setWindow: (window: [number, number]) => void;
  setBrush: (brush: [number, number] | null) => void;
  resetWindow: () => void;
}

const clampWindow = (
  window: [number, number],
  domain: [number, number]
): [number, number] => {
  const [domainStart, domainEnd] = domain;
  if (domainEnd <= domainStart) {
    return [domainStart, domainEnd];
  }
  const start = Math.max(domainStart, Math.min(window[0], domainEnd));
  const end = Math.max(start, Math.min(window[1], domainEnd));
  const epsilon = 1e-9;
  if (end - start < epsilon) {
    return [domainStart, domainEnd];
  }
  return [start, end];
};

const statesEqual = (a: TimelineState, b: TimelineState) =>
  a.domain[0] === b.domain[0] &&
  a.domain[1] === b.domain[1] &&
  a.window[0] === b.window[0] &&
  a.window[1] === b.window[1] &&
  ((a.brush === null && b.brush === null) ||
    (a.brush !== null &&
      b.brush !== null &&
      a.brush[0] === b.brush[0] &&
      a.brush[1] === b.brush[1]));

export const createTimelineStore = (
  initialDomain: [number, number] = [0, 0]
): TimelineStore => {
  let state: TimelineState = {
    domain: initialDomain,
    window: initialDomain,
    brush: null,
  };
  const listeners = new Set<Listener>();

  const setState = (updater: StateUpdater) => {
    const next = updater(state);
    if (statesEqual(next, state)) {
      return;
    }
    state = next;
    listeners.forEach((listener) => listener());
  };

  const store: TimelineStore = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setDomain: (domain) => {
      setState((prev) => {
        const nextWindow = clampWindow(prev.window, domain);
        return {
          ...prev,
          domain,
          window: nextWindow,
        };
      });
    },
    setWindow: (window) => {
      setState((prev) => ({
        ...prev,
        window: clampWindow(window, prev.domain),
      }));
    },
    setBrush: (brush) => {
      setState((prev) => ({
        ...prev,
        brush,
      }));
    },
    resetWindow: () => {
      setState((prev) => ({
        ...prev,
        window: [...prev.domain] as [number, number],
      }));
    },
  };

  return store;
};

const TimelineContext = createContext<TimelineStore | null>(null);

export const TimelineProvider = ({
  store,
  children,
}: {
  store: TimelineStore;
  children: ReactNode;
}) => <TimelineContext.Provider value={store}>{children}</TimelineContext.Provider>;

export const useTimelineSelector = <T,>(selector: (state: TimelineState) => T): T => {
  const store = useContext(TimelineContext);
  if (!store) {
    throw new Error('useTimelineSelector must be used within a TimelineProvider');
  }
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState())
  );
};

export const useTimelineActions = () => {
  const store = useContext(TimelineContext);
  if (!store) {
    throw new Error('useTimelineActions must be used within a TimelineProvider');
  }
  return useMemo(
    () => ({
      setDomain: store.setDomain,
      setWindow: store.setWindow,
      setBrush: store.setBrush,
      resetWindow: store.resetWindow,
      getState: store.getState,
    }),
    [store]
  );
};

