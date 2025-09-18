import { safeLocalStorage } from './safeStorage';

export const DISPLAY_STORAGE_KEY = 'desktop-displays';

const normalizeDisplays = (displays) => {
  if (!Array.isArray(displays)) return [];
  return displays
    .filter((display) => display && typeof display.id === 'string')
    .map((display) => ({
      id: display.id,
      name: typeof display.name === 'string' ? display.name : '',
    }));
};

export const loadDisplayConfig = () => {
  if (!safeLocalStorage) return [];
  try {
    const stored = safeLocalStorage.getItem(DISPLAY_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return normalizeDisplays(parsed);
  } catch {
    return [];
  }
};

export const saveDisplayConfig = (displays) => {
  if (!safeLocalStorage) return;
  try {
    const normalized = normalizeDisplays(displays);
    safeLocalStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore write errors
  }
};

export const ensureDisplayConfig = () => {
  const existing = loadDisplayConfig();
  if (existing.length) return existing;
  const defaults = [{ id: 'display-1', name: 'Primary Display' }];
  saveDisplayConfig(defaults);
  return defaults;
};

export const generateDisplayId = (displays) => {
  const normalized = normalizeDisplays(displays);
  const used = new Set(normalized.map((display) => display.id));
  let index = normalized.length + 1;
  let candidate = '';
  do {
    candidate = `display-${index}`;
    index += 1;
  } while (used.has(candidate));
  return candidate;
};
