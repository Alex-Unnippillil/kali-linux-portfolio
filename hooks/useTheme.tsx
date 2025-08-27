import { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import {
  getTheme as loadTheme,
  setTheme as saveTheme,
  getAccent as loadAccent,
  setAccent as saveAccent,
} from '../utils/settingsStore';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accent: string;
  setAccent: (accent: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  accent: '#4f46e5',
  setAccent: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document !== 'undefined' && document.documentElement.dataset.theme) {
      return document.documentElement.dataset.theme as Theme;
    }
    return loadTheme() as Theme;
  });

  const [accent, setAccent] = useState<string>(() => loadAccent());

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = (t: 'light' | 'dark') => {
      document.documentElement.dataset.theme = t;
    };
    saveTheme(theme);

    if (theme === 'system') {
      applyTheme(mql.matches ? 'dark' : 'light');
      const listener = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    } else {
      applyTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--accent', accent);
    }
    saveAccent(accent);
  }, [accent]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

