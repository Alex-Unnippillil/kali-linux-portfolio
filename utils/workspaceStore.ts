import { safeLocalStorage } from './safeStorage';

const STORAGE_KEY = 'workspace:recent-queries';
const MAX_RECENTS = 8;

type RecentsMap = Record<number, string[]>;

export interface WorkspaceStoreState {
  activeWorkspace: number;
  recents: RecentsMap;
}

type Listener = (state: WorkspaceStoreState) => void;

const readRecents = (): RecentsMap => {
  if (!safeLocalStorage) return {};
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const entries = Object.entries(parsed as Record<string, unknown>);
    const result: RecentsMap = {};
    for (const [key, value] of entries) {
      if (!Array.isArray(value)) continue;
      const filtered = value.filter(
        (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
      );
      if (filtered.length === 0) continue;
      const numeric = Number(key);
      if (!Number.isNaN(numeric) && numeric >= 0) {
        result[numeric] = filtered.slice(0, MAX_RECENTS);
      }
    }
    return result;
  } catch {
    return {};
  }
};

let state: WorkspaceStoreState = {
  activeWorkspace: 0,
  recents: readRecents(),
};

const listeners = new Set<Listener>();

const snapshot = (): WorkspaceStoreState => ({
  activeWorkspace: state.activeWorkspace,
  recents: { ...state.recents },
});

const persistRecents = () => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(state.recents));
  } catch {
    // ignore storage failures
  }
};

const notify = () => {
  const current = snapshot();
  listeners.forEach((listener) => listener(current));
};

const setActiveWorkspace = (workspaceId: number) => {
  if (!Number.isInteger(workspaceId) || workspaceId < 0) return;
  if (state.activeWorkspace === workspaceId) return;
  state = { ...state, activeWorkspace: workspaceId };
  notify();
};

const addRecentQuery = (query: string): string[] => {
  const trimmed = query.trim();
  if (!trimmed) return getRecentQueries(state.activeWorkspace);
  const key = state.activeWorkspace;
  const current = state.recents[key] ?? [];
  const next = [trimmed, ...current.filter((entry) => entry !== trimmed)].slice(0, MAX_RECENTS);
  const unchanged =
    next.length === current.length && next.every((entry, index) => entry === current[index]);
  if (unchanged) return next;
  state = {
    ...state,
    recents: {
      ...state.recents,
      [key]: next,
    },
  };
  persistRecents();
  notify();
  return next;
};

const getRecentQueries = (workspaceId: number): string[] => state.recents[workspaceId] ?? [];

const subscribe = (listener: Listener) => {
  listeners.add(listener);
  listener(snapshot());
  return () => {
    listeners.delete(listener);
  };
};

const getState = (): WorkspaceStoreState => snapshot();

const resetStore = () => {
  state = { activeWorkspace: 0, recents: {} };
  if (safeLocalStorage) {
    try {
      safeLocalStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  notify();
};

declare global {
  interface Window {
    __workspaceStoreRequested?: boolean;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('workspace-state', (event: Event) => {
    const detail = (event as CustomEvent<{ activeWorkspace?: number }>).detail;
    if (detail && typeof detail.activeWorkspace === 'number') {
      setActiveWorkspace(detail.activeWorkspace);
    }
  });
  if (!window.__workspaceStoreRequested) {
    window.__workspaceStoreRequested = true;
    window.dispatchEvent(new CustomEvent('workspace-request'));
  }
}

const workspaceStore = {
  subscribe,
  getState,
  setActiveWorkspace,
  addRecentQuery,
  getRecentQueries,
};

export { resetStore as resetWorkspaceStoreForTests, getRecentQueries, addRecentQuery, getState, setActiveWorkspace, subscribe };

export default workspaceStore;
