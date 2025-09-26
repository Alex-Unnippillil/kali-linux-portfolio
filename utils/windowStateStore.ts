import { safeLocalStorage } from './safeStorage';

export interface WindowPreferences {
  alwaysOnTop: boolean;
  workspaceId: number | null;
}

export type WindowPreferencesMap = Record<string, WindowPreferences>;

export const DEFAULT_WINDOW_PREFERENCES: WindowPreferences = Object.freeze({
  alwaysOnTop: false,
  workspaceId: null,
});

const STORAGE_KEY = 'window-preferences';

let loaded = false;
let state: WindowPreferencesMap = {};
const listeners = new Set<(prefs: WindowPreferencesMap) => void>();

function cloneState(map: WindowPreferencesMap) {
  return Object.keys(map).reduce<WindowPreferencesMap>((acc, key) => {
    const value = map[key];
    acc[key] = { ...value };
    return acc;
  }, {});
}

function sanitizePreferences(value: any): WindowPreferences {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_WINDOW_PREFERENCES };
  }
  const alwaysOnTop = Boolean(value.alwaysOnTop);
  const workspaceId =
    typeof value.workspaceId === 'number' && Number.isFinite(value.workspaceId)
      ? value.workspaceId
      : null;
  return { alwaysOnTop, workspaceId };
}

function loadState() {
  if (loaded) return;
  loaded = true;
  if (!safeLocalStorage) return;
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    const next: WindowPreferencesMap = {};
    Object.keys(parsed).forEach((key) => {
      next[key] = sanitizePreferences(parsed[key]);
    });
    state = next;
  } catch {
    state = {};
  }
}

function persistState() {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore write errors
  }
}

function notifyListeners() {
  const snapshot = cloneState(state);
  listeners.forEach((listener) => listener(snapshot));
}

export function getAllWindowPreferences(): WindowPreferencesMap {
  loadState();
  return cloneState(state);
}

export function getWindowPreferences(windowId: string): WindowPreferences {
  loadState();
  const existing = state[windowId];
  return existing ? { ...existing } : { ...DEFAULT_WINDOW_PREFERENCES };
}

export function setWindowPreferences(
  windowId: string,
  update: Partial<WindowPreferences>,
): WindowPreferences {
  loadState();
  const current = getWindowPreferences(windowId);
  const next: WindowPreferences = {
    ...current,
    ...update,
  };
  state = {
    ...state,
    [windowId]: next,
  };
  persistState();
  notifyListeners();
  return { ...next };
}

export function subscribeToWindowPreferences(
  listener: (prefs: WindowPreferencesMap) => void,
): () => void {
  loadState();
  listeners.add(listener);
  listener(cloneState(state));
  return () => {
    listeners.delete(listener);
  };
}

export function clearWindowPreferences(windowId: string) {
  loadState();
  if (!state[windowId]) return;
  const { [windowId]: _removed, ...rest } = state;
  state = rest;
  persistState();
  notifyListeners();
}

export function resetWindowPreferences() {
  state = {};
  persistState();
  notifyListeners();
}
