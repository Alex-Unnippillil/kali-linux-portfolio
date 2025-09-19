import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react';

type Difficulty = 'easy' | 'normal' | 'hard';
type PaletteName = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';

type GameSettingsState = {
  difficulty: Difficulty;
  assists: boolean;
  palette: PaletteName;
  highContrast: boolean;
  quality: number;
};

export const selectGameSettingsState = (state: GameSettingsState) => state;
export const selectGameDifficulty = (state: GameSettingsState) => state.difficulty;
export const selectGameAssists = (state: GameSettingsState) => state.assists;
export const selectGamePalette = (state: GameSettingsState) => state.palette;
export const selectGameHighContrast = (state: GameSettingsState) => state.highContrast;
export const selectGameQuality = (state: GameSettingsState) => state.quality;

type GameSettingsActions = {
  setDifficulty: (d: Difficulty) => void;
  setAssists: (v: boolean) => void;
  setPalette: (v: PaletteName) => void;
  setHighContrast: (v: boolean) => void;
  setQuality: (v: number) => void;
};

type GameSettingsStore = {
  getState: () => GameSettingsState;
  getActions: () => GameSettingsActions;
  subscribe: (listener: () => void) => () => void;
  hydrate: () => void;
};

const DEFAULTS: GameSettingsState = {
  difficulty: 'normal',
  assists: true,
  palette: 'default',
  highContrast: false,
  quality: 1,
};

const STORAGE_KEYS = {
  difficulty: 'settings:difficulty',
  assists: 'settings:assists',
  palette: 'settings:palette',
  highContrast: 'settings:highContrast',
  quality: 'settings:quality',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const isDifficulty = (value: unknown): value is Difficulty =>
  value === 'easy' || value === 'normal' || value === 'hard';

const isPalette = (value: unknown): value is PaletteName =>
  value === 'default' ||
  value === 'protanopia' ||
  value === 'deuteranopia' ||
  value === 'tritanopia';

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const readSetting = <T,>(
  key: StorageKey,
  fallback: T,
  validator?: (value: unknown) => value is T,
): T => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (!validator || validator(parsed)) {
      return parsed as T;
    }
  } catch {
    /* ignore corrupted entries */
  }
  return fallback;
};

const writeSetting = (key: StorageKey, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore storage errors */
  }
};

const loadStoredSettings = (): GameSettingsState => ({
  difficulty: readSetting(STORAGE_KEYS.difficulty, DEFAULTS.difficulty, isDifficulty),
  assists: readSetting(STORAGE_KEYS.assists, DEFAULTS.assists, isBoolean),
  palette: readSetting(STORAGE_KEYS.palette, DEFAULTS.palette, isPalette),
  highContrast: readSetting(
    STORAGE_KEYS.highContrast,
    DEFAULTS.highContrast,
    isBoolean,
  ),
  quality: readSetting(STORAGE_KEYS.quality, DEFAULTS.quality, isNumber),
});

const createGameSettingsStore = (): GameSettingsStore => {
  const listeners = new Set<() => void>();
  let state: GameSettingsState =
    typeof window === 'undefined' ? { ...DEFAULTS } : loadStoredSettings();

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const setState = (partial: Partial<GameSettingsState>) => {
    const entries = Object.entries(partial) as [
      keyof GameSettingsState,
      GameSettingsState[keyof GameSettingsState],
    ][];
    let changed = false;
    for (const [key, value] of entries) {
      if (!Object.is(state[key], value)) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...partial };
    notify();
  };

  const actions: GameSettingsActions = {
    setDifficulty: (value) => {
      setState({ difficulty: value });
      writeSetting(STORAGE_KEYS.difficulty, value);
    },
    setAssists: (value) => {
      setState({ assists: value });
      writeSetting(STORAGE_KEYS.assists, value);
    },
    setPalette: (value) => {
      setState({ palette: value });
      writeSetting(STORAGE_KEYS.palette, value);
    },
    setHighContrast: (value) => {
      setState({ highContrast: value });
      writeSetting(STORAGE_KEYS.highContrast, value);
    },
    setQuality: (value) => {
      setState({ quality: value });
      writeSetting(STORAGE_KEYS.quality, value);
    },
  };

  return {
    getState: () => state,
    getActions: () => actions,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hydrate: () => {
      if (typeof window === 'undefined') return;
      const loaded = loadStoredSettings();
      const entries = Object.entries(loaded) as [
        keyof GameSettingsState,
        GameSettingsState[keyof GameSettingsState],
      ][];
      let changed = false;
      for (const [key, value] of entries) {
        if (!Object.is(state[key], value)) {
          changed = true;
          break;
        }
      }
      if (changed) {
        state = { ...loaded };
        notify();
      }
    },
  };
};

const SettingsContext = createContext<GameSettingsStore | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const storeRef = useRef<GameSettingsStore>();
  if (!storeRef.current) {
    storeRef.current = createGameSettingsStore();
  }

  useEffect(() => {
    storeRef.current?.hydrate();
  }, []);

  return (
    <SettingsContext.Provider value={storeRef.current}>
      {children}
    </SettingsContext.Provider>
  );
};

const useStore = (): GameSettingsStore => {
  const store = useContext(SettingsContext);
  if (!store) {
    throw new Error('useGameSettings must be used within SettingsProvider');
  }
  return store;
};

export const useGameSettingsActions = (): GameSettingsActions =>
  useStore().getActions();

export function useGameSettingsSelector<T>(
  selector: (state: GameSettingsState) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
): T {
  const store = useStore();
  const selectionRef = useRef<{ value: T } | null>(null);

  const getSelection = () => {
    const next = selector(store.getState());
    if (!selectionRef.current || !equalityFn(selectionRef.current.value, next)) {
      selectionRef.current = { value: next };
    }
    return selectionRef.current.value;
  };

  return useSyncExternalStore(
    (notify) =>
      store.subscribe(() => {
        const next = selector(store.getState());
        if (!selectionRef.current || !equalityFn(selectionRef.current.value, next)) {
          selectionRef.current = { value: next };
          notify();
        }
      }),
    getSelection,
    getSelection,
  );
}

export const useSettings = () => {
  const state = useGameSettingsSelector(selectGameSettingsState);
  const actions = useGameSettingsActions();
  return { ...state, ...actions };
};

export default SettingsContext;
