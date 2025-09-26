export const THEME_KEY = 'app:theme';

// Score required to unlock each theme
export const THEME_UNLOCKS: Record<string, number> = {
  default: 0,
  light: 0,
  neon: 100,
  dark: 500,
  matrix: 1000,
};

const DARK_THEMES = ['dark', 'neon', 'matrix'] as const;
const SYSTEM_THEME = 'system';
const DEFAULT_THEME = SYSTEM_THEME;

let systemMediaQuery: MediaQueryList | null = null;
let systemListener: ((event?: MediaQueryListEvent) => void) | null = null;

const prefersDarkQuery = '(prefers-color-scheme: dark)';

const cleanupSystemListener = () => {
  if (!systemMediaQuery || !systemListener) return;
  if (typeof systemMediaQuery.removeEventListener === 'function') {
    systemMediaQuery.removeEventListener('change', systemListener);
  } else if (typeof systemMediaQuery.removeListener === 'function') {
    systemMediaQuery.removeListener(systemListener);
  }
  systemMediaQuery = null;
  systemListener = null;
};

const ensureSystemListener = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return;
  }
  cleanupSystemListener();
  systemMediaQuery = window.matchMedia(prefersDarkQuery);
  systemListener = () => applyDocumentTheme(SYSTEM_THEME);
  if (typeof systemMediaQuery.addEventListener === 'function') {
    systemMediaQuery.addEventListener('change', systemListener);
  } else if (typeof systemMediaQuery.addListener === 'function') {
    systemMediaQuery.addListener(systemListener);
  }
};

const resolveSystemTheme = (): 'dark' | 'light' => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  const query = window.matchMedia(prefersDarkQuery);
  return query.matches ? 'dark' : 'light';
};

const applyDocumentTheme = (theme: string): void => {
  if (typeof document === 'undefined') return;
  const effective = theme === SYSTEM_THEME ? resolveSystemTheme() : theme;
  document.documentElement.dataset.themePreference = theme;
  document.documentElement.dataset.theme = effective;
  const darkClassActive = isDarkTheme(effective);
  const prefersDarkColors = effective !== 'light';
  document.documentElement.classList.toggle('dark', darkClassActive);
  document.documentElement.style.setProperty(
    'color-scheme',
    prefersDarkColors ? 'dark' : 'light'
  );
};

export const isDarkTheme = (theme: string): boolean =>
  DARK_THEMES.includes(theme as (typeof DARK_THEMES)[number]);

export const getTheme = (): string => {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export const applyTheme = (theme: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
    if (theme === SYSTEM_THEME) {
      ensureSystemListener();
    } else {
      cleanupSystemListener();
    }
    applyDocumentTheme(theme);
  } catch {
    /* ignore storage errors */
  }
};

export const setTheme = applyTheme;

export const getUnlockedThemes = (highScore: number): string[] => {
  const unlocked = Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .map(([theme]) => theme);
  return ['system', ...new Set(unlocked)];
};

export const isThemeUnlocked = (theme: string, highScore: number): boolean =>
  highScore >= (THEME_UNLOCKS[theme] ?? Infinity);
