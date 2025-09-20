import type { ThemeDefinition } from '../styles/themes';
import { defaultTheme } from '../styles/themes';
import { applyThemeTokens, getThemeDefinition } from './themeTokens';

export const THEME_KEY = 'app:theme';

// Score required to unlock each theme
export const THEME_UNLOCKS: Record<string, number> = {
  default: 0,
  neon: 100,
  dark: 500,
  matrix: 1000,
};

const FALLBACK_THEME = defaultTheme;

export const isDarkTheme = (theme: string): boolean => {
  const definition = getThemeDefinition(theme);
  return definition ? definition.metadata.mode === 'dark' : false;
};

export const getTheme = (): string => {
  if (typeof window === 'undefined') return 'default';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored) {
      const definition = getThemeDefinition(stored);
      if (definition) return stored;
    }
    const prefersDark = window.matchMedia?.(
      '(prefers-color-scheme: dark)'
    ).matches;
    return prefersDark ? 'dark' : 'default';
  } catch {
    return 'default';
  }
};

export const setTheme = (theme: string, override?: ThemeDefinition): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore storage errors */
  }
  const definition =
    override ??
    getThemeDefinition(theme) ??
    FALLBACK_THEME;
  applyThemeTokens(definition);
};

export const getUnlockedThemes = (highScore: number): string[] =>
  Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .map(([theme]) => theme);

export const isThemeUnlocked = (theme: string, highScore: number): boolean =>
  highScore >= (THEME_UNLOCKS[theme] ?? Infinity);
