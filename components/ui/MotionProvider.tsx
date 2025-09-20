import React, { createContext, useContext, useEffect, useMemo } from 'react';
import useReducedMotion from '../../hooks/useReducedMotion';
import {
  createMotionSystem,
  defaultMotionSystem,
  type MotionOverrides,
  type MotionSystem,
} from '../../utils/motion';
import MotionOverlay from '../devtools/MotionOverlay';

type MotionProviderProps = React.PropsWithChildren<{
  debug?: boolean;
  overrides?: MotionOverrides;
}>;

export const MotionContext = createContext<MotionSystem>(defaultMotionSystem);
MotionContext.displayName = 'MotionContext';

const DEFAULT_DEBUG =
  process.env.NEXT_PUBLIC_MOTION_DEBUG === 'true' || process.env.NODE_ENV === 'development';

const useMotionCssVariables = (system: MotionSystem) => {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const previous = new Map<string, string>();
    Object.entries(system.cssVariables).forEach(([key, value]) => {
      previous.set(key, root.style.getPropertyValue(key));
      root.style.setProperty(key, value);
    });

    return () => {
      previous.forEach((value, key) => {
        if (value) {
          root.style.setProperty(key, value);
        } else {
          root.style.removeProperty(key);
        }
      });
    };
  }, [system]);
};

export const MotionProvider: React.FC<MotionProviderProps> = ({
  children,
  debug,
  overrides,
}) => {
  const reducedMotionState = useReducedMotion();

  const system = useMemo(
    () =>
      createMotionSystem({
        reducedMotion: reducedMotionState.reducedMotion,
        overrides,
      }),
    [reducedMotionState.reducedMotion, overrides],
  );

  useMotionCssVariables(system);

  const shouldDebug = (debug ?? DEFAULT_DEBUG) && typeof window !== 'undefined';

  return (
    <MotionContext.Provider value={system}>
      {children}
      {shouldDebug ? <MotionOverlay reducedMotionState={reducedMotionState} /> : null}
    </MotionContext.Provider>
  );
};

export const useMotion = () => useContext(MotionContext);

export default MotionProvider;
