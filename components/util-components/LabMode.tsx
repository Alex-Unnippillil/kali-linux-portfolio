"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

type FeatureFlags = {
  betaBadge: boolean;
  betaTooltip: string;
};

type LabModeContextValue = {
  enabled: boolean;
  toggle: () => void;
  featureFlags: FeatureFlags;
};

type LabModeProviderProps = {
  children: ReactNode;
};

type LabModeProps = {
  children: ReactNode;
};

const DEFAULT_TOOLTIP =
  'Lab Mode unlocks experimental workflows. Enable it from a lab-enabled window to explore simulations safely.';

const getFeatureFlags = (): FeatureFlags => {
  const showBetaBadge = process.env.NEXT_PUBLIC_SHOW_BETA === '1';
  if (!showBetaBadge) {
    return { betaBadge: false, betaTooltip: '' };
  }

  const rawTooltip = process.env.NEXT_PUBLIC_BETA_TOOLTIP;
  if (typeof rawTooltip === 'string') {
    if (rawTooltip.trim().toLowerCase() === 'off') {
      return { betaBadge: true, betaTooltip: '' };
    }
    if (rawTooltip.trim().length > 0) {
      return { betaBadge: true, betaTooltip: rawTooltip.trim() };
    }
  }

  return { betaBadge: true, betaTooltip: DEFAULT_TOOLTIP };
};

const LabModeContext = createContext<LabModeContextValue | undefined>(undefined);

export function LabModeProvider({ children }: LabModeProviderProps) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lab-mode');
      if (stored === 'true') {
        setEnabled(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((previous) => {
      const next = !previous;
      try {
        localStorage.setItem('lab-mode', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const featureFlags = useMemo(() => getFeatureFlags(), []);

  const value = useMemo(
    () => ({
      enabled,
      toggle,
      featureFlags,
    }),
    [enabled, toggle, featureFlags],
  );

  return <LabModeContext.Provider value={value}>{children}</LabModeContext.Provider>;
}

export function useLabMode(): LabModeContextValue {
  const context = useContext(LabModeContext);
  if (!context) {
    throw new Error('useLabMode must be used within a LabModeProvider');
  }
  return context;
}

export default function LabMode({ children }: LabModeProps) {
  const { enabled, toggle } = useLabMode();

  return (
    <div className="h-full w-full">
      <div
        className="flex items-center justify-between bg-ub-yellow p-2 text-xs text-black"
        aria-label="training banner"
      >
        <span>
          {enabled
            ? 'Lab Mode enabled: all actions are simulated.'
            : 'Lab Mode disabled: enable to use training features.'}
        </span>
        <button onClick={toggle} className="bg-ub-green px-2 py-1 text-black" type="button">
          {enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      {enabled && <div className="h-full overflow-auto">{children}</div>}
    </div>
  );
}
