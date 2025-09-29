'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { QUICK_SETTINGS_STORAGE_KEY } from '../lib/version';
import { useSettings } from './useSettings';
import { isDarkTheme } from '../utils/theme';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type ThemeMode = 'light' | 'dark';

type FeatureFlagsState = {
  theme: ThemeMode;
  sound: boolean;
  networkEnabled: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
};

type FeatureFlagsContextValue = FeatureFlagsState & {
  ready: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setNetworkEnabled: (enabled: boolean) => void;
  setReducedMotionEnabled: (enabled: boolean) => void;
  setHighContrastEnabled: (enabled: boolean) => void;
};

const noop = () => {
  throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
};

const defaultState: FeatureFlagsContextValue = {
  theme: 'light',
  sound: true,
  networkEnabled: false,
  reducedMotion: false,
  highContrast: false,
  ready: false,
  setThemeMode: noop,
  toggleThemeMode: noop,
  setSoundEnabled: noop,
  setNetworkEnabled: noop,
  setReducedMotionEnabled: noop,
  setHighContrastEnabled: noop,
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>(defaultState);

const validateTheme = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark';

const validateBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const parseStoredState = (raw: string | null): Partial<FeatureFlagsState> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const state: Partial<FeatureFlagsState> = {};
    if (validateTheme((parsed as Record<string, unknown>).theme)) {
      state.theme = (parsed as Record<string, ThemeMode>).theme;
    }
    if (validateBoolean((parsed as Record<string, unknown>).sound)) {
      state.sound = Boolean((parsed as Record<string, boolean>).sound);
    }
    if (validateBoolean((parsed as Record<string, unknown>).networkEnabled)) {
      state.networkEnabled = Boolean(
        (parsed as Record<string, boolean>).networkEnabled,
      );
    }
    if (validateBoolean((parsed as Record<string, unknown>).reducedMotion)) {
      state.reducedMotion = Boolean(
        (parsed as Record<string, boolean>).reducedMotion,
      );
    }
    if (validateBoolean((parsed as Record<string, unknown>).highContrast)) {
      state.highContrast = Boolean(
        (parsed as Record<string, boolean>).highContrast,
      );
    }
    return state;
  } catch {
    return null;
  }
};

export const FeatureFlagsProvider = ({ children }: { children: ReactNode }) => {
  const {
    reducedMotion: settingsReducedMotion,
    setReducedMotion,
    highContrast: settingsHighContrast,
    setHighContrast,
    allowNetwork,
    setAllowNetwork,
    theme: settingsTheme,
    setTheme,
  } = useSettings();

  const [state, setState] = useState<FeatureFlagsState>(() => ({
    theme: isDarkTheme(settingsTheme) ? 'dark' : 'light',
    sound: true,
    networkEnabled: allowNetwork,
    reducedMotion: settingsReducedMotion,
    highContrast: settingsHighContrast,
  }));

  const [ready, setReady] = useState(false);

  const applyTheme = useCallback(
    (mode: ThemeMode) => {
      setState((prev) => ({ ...prev, theme: mode }));
      setTheme(mode === 'dark' ? 'dark' : 'default');
    },
    [setTheme],
  );

  const applySound = useCallback((enabled: boolean) => {
    setState((prev) => ({ ...prev, sound: enabled }));
  }, []);

  const applyNetwork = useCallback(
    (enabled: boolean) => {
      setState((prev) => ({ ...prev, networkEnabled: enabled }));
      setAllowNetwork(enabled);
    },
    [setAllowNetwork],
  );

  const applyReducedMotion = useCallback(
    (enabled: boolean) => {
      setState((prev) => ({ ...prev, reducedMotion: enabled }));
      setReducedMotion(enabled);
    },
    [setReducedMotion],
  );

  const applyHighContrast = useCallback(
    (enabled: boolean) => {
      setState((prev) => ({ ...prev, highContrast: enabled }));
      setHighContrast(enabled);
    },
    [setHighContrast],
  );

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = parseStoredState(window.localStorage.getItem(QUICK_SETTINGS_STORAGE_KEY));
    if (stored?.theme) {
      applyTheme(stored.theme);
    }
    if (typeof stored?.sound === 'boolean') {
      applySound(stored.sound);
    }
    if (typeof stored?.networkEnabled === 'boolean') {
      applyNetwork(stored.networkEnabled);
    }
    if (typeof stored?.reducedMotion === 'boolean') {
      applyReducedMotion(stored.reducedMotion);
    }
    if (typeof stored?.highContrast === 'boolean') {
      applyHighContrast(stored.highContrast);
    }
    setReady(true);
  }, [applyTheme, applySound, applyNetwork, applyReducedMotion, applyHighContrast]);

  useEffect(() => {
    setState((prev) =>
      prev.networkEnabled === allowNetwork
        ? prev
        : { ...prev, networkEnabled: allowNetwork },
    );
  }, [allowNetwork]);

  useEffect(() => {
    setState((prev) =>
      prev.reducedMotion === settingsReducedMotion
        ? prev
        : { ...prev, reducedMotion: settingsReducedMotion },
    );
  }, [settingsReducedMotion]);

  useEffect(() => {
    setState((prev) =>
      prev.highContrast === settingsHighContrast
        ? prev
        : { ...prev, highContrast: settingsHighContrast },
    );
  }, [settingsHighContrast]);

  useEffect(() => {
    const nextTheme = isDarkTheme(settingsTheme) ? 'dark' : 'light';
    setState((prev) => (prev.theme === nextTheme ? prev : { ...prev, theme: nextTheme }));
  }, [settingsTheme]);

  useIsomorphicLayoutEffect(() => {
    if (!ready || typeof document === 'undefined') return;
    const root = document.documentElement;
    const isDark = state.theme === 'dark';
    root.classList.toggle('qs-theme-dark', isDark);
    root.classList.toggle('qs-theme-light', !isDark);
    root.classList.toggle('qs-sound-muted', !state.sound);
    root.classList.toggle('qs-network-offline', !state.networkEnabled);
    root.classList.toggle('qs-reduced-motion', state.reducedMotion);
    root.classList.toggle('qs-high-contrast', state.highContrast);
    root.classList.toggle('dark', isDark);
    root.classList.toggle('reduced-motion', state.reducedMotion);
    root.classList.toggle('high-contrast', state.highContrast);
  }, [
    ready,
    state.theme,
    state.sound,
    state.networkEnabled,
    state.reducedMotion,
    state.highContrast,
  ]);

  useEffect(() => {
    if (!ready || typeof window === 'undefined') return;
    try {
      const payload: FeatureFlagsState = {
        theme: state.theme,
        sound: state.sound,
        networkEnabled: state.networkEnabled,
        reducedMotion: state.reducedMotion,
        highContrast: state.highContrast,
      };
      window.localStorage.setItem(
        QUICK_SETTINGS_STORAGE_KEY,
        JSON.stringify(payload),
      );
    } catch {
      // ignore write errors
    }
  }, [ready, state]);

  const value = useMemo<FeatureFlagsContextValue>(
    () => ({
      ...state,
      ready,
      setThemeMode: applyTheme,
      toggleThemeMode: () => applyTheme(state.theme === 'dark' ? 'light' : 'dark'),
      setSoundEnabled: applySound,
      setNetworkEnabled: applyNetwork,
      setReducedMotionEnabled: applyReducedMotion,
      setHighContrastEnabled: applyHighContrast,
    }),
    [state, ready, applyTheme, applySound, applyNetwork, applyReducedMotion, applyHighContrast],
  );

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => useContext(FeatureFlagsContext);
