import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useInputMode, { InputMode, PointerType } from '../../hooks/useInputMode';
import {
  DensityLock,
  DensityPreference,
  displayDefaults,
  getDensityLock,
  getDensityPreference,
  setDensityLock as persistDensityLock,
  setDensityPreference as persistDensityPreference,
} from '../../utils/settings/display';

interface DensityTokens {
  inlineGap: string;
  stackGap: string;
  control: string;
  surface: string;
  text: string;
  subtleText: string;
}

interface DesktopContextValue {
  density: DensityPreference;
  preferredDensity: DensityPreference;
  setPreferredDensity: (value: DensityPreference) => void;
  densityLock: DensityLock;
  setDensityLock: (lock: DensityLock) => void;
  inputMode: InputMode;
  pointerType: PointerType;
  isTouch: boolean;
  tokens: DensityTokens;
}

const DesktopContext = createContext<DesktopContextValue>({
  density: displayDefaults.density,
  preferredDensity: displayDefaults.density,
  setPreferredDensity: () => {},
  densityLock: displayDefaults.lock,
  setDensityLock: () => {},
  inputMode: 'pointer',
  pointerType: 'mouse',
  isTouch: false,
  tokens: {
    inlineGap: 'gap-2',
    stackGap: 'space-y-2',
    control: 'min-h-hit-target px-4 py-2',
    surface: 'px-4 py-3',
    text: 'text-base',
    subtleText: 'text-sm',
  },
});

export const useDesktop = () => useContext(DesktopContext);

interface DesktopProviderProps {
  children: React.ReactNode;
}

const compactTokens = {
  inlineGap: 'gap-[var(--density-gap-inline)]',
  stackGap: 'space-y-[var(--density-gap-block)]',
  control: 'min-h-hit-target px-[var(--density-pad-x)] py-[var(--density-pad-y)]',
  surface: 'px-[var(--density-surface-x)] py-[var(--density-surface-y)]',
  text: 'text-sm',
  subtleText: 'text-xs',
};

const regularTokens = {
  inlineGap: 'gap-[var(--density-gap-inline)]',
  stackGap: 'space-y-[var(--density-gap-block)]',
  control: 'min-h-hit-target px-[var(--density-pad-x)] py-[var(--density-pad-y)]',
  surface: 'px-[var(--density-surface-x)] py-[var(--density-surface-y)]',
  text: 'text-base',
  subtleText: 'text-sm',
};

const DesktopProvider: React.FC<DesktopProviderProps> = ({ children }) => {
  const [preferredDensity, setPreferredDensityState] = useState<DensityPreference>(
    displayDefaults.density,
  );
  const [densityLock, setDensityLockState] = useState<DensityLock>(displayDefaults.lock);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedDensity, storedLock] = await Promise.all([
        getDensityPreference(),
        getDensityLock(),
      ]);
      if (cancelled) return;
      setPreferredDensityState(storedDensity);
      setDensityLockState(storedLock);
      hydratedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pointerOverride: PointerType | null = densityLock === 'touch' ? 'touch' : null;
  const { inputMode, pointerType } = useInputMode({ pointerOverride });
  const isTouch = pointerOverride === 'touch' || pointerType === 'touch';
  const density = densityLock === 'touch' ? 'regular' : preferredDensity;

  useEffect(() => {
    if (!hydratedRef.current) return;
    persistDensityPreference(preferredDensity);
  }, [preferredDensity]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    persistDensityLock(densityLock);
  }, [densityLock]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.pointerType = pointerOverride ?? pointerType;
    root.dataset.inputMode = inputMode;
    root.dataset.density = density;
    root.dataset.touch = isTouch ? 'true' : 'false';

    const inlineGap = density === 'compact' ? '0.5rem' : '0.75rem';
    const blockGap = density === 'compact' ? '0.5rem' : '0.75rem';
    const padX = density === 'compact' ? '0.75rem' : '1rem';
    const padY = density === 'compact' ? '0.25rem' : '0.5rem';
    const surfaceX = density === 'compact' ? '0.75rem' : '1rem';
    const surfaceY = density === 'compact' ? '0.75rem' : '1rem';
    const hitTarget = isTouch ? '2.75rem' : density === 'compact' ? '2.25rem' : '2.5rem';

    root.style.setProperty('--density-gap-inline', inlineGap);
    root.style.setProperty('--density-gap-block', blockGap);
    root.style.setProperty('--density-pad-x', padX);
    root.style.setProperty('--density-pad-y', padY);
    root.style.setProperty('--density-surface-x', surfaceX);
    root.style.setProperty('--density-surface-y', surfaceY);
    root.style.setProperty('--hit-target', hitTarget);

    root.classList.remove('density-compact', 'density-regular');
    root.classList.add(density === 'compact' ? 'density-compact' : 'density-regular');
  }, [density, inputMode, isTouch, pointerOverride, pointerType]);

  const handlePreferredDensity = useCallback((value: DensityPreference) => {
    setPreferredDensityState(value);
  }, []);

  const handleDensityLock = useCallback((value: DensityLock) => {
    setDensityLockState(value);
  }, []);

  const tokens = useMemo(() => (density === 'compact' ? compactTokens : regularTokens), [density]);

  const contextValue = useMemo<DesktopContextValue>(
    () => ({
      density,
      preferredDensity,
      setPreferredDensity: handlePreferredDensity,
      densityLock,
      setDensityLock: handleDensityLock,
      inputMode,
      pointerType,
      isTouch,
      tokens,
    }),
    [density, preferredDensity, handlePreferredDensity, densityLock, handleDensityLock, inputMode, pointerType, isTouch, tokens],
  );

  return <DesktopContext.Provider value={contextValue}>{children}</DesktopContext.Provider>;
};

export default DesktopProvider;
