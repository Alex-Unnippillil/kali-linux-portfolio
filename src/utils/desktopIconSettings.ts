export interface DesktopIconPreferences {
  showHome: boolean;
  showTrash: boolean;
}

const defaultPrefs: DesktopIconPreferences = {
  showHome: true,
  showTrash: true,
};

const STORAGE_KEY = 'desktop-icon-preferences';

let current: DesktopIconPreferences = loadFromStorage();
const listeners = new Set<(prefs: DesktopIconPreferences) => void>();

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // ignore
  }
  return null;
}

function loadFromStorage(): DesktopIconPreferences {
  const storage = getStorage();
  if (storage) {
    try {
      const data = storage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...defaultPrefs, ...parsed };
      }
    } catch {
      // ignore parse errors
    }
  }
  return { ...defaultPrefs };
}

export function loadPreferences(): DesktopIconPreferences {
  return current;
}

export function savePreferences(prefs: DesktopIconPreferences): void {
  current = { ...defaultPrefs, ...prefs };
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // ignore write errors
    }
  }
  for (const listener of listeners) {
    listener(current);
  }
}

export function subscribe(
  listener: (prefs: DesktopIconPreferences) => void
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      const newPrefs = event.newValue
        ? JSON.parse(event.newValue)
        : { ...defaultPrefs };
      current = { ...defaultPrefs, ...newPrefs };
      for (const listener of listeners) {
        listener(current);
      }
    }
  });
}

