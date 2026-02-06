"use client";

export interface QuickSettingsState {
  theme: string;
  accent: string;
}

const STORAGE_KEY = 'quick-settings';
const DEFAULT_STATE: QuickSettingsState = {
  theme: 'default',
  accent: '#1793d1',
};

let hasStorageListener = false;
const listeners = new Set<(state: QuickSettingsState) => void>();

function parseState(raw: string | null): QuickSettingsState {
  if (!raw) return { ...DEFAULT_STATE };
  try {
    const parsed = JSON.parse(raw) as Partial<QuickSettingsState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function readState(): QuickSettingsState {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_STATE };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return parseState(raw);
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function writeState(next: QuickSettingsState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore write errors
  }
}

function emit(state: QuickSettingsState): void {
  listeners.forEach((listener) => {
    listener(state);
  });
}

function ensureStorageListener(): void {
  if (hasStorageListener || typeof window === 'undefined') return;
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    emit(parseState(event.newValue));
  });
  hasStorageListener = true;
}

export function getQuickSettings(): QuickSettingsState {
  return readState();
}

export function setQuickSettings(
  update: Partial<QuickSettingsState>,
): QuickSettingsState {
  const current = readState();
  const next: QuickSettingsState = {
    ...current,
    ...update,
  };
  writeState(next);
  emit(next);
  return next;
}

export function subscribeToQuickSettings(
  listener: (state: QuickSettingsState) => void,
): () => void {
  ensureStorageListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetQuickSettings(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore remove errors
  }
  emit({ ...DEFAULT_STATE });
}
