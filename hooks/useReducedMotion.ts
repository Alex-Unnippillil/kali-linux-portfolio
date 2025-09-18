import { useEffect, useMemo, useState } from 'react';
import { useSettings } from './useSettings';

export type ReducedMotionSource = 'none' | 'settings' | 'system' | 'settings+system';

export interface ReducedMotionState {
  reducedMotion: boolean;
  sources: {
    system: boolean;
    settings: boolean;
  };
  reason: ReducedMotionSource;
}

const getReason = (settings: boolean, system: boolean): ReducedMotionSource => {
  if (settings && system) return 'settings+system';
  if (settings) return 'settings';
  if (system) return 'system';
  return 'none';
};

export default function useReducedMotion(): ReducedMotionState {
  const { reducedMotion: settingsPreference } = useSettings();
  const [systemPreference, setSystemPreference] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemPreference(mediaQuery.matches);
    update();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(update);
      return () => mediaQuery.removeListener(update);
    }

    return undefined;
  }, []);

  const state = useMemo<ReducedMotionState>(() => {
    const settings = Boolean(settingsPreference);
    const system = systemPreference;
    const reducedMotion = settings || system;

    return {
      reducedMotion,
      sources: {
        system,
        settings,
      },
      reason: getReason(settings, system),
    };
  }, [settingsPreference, systemPreference]);

  return state;
}
