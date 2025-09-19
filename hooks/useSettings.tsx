import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  createSettingsStore,
  selectSettingsState,
  type SettingsActions,
  type SettingsState,
  type SettingsStore,
} from '../state/settingsStore';

export {
  selectAccent,
  selectAllowNetwork,
  selectDensity,
  selectFontScale,
  selectHaptics,
  selectHighContrast,
  selectLargeHitAreas,
  selectPongSpin,
  selectReducedMotion,
  selectSettingsState,
  selectTheme,
  selectWallpaper,
} from '../state/settingsStore';

export const ACCENT_OPTIONS = [
  '#1793d1',
  '#e53e3e',
  '#d97706',
  '#38a169',
  '#805ad5',
  '#ed64a6',
];

const SettingsContext = createContext<SettingsStore | null>(null);
const fallbackStore = createSettingsStore();
let fallbackHydrated = false;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<SettingsStore>();

  if (!storeRef.current) {
    storeRef.current = createSettingsStore();
  }

  useEffect(() => {
    void storeRef.current?.hydrate();
  }, []);

  return (
    <SettingsContext.Provider value={storeRef.current}>
      {children}
    </SettingsContext.Provider>
  );
}

const useSettingsStore = () => {
  const store = useContext(SettingsContext);
  if (store) return store;
  if (!fallbackHydrated && typeof window !== 'undefined') {
    fallbackStore.hydrate();
    fallbackHydrated = true;
  }
  return fallbackStore;
};

export function useSettingsSelector<T>(
  selector: (state: SettingsState) => T,
  equalityFn: (a: T, b: T) => boolean = Object.is,
): T {
  const store = useSettingsStore();
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

export const useSettingsActions = (): SettingsActions => {
  const store = useSettingsStore();
  return store.getActions();
};

export const useSettings = () => {
  const state = useSettingsSelector(selectSettingsState);
  const actions = useSettingsActions();
  return { ...state, ...actions };
};
