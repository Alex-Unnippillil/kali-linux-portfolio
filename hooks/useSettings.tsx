import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getAccent as loadAccent,
  setAccent as saveAccent,
  getWallpaper as loadWallpaper,
  setWallpaper as saveWallpaper,
  getDensity as loadDensity,
  setDensity as saveDensity,
  getReducedMotion as loadReducedMotion,
  setReducedMotion as saveReducedMotion,
  getShuffle as loadShuffle,
  setShuffle as saveShuffle,
  getLastShuffle as loadLastShuffle,
  setLastShuffle as saveLastShuffle,
  defaults,
} from '../utils/settingsStore';
type Density = 'regular' | 'compact';

interface SettingsContextValue {
  accent: string;
  wallpaper: string;
  density: Density;
  reducedMotion: boolean;
  shuffle: boolean;
  setAccent: (accent: string) => void;
  setWallpaper: (wallpaper: string) => void;
  setDensity: (density: Density) => void;
  setReducedMotion: (value: boolean) => void;
  setShuffle: (value: boolean) => void;
}

export const SettingsContext = createContext<SettingsContextValue>({
  accent: defaults.accent,
  wallpaper: defaults.wallpaper,
  density: defaults.density as Density,
  reducedMotion: defaults.reducedMotion,
  shuffle: defaults.shuffle,
  setAccent: () => {},
  setWallpaper: () => {},
  setDensity: () => {},
  setReducedMotion: () => {},
  setShuffle: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [accent, setAccent] = useState<string>(defaults.accent);
  const [wallpaper, setWallpaper] = useState<string>(defaults.wallpaper);
  const [density, setDensity] = useState<Density>(defaults.density as Density);
  const [reducedMotion, setReducedMotion] = useState<boolean>(defaults.reducedMotion);
  const [shuffle, setShuffle] = useState<boolean>(defaults.shuffle);

  useEffect(() => {
    (async () => {
      setAccent(await loadAccent());
      setWallpaper(await loadWallpaper());
      setDensity((await loadDensity()) as Density);
      setReducedMotion(await loadReducedMotion());
      setShuffle(await loadShuffle());
    })();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-ub-orange', accent);
    saveAccent(accent);
  }, [accent]);

  useEffect(() => {
    saveWallpaper(wallpaper);
  }, [wallpaper]);

  useEffect(() => {
    const spacing: Record<Density, Record<string, string>> = {
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

  useEffect(() => {
    saveShuffle(shuffle);
  }, [shuffle]);

  useEffect(() => {
    if (!shuffle) return;
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const last = await loadLastShuffle();
      if (last === today) return;
      try {
        const res = await fetch('/api/wallpapers');
        const list: string[] = await res.json();
        if (list.length) {
          const next = list[Math.floor(Math.random() * list.length)];
          setWallpaper(next);
          saveLastShuffle(today);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [shuffle]);

  return (
    <SettingsContext.Provider value={{ accent, wallpaper, density, reducedMotion, shuffle, setAccent, setWallpaper, setDensity, setReducedMotion, setShuffle }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);

