import { getProfileScopedKey } from './profileKeys';

export const THEME_KEY = 'app:theme';

export const getThemeStorageKey = (profileId?: string | null) =>
  getProfileScopedKey(profileId ?? null, THEME_KEY);

// Score required to unlock each theme
export const THEME_UNLOCKS: Record<string, number> = {
  default: 0,
  neon: 100,
  dark: 500,
  matrix: 1000,
};

const DARK_THEMES = ['dark', 'neon', 'matrix'] as const;

export const isDarkTheme = (theme: string): boolean =>
  DARK_THEMES.includes(theme as (typeof DARK_THEMES)[number]);

export const getTheme = (profileId?: string | null): string => {
  if (typeof window === 'undefined') return 'default';
  try {
    const stored = window.localStorage.getItem(getThemeStorageKey(profileId));
    if (stored) return stored;
    const prefersDark = window.matchMedia?.(
      '(prefers-color-scheme: dark)'
    ).matches;
    return prefersDark ? 'dark' : 'default';
  } catch {
    return 'default';
  }
};

export const setTheme = (theme: string, profileId?: string | null): void => {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(getThemeStorageKey(profileId), theme);
    } catch {
      /* ignore storage errors */
    }
  }
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', isDarkTheme(theme));
  }
};

export const getUnlockedThemes = (highScore: number): string[] =>
  Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .map(([theme]) => theme);

export const isThemeUnlocked = (theme: string, highScore: number): boolean =>
  highScore >= (THEME_UNLOCKS[theme] ?? Infinity);
