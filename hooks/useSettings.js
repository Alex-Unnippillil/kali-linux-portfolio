import { createContext, useContext, useEffect, useState } from 'react';
import {
  getTheme as loadTheme,
  setTheme as saveTheme,
  getAccent as loadAccent,
  setAccent as saveAccent,
  getWallpaper as loadWallpaper,
  setWallpaper as saveWallpaper,
  getDensity as loadDensity,
  setDensity as saveDensity,
  getReducedMotion as loadReducedMotion,
  setReducedMotion as saveReducedMotion,
  defaults,
} from '../utils/settingsStore';

export const SettingsContext = createContext({
  theme: defaults.theme,
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  density: defaults.density,
  reducedMotion: defaults.reducedMotion,
  setTheme: () => {},
  setAccent: () => {},
  setWallpaper: () => {},
  setDensity: () => {},
  setReducedMotion: () => {},
});

export function SettingsProvider({ children }) {
  const [theme, setTheme] = useState(defaults.theme);
  const [accent, setAccent] = useState(defaults.accent);
  const [wallpaper, setWallpaper] = useState(defaults.wallpaper);
  const [density, setDensity] = useState(defaults.density);
  const [reducedMotion, setReducedMotion] = useState(defaults.reducedMotion);

  useEffect(() => {
    (async () => {
      setTheme(await loadTheme());
      setAccent(await loadAccent());
      setWallpaper(await loadWallpaper());
      setDensity(await loadDensity());
      setReducedMotion(await loadReducedMotion());
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

    let media;
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

  useEffect(() => {
    const spacing = {
      regular: {
        '--space-1': '0.25rem',
        '--space-2': '0.5rem',
        '--space-3': '0.75rem',
        '--space-4': '1rem',
        '--space-5': '1.5rem',
        '--space-6': '2rem',
      },
      compact: {
        '--space-1': '0.125rem',
        '--space-2': '0.25rem',
        '--space-3': '0.5rem',
        '--space-4': '0.75rem',
        '--space-5': '1rem',
        '--space-6': '1.5rem',
      },
    };
    const vars = spacing[density];
    Object.entries(vars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
    saveDensity(density);
  }, [density]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
    saveReducedMotion(reducedMotion);
  }, [reducedMotion]);

  return (
    <SettingsContext.Provider value={{ theme, accent, wallpaper, density, reducedMotion, setTheme, setAccent, setWallpaper, setDensity, setReducedMotion }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

