import { createContext, useContext, useEffect, ReactNode } from 'react';
import usePersistentState from './usePersistentState';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = usePersistentState<Theme>('theme', () => {
    if (typeof document !== 'undefined' && document.documentElement.dataset.theme) {
      return document.documentElement.dataset.theme as Theme;
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

