export type ChaosFault = 'timeout' | 'partialData' | 'corruptChunk';

export type ChaosAppState = Record<ChaosFault, boolean>;

const DEFAULT_STATE: ChaosAppState = {
  timeout: false,
  partialData: false,
  corruptChunk: false,
};

const isDevRuntime = process.env.NODE_ENV !== 'production';

type ChaosSnapshot = Record<string, ChaosAppState>;

let state: ChaosSnapshot = {};
const listeners = new Set<() => void>();

const cloneState = (): ChaosSnapshot =>
  Object.fromEntries(
    Object.entries(state).map(([key, value]) => [key, { ...DEFAULT_STATE, ...value }]),
  );

const ensureApp = (appId: string): ChaosAppState => {
  if (!state[appId]) {
    state = { ...state, [appId]: { ...DEFAULT_STATE } };
  }
  return state[appId];
};

const notify = () => {
  listeners.forEach((listener) => listener());
};

const devGuard = <T extends (...args: any[]) => any>(fn: T): T => {
  if (!isDevRuntime) {
    return ((...args: any[]) => {
      void args;
      return undefined;
    }) as unknown as T;
  }
  return fn;
};

const subscribe = (listener: () => void) => {
  if (!isDevRuntime) {
    return () => {};
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = (): ChaosSnapshot => {
  if (!isDevRuntime) return {};
  return state;
};

const isEnabled = (appId: string, fault: ChaosFault): boolean => {
  if (!isDevRuntime) return false;
  return !!state[appId]?.[fault];
};

const setFault = devGuard((appId: string, fault: ChaosFault, value: boolean) => {
  const appState = ensureApp(appId);
  if (appState[fault] === value) return;
  state = { ...state, [appId]: { ...appState, [fault]: value } };
  notify();
});

const toggleFault = devGuard((appId: string, fault: ChaosFault) => {
  const appState = ensureApp(appId);
  setFault(appId, fault, !appState[fault]);
});

const resetApp = devGuard((appId?: string) => {
  if (!appId) {
    state = {};
  } else if (state[appId]) {
    const { [appId]: _removed, ...rest } = state;
    state = rest;
  }
  notify();
});

const getAppState = (appId: string): ChaosAppState => {
  if (!isDevRuntime) return { ...DEFAULT_STATE };
  return { ...DEFAULT_STATE, ...(state[appId] ?? {}) };
};

const getState = (): ChaosSnapshot => {
  if (!isDevRuntime) return {};
  return cloneState();
};

const chaosState = {
  isDev: isDevRuntime,
  subscribe,
  getSnapshot,
  isEnabled,
  setFault,
  toggleFault,
  resetApp,
  getAppState,
  getState,
  faults: Object.keys(DEFAULT_STATE) as ChaosFault[],
};

if (typeof window !== 'undefined' && isDevRuntime) {
  (window as any).__CHAOS_STATE__ = chaosState;
}

export default chaosState;
