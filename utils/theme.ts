export const THEME_KEY = 'app:theme';
const HIGH_CONTRAST_KEY = 'high-contrast';
const DEFAULT_THEME = 'default';

// Score required to unlock each theme
export const THEME_UNLOCKS: Record<string, number> = {
  default: 0,
  neon: 100,
  dark: 500,
  matrix: 1000,
};

const DARK_THEMES = ['dark', 'neon', 'matrix'] as const;

const getStoredContrastPreference = (): boolean | null => {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    if (!storage) return null;
    const stored = storage.getItem(HIGH_CONTRAST_KEY);
    if (stored === null) return null;
    return stored === 'true';
  } catch {
    return null;
  }
};

const prefers = (query: string): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
};

const applyDocumentTheme = (theme: string): void => {
  if (typeof document === 'undefined') return;
  const isDark = isDarkTheme(theme);
  const colorScheme = isDark ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = colorScheme;
  document.documentElement.dataset.colorScheme = colorScheme;
};

export const isDarkTheme = (theme: string): boolean =>
  DARK_THEMES.includes(theme as (typeof DARK_THEMES)[number]);

export const resolveHighContrastPreference = (): boolean => {
  const stored = getStoredContrastPreference();
  if (stored !== null) return stored;
  return prefers('(prefers-contrast: more)');
};

export const applyHighContrastPreference = (override?: boolean): boolean => {
  const shouldEnable =
    typeof override === 'boolean' ? override : resolveHighContrastPreference();
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('high-contrast', shouldEnable);
    document.documentElement.dataset.contrast = shouldEnable ? 'high' : 'standard';
  }
  return shouldEnable;
};

export const getTheme = (): string => {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    const prefersDark = prefers('(prefers-color-scheme: dark)');
    return prefersDark ? 'dark' : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export const setTheme = (theme: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore storage errors */
  }
  applyDocumentTheme(theme);
  applyHighContrastPreference();
};

export const getUnlockedThemes = (highScore: number): string[] =>
  Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .map(([theme]) => theme);

export const isThemeUnlocked = (theme: string, highScore: number): boolean =>
  highScore >= (THEME_UNLOCKS[theme] ?? Infinity);
