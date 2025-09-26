export const THEME_KEY = 'app:theme';

// Score required to unlock each theme
export const THEME_UNLOCKS: Record<string, number> = {
  'kali-dark': 0,
  'kali-blue-deep': 0,
};

const DARK_THEMES = ['kali-dark', 'kali-blue-deep'] as const;

export const isDarkTheme = (theme: string): boolean =>
  DARK_THEMES.includes(theme as (typeof DARK_THEMES)[number]);

const applyTheme = (theme: string) => {
  if (typeof document === 'undefined') return;
  const desktop = document.getElementById('desktop');
  if (desktop) {
    desktop.setAttribute('data-theme', theme);
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', isDarkTheme(theme));
};

export const getTheme = (): string => {
  if (typeof window === 'undefined') return 'kali-dark';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    const prefersDark = window.matchMedia?.(
      '(prefers-color-scheme: dark)'
    ).matches;
    return prefersDark ? 'kali-dark' : 'kali-blue-deep';
  } catch {
    return 'kali-dark';
  }
};

export const setTheme = (theme: string): void => {
  if (typeof window === 'undefined') {
    applyTheme(theme);
    return;
  }
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore storage errors */
  }
  applyTheme(theme);
};

export const getUnlockedThemes = (highScore: number): string[] =>
  Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .map(([theme]) => theme);

export const isThemeUnlocked = (theme: string, highScore: number): boolean =>
  highScore >= (THEME_UNLOCKS[theme] ?? Infinity);
