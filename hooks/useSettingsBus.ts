'use client';

import { useEffect, useRef, useState } from 'react';
import settingsBus from '../utils/settingsBus';
import {
  setAccent,
  getAccent,
  setWallpaper,
  getWallpaper,
  setDensity,
  getDensity,
  setReducedMotion,
  getReducedMotion,
  setFontScale,
  getFontScale,
  setHighContrast,
  getHighContrast,
  setHaptics,
  getHaptics,
} from '../utils/settingsStore';
import { setTheme, getTheme, THEME_KEY } from '../utils/theme';

// Utility to lighten or darken a hex color
const shadeColor = (color: string, percent: number): string => {
  const f = parseInt(color.slice(1), 16);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const R = f >> 16;
  const G = (f >> 8) & 0x00ff;
  const B = f & 0x0000ff;
  const newR = Math.round((t - R) * p) + R;
  const newG = Math.round((t - G) * p) + G;
  const newB = Math.round((t - B) * p) + B;
  return `#${(0x1000000 + newR * 0x10000 + newG * 0x100 + newB)
    .toString(16)
    .slice(1)}`;
};

const spacing: Record<'regular' | 'compact', Record<string, string>> = {
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

interface Handler {
  load?: () => Promise<any> | any;
  save?: (v: any) => Promise<any> | any;
  apply?: (v: any) => void;
  key?: string;
}

const HANDLERS: Record<string, Handler> = {
  theme: {
    load: getTheme,
    save: setTheme,
    key: THEME_KEY,
  },
  accent: {
    load: getAccent,
    save: setAccent,
    apply: (accent: string) => {
      const border = shadeColor(accent, -0.2);
      const vars: Record<string, string> = {
        '--color-ub-orange': accent,
        '--color-ub-border-orange': border,
        '--color-primary': accent,
        '--color-accent': accent,
        '--color-focus-ring': accent,
        '--color-selection': accent,
        '--color-control-accent': accent,
      };
      Object.entries(vars).forEach(([k, v]) =>
        document.documentElement.style.setProperty(k, v),
      );
    },
  },
  wallpaper: {
    load: getWallpaper,
    save: setWallpaper,
    key: 'bg-image',
  },
  density: {
    load: getDensity,
    save: setDensity,
    apply: (density: 'regular' | 'compact') => {
      const vars = spacing[density];
      Object.entries(vars).forEach(([k, v]) =>
        document.documentElement.style.setProperty(k, v),
      );
    },
  },
  reducedMotion: {
    load: getReducedMotion,
    save: setReducedMotion,
    apply: (v: boolean) =>
      document.documentElement.classList.toggle('reduced-motion', v),
    key: 'reduced-motion',
  },
  fontScale: {
    load: getFontScale,
    save: setFontScale,
    apply: (v: number) =>
      document.documentElement.style.setProperty('--font-multiplier', String(v)),
    key: 'font-scale',
  },
  highContrast: {
    load: getHighContrast,
    save: setHighContrast,
    apply: (v: boolean) =>
      document.documentElement.classList.toggle('high-contrast', v),
    key: 'high-contrast',
  },
  haptics: {
    load: getHaptics,
    save: setHaptics,
    key: 'haptics',
  },
};

export default function useSettingsBus<T>(
  channel: string,
  property: string,
  initial: T,
  storageKey?: string,
): [T, (v: T) => void] {
  const handler = HANDLERS[property];
  const key = storageKey ?? handler?.key ?? property;

  const [value, setValue] = useState<T>(() => initial);
  const skipRef = useRef(false);

  useEffect(() => {
    let active = true;
    const loadValue = async () => {
      if (handler?.load) {
        try {
          const loaded = await handler.load();
          if (active) {
            skipRef.current = true;
            setValue(loaded);
          }
          return;
        } catch {
          /* ignore */
        }
      }
      if (typeof window !== 'undefined') {
        try {
          const stored = window.localStorage.getItem(key);
          if (stored !== null && active) {
            skipRef.current = true;
            setValue(JSON.parse(stored));
          }
        } catch {
          /* ignore */
        }
      }
    };
    loadValue();
    return () => {
      active = false;
    };
  }, [key, handler]);

  useEffect(() => {
    return settingsBus.subscribe((msg) => {
      if (msg.channel === channel && msg.property === property) {
        skipRef.current = true;
        setValue(msg.value as T);
      }
    });
  }, [channel, property]);

  useEffect(() => {
    if (handler?.apply) handler.apply(value);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      /* ignore */
    }
    if (handler?.save) handler.save(value);
    if (skipRef.current) {
      skipRef.current = false;
    } else {
      settingsBus.publish(channel, property, value);
    }
  }, [value, channel, property, key, handler]);

  return [value, setValue];
}

