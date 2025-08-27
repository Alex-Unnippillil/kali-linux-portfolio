import { createContext, useContext, useEffect, ReactNode, useState } from 'react';
import { getTheme as loadTheme, setTheme as saveTheme, getAccent } from '../utils/settingsStore';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => loadTheme() as Theme);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const accent = getAccent();
    const root = document.documentElement;
    const hexToRgb = (hex: string) => {
      const h = hex.replace('#', '');
      const bigint = parseInt(h, 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
      };
    };
    const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const a = [r, g, b].map(v => {
        v = v / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    };
    const contrast = (hex1: string, hex2: string) => {
      const l1 = luminance(hexToRgb(hex1)) + 0.05;
      const l2 = luminance(hexToRgb(hex2)) + 0.05;
      return l1 > l2 ? l1 / l2 : l2 / l1;
    };
    const accentText = contrast(accent, '#000000') > contrast(accent, '#ffffff') ? '#000000' : '#ffffff';
    root.style.setProperty('--color-accent', accent);
    root.style.setProperty('--color-accent-foreground', accentText);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const apply = (t: Theme) => {
      const resolved = t === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : t;
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
      root.dataset.theme = resolved;
    };
    apply(theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme === 'system') {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(media.matches ? 'dark' : 'light');
        root.dataset.theme = media.matches ? 'dark' : 'light';
      }
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

