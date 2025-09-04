export const THEME_KEY = 'app:theme';

// Score required to unlock each theme
export const THEME_UNLOCKS: Record<string, number> = {
  default: 0,
  neon: 100,
  dark: 500,
  matrix: 1000,
};

import { isBrowser } from './isBrowser';

export const getTheme = (): string => {
  if (!isBrowser) return 'default';
  try {
    const stored = globalThis.localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    const prefersDark = globalThis.matchMedia?.(
      '(prefers-color-scheme: dark)'
    ).matches;
    return prefersDark ? 'dark' : 'default';
  } catch {
    return 'default';
  }
};

export const setTheme = (theme: string): void => {
  if (!isBrowser) return;
  try {
    globalThis.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  } catch {
    /* ignore storage errors */
  }
};

export const getUnlockedThemes = (highScore: number): string[] =>
  Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .map(([theme]) => theme);

export const isThemeUnlocked = (theme: string, highScore: number): boolean =>
  highScore >= (THEME_UNLOCKS[theme] ?? Infinity);
