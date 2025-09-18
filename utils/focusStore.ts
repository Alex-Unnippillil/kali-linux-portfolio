import { FocusAppOverride, FocusSettingsState } from '../types/focus';
import { safeLocalStorage } from './safeStorage';

export const FOCUS_STORAGE_KEY = 'focus-settings-v1';

export const defaultFocusSettings: FocusSettingsState = {
  enabled: false,
  schedule: ['09:00', '13:00', '17:00'],
  perAppOverrides: {},
};

export const normalizeTime = (input: string): string | null => {
  if (!input) return null;
  const match = input.trim().match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? '0');
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}`;
};

const sanitizeTimes = (times?: string[]): string[] => {
  if (!Array.isArray(times)) return [];
  const seen = new Set<string>();
  times.forEach((value) => {
    const normalized = normalizeTime(value);
    if (normalized) {
      seen.add(normalized);
    }
  });
  return Array.from(seen).sort();
};

export const sanitizeOverride = (override: FocusAppOverride): FocusAppOverride => {
  if (override.mode === 'custom') {
    const schedule = sanitizeTimes(override.schedule);
    return {
      mode: schedule.length ? 'custom' : 'inherit',
      schedule,
    };
  }
  return { mode: override.mode };
};

const sanitizeOverrides = (
  overrides?: Record<string, FocusAppOverride>
): Record<string, FocusAppOverride> => {
  if (!overrides) return {};
  return Object.entries(overrides).reduce<Record<string, FocusAppOverride>>(
    (acc, [appId, override]) => {
      if (!override || typeof override !== 'object') return acc;
      acc[appId] = sanitizeOverride(override);
      return acc;
    },
    {}
  );
};

export const loadFocusSettings = (): FocusSettingsState => {
  try {
    if (!safeLocalStorage) return { ...defaultFocusSettings };
    const raw = safeLocalStorage.getItem(FOCUS_STORAGE_KEY);
    if (!raw) return { ...defaultFocusSettings };
    const parsed = JSON.parse(raw);
    return {
      enabled: Boolean(parsed.enabled),
      schedule: sanitizeTimes(parsed.schedule),
      perAppOverrides: sanitizeOverrides(parsed.perAppOverrides),
    };
  } catch (error) {
    console.warn('Failed to load focus settings', error);
    return { ...defaultFocusSettings };
  }
};

export const saveFocusSettings = (settings: FocusSettingsState): void => {
  try {
    if (!safeLocalStorage) return;
    const payload: FocusSettingsState = {
      enabled: settings.enabled,
      schedule: sanitizeTimes(settings.schedule),
      perAppOverrides: sanitizeOverrides(settings.perAppOverrides),
    };
    safeLocalStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist focus settings', error);
  }
};
