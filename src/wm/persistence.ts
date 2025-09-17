import apps from '@/apps.config';
import { safeLocalStorage } from '@/utils/safeStorage';

export interface PinPreset {
  name: string;
  pins: string[];
  createdAt: number;
  updatedAt: number;
}

const PINNED_APPS_KEY = 'pinnedApps';
const PIN_PRESETS_KEY = 'wm.pin-presets';
const ACTIVE_PRESET_KEY = 'wm.active-pin-preset';
export const PINNED_APPS_UPDATED_EVENT = 'wm:pinnedAppsUpdated';

const DEFAULT_PIN_IDS: string[] = Array.from(
  new Set(
    (Array.isArray(apps) ? apps : [])
      .filter((app: any) => app && app.favourite)
      .map((app: any) => String(app.id))
  )
);

const clone = <T>(value: T[]): T[] => [...value];

const sanitizePins = (pins: unknown): string[] => {
  if (!Array.isArray(pins)) return [];
  return Array.from(new Set(pins.map((id) => String(id)).filter(Boolean)));
};

const readJson = <T>(key: string, fallback: T): T => {
  if (!safeLocalStorage) return fallback;
  const value = safeLocalStorage.getItem(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore persistence errors
  }
};

export const getDefaultPinnedApps = (): string[] => clone(DEFAULT_PIN_IDS);

export const loadPinnedApps = (): string[] => {
  const fallback = getDefaultPinnedApps();
  if (!safeLocalStorage) return fallback;
  const stored = readJson<string[]>(PINNED_APPS_KEY, fallback);
  const pins = sanitizePins(stored);
  if (!stored || stored.length === 0) {
    writeJson(PINNED_APPS_KEY, pins.length ? pins : fallback);
  }
  return pins.length ? pins : fallback;
};

export const emitPinnedAppsChanged = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PINNED_APPS_UPDATED_EVENT));
};

export const savePinnedApps = (pins: string[]): string[] => {
  const sanitized = sanitizePins(pins);
  writeJson(PINNED_APPS_KEY, sanitized);
  emitPinnedAppsChanged();
  return sanitized;
};

export const loadPinPresets = (): PinPreset[] => {
  const raw = readJson<unknown>(PIN_PRESETS_KEY, []);
  const list = Array.isArray(raw) ? raw : [];
  const now = Date.now();
  const presets: PinPreset[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const name = 'name' in item && typeof (item as any).name === 'string'
      ? (item as any).name.trim()
      : '';
    if (!name) continue;
    const pins = sanitizePins((item as any).pins);
    const createdAt =
      'createdAt' in item && typeof (item as any).createdAt === 'number'
        ? (item as any).createdAt
        : now;
    const updatedAt =
      'updatedAt' in item && typeof (item as any).updatedAt === 'number'
        ? (item as any).updatedAt
        : createdAt;
    presets.push({ name, pins, createdAt, updatedAt });
  }
  return presets;
};

const savePinPresets = (presets: PinPreset[]): void => {
  writeJson(PIN_PRESETS_KEY, presets);
};

const normalizeName = (name: string): string => name.trim();

export const upsertPinPreset = (name: string, pins: string[]): PinPreset[] => {
  const normalized = normalizeName(name);
  if (!normalized) return loadPinPresets();
  const sanitizedPins = sanitizePins(pins);
  const presets = loadPinPresets();
  const now = Date.now();
  const index = presets.findIndex(
    (preset) => preset.name.toLowerCase() === normalized.toLowerCase()
  );
  if (index >= 0) {
    const existing = presets[index];
    presets[index] = {
      ...existing,
      name: normalized,
      pins: sanitizedPins,
      updatedAt: now,
    };
  } else {
    presets.push({
      name: normalized,
      pins: sanitizedPins,
      createdAt: now,
      updatedAt: now,
    });
  }
  savePinPresets(presets);
  setActivePinPreset(normalized);
  return presets;
};

export const deletePinPreset = (name: string): PinPreset[] => {
  const normalized = normalizeName(name);
  const presets = loadPinPresets();
  const filtered = presets.filter(
    (preset) => preset.name.toLowerCase() !== normalized.toLowerCase()
  );
  if (filtered.length !== presets.length) {
    savePinPresets(filtered);
    const active = getActivePinPreset();
    if (active && active.toLowerCase() === normalized.toLowerCase()) {
      setActivePinPreset(null);
    }
  }
  return filtered;
};

export const getActivePinPreset = (): string | null => {
  if (!safeLocalStorage) return null;
  const value = safeLocalStorage.getItem(ACTIVE_PRESET_KEY);
  return value ? value : null;
};

export const setActivePinPreset = (name: string | null): void => {
  if (!safeLocalStorage) return;
  if (name && name.trim()) {
    safeLocalStorage.setItem(ACTIVE_PRESET_KEY, name.trim());
  } else {
    safeLocalStorage.removeItem(ACTIVE_PRESET_KEY);
  }
};

export const applyPinPreset = (name: string): string[] => {
  const normalized = normalizeName(name);
  if (!normalized) return [];
  const presets = loadPinPresets();
  const preset = presets.find(
    (item) => item.name.toLowerCase() === normalized.toLowerCase()
  );
  if (!preset) return [];
  const pins = savePinnedApps(preset.pins);
  setActivePinPreset(preset.name);
  return pins;
};
