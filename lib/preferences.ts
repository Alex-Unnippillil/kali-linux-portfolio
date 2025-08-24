export type Preferences = {
  theme: 'light' | 'dark';
  language: string;
  units: 'metric' | 'imperial';
  dataSaving: boolean;
};

export const defaultPreferences: Preferences = {
  theme: 'light',
  language: 'en-US',
  units: 'metric',
  dataSaving: false,
};

const STORAGE_KEY = 'app-preferences';

export function loadPreferences(): Preferences {
  if (typeof window === 'undefined') return defaultPreferences;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...defaultPreferences, ...JSON.parse(raw) };
    }
  } catch {
    // ignore corrupted localStorage
  }
  return defaultPreferences;
}

export function savePreferences(prefs: Preferences): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function resetPreferences(): Preferences {
  savePreferences(defaultPreferences);
  return defaultPreferences;
}

export function exportPreferences(): string {
  return JSON.stringify(loadPreferences(), null, 2);
}

export function importPreferences(json: string): Preferences {
  const parsed = JSON.parse(json);
  const merged: Preferences = { ...defaultPreferences, ...parsed };
  savePreferences(merged);
  return merged;
}

export function subscribe(callback: (prefs: Preferences) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        callback({ ...defaultPreferences, ...JSON.parse(e.newValue) });
      } catch {
        // ignore
      }
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
