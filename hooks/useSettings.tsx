import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getTheme as loadTheme,
  setTheme as saveTheme,
  getAccent as loadAccent,
  setAccent as saveAccent,
  getWallpaper as loadWallpaper,
  setWallpaper as saveWallpaper,
  defaults,
} from '../utils/settingsStore';

type Theme = 'light' | 'dark' | 'system';

interface SettingsContextValue {
  theme: Theme;
  accent: string;
  wallpaper: string;
  setTheme: (theme: Theme) => void;
  setAccent: (accent: string) => void;
  setWallpaper: (wallpaper: string) => void;
}

export const SettingsContext = createContext<SettingsContextValue>({
  theme: defaults.theme,
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  setTheme: () => {},
  setAccent: () => {},
  setWallpaper: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(defaults.theme);
  const [accent, setAccent] = useState<string>(defaults.accent);
  const [wallpaper, setWallpaper] = useState<string>(defaults.wallpaper);

  useEffect(() => {
    (async () => {
      setTheme((await loadTheme()) as Theme);
      setAccent(await loadAccent());
      setWallpaper(await loadWallpaper());
    })();
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      const resolved = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      document.documentElement.dataset.theme = resolved;
    };

    applyTheme();
    saveTheme(theme);

    let media: MediaQueryList | undefined;
    if (theme === 'system') {
      media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', applyTheme);
      return () => media?.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-ub-orange', accent);
    saveAccent(accent);
  }, [accent]);

  useEffect(() => {
    saveWallpaper(wallpaper);
  }, [wallpaper]);

  return (
    <SettingsContext.Provider value={{ theme, accent, wallpaper, setTheme, setAccent, setWallpaper }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

