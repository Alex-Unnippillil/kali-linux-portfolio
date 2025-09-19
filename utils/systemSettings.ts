export const SYSTEM_SETTINGS_EVENT = 'system-setting-change';

export type ThemePreference = 'light' | 'dark';

export type SystemSettingChangeDetail =
  | { setting: 'theme'; value: ThemePreference }
  | { setting: 'reduceMotion'; value: boolean };

type ThemeStorageValue = ThemePreference | string | null;

const THEME_STORAGE_KEY = 'qs-theme';
const REDUCE_MOTION_STORAGE_KEY = 'qs-reduce-motion';

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark';

const parseStoredTheme = (value: string | null): ThemePreference => {
  if (!value) return 'light';
  try {
    const parsed = JSON.parse(value) as ThemeStorageValue;
    if (isThemePreference(parsed)) return parsed;
  } catch {
    // ignore malformed values
  }
  return 'light';
};

const parseStoredReduceMotion = (value: string | null): boolean => {
  if (!value) return false;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'boolean' ? parsed : false;
  } catch {
    return false;
  }
};

const dispatchSettingChange = (detail: SystemSettingChangeDetail) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SystemSettingChangeDetail>(SYSTEM_SETTINGS_EVENT, { detail }));
};

export const getStoredThemePreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return parseStoredTheme(stored);
};

export const setThemePreference = (
  theme: ThemePreference,
  { silent = false }: { silent?: boolean } = {},
) => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(theme));
    } catch {
      // ignore write failures
    }
    if (!silent) {
      dispatchSettingChange({ setting: 'theme', value: theme });
    }
  }

  return theme;
};

export const toggleThemePreference = () => {
  const next = getStoredThemePreference() === 'dark' ? 'light' : 'dark';
  setThemePreference(next);
  return next;
};

export const getStoredReduceMotionPreference = (): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = window.localStorage.getItem(REDUCE_MOTION_STORAGE_KEY);
  return parseStoredReduceMotion(stored);
};

export const setReduceMotionPreference = (
  enabled: boolean,
  { silent = false }: { silent?: boolean } = {},
) => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('reduce-motion', enabled);
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(REDUCE_MOTION_STORAGE_KEY, JSON.stringify(enabled));
    } catch {
      // ignore write failures
    }
    if (!silent) {
      dispatchSettingChange({ setting: 'reduceMotion', value: enabled });
    }
  }

  return enabled;
};

export const toggleReduceMotionPreference = () => {
  const next = !getStoredReduceMotionPreference();
  setReduceMotionPreference(next);
  return next;
};
