import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { snapshotTokens, type TokenValue } from './tokens';
import { useTheme } from '../../hooks/useTheme';
import { useSettings } from '../../hooks/useSettings';

interface DesignTokenContextValue {
  colors: TokenValue[];
  spacing: TokenValue[];
  typography: TokenValue[];
  radius: TokenValue[];
  motion: TokenValue[];
  refresh: () => void;
}

const initialState = snapshotTokens();

const DesignTokenContext = createContext<DesignTokenContextValue>({
  ...initialState,
  refresh: () => {},
});

export const DesignTokenProvider = ({ children }: { children: ReactNode }) => {
  const { theme } = useTheme();
  const { accent, density, fontScale, highContrast, largeHitAreas, reducedMotion } = useSettings();
  const [tokens, setTokens] = useState(initialState);

  const refresh = useCallback(() => {
    setTokens(snapshotTokens());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, theme, accent, density, fontScale, highContrast, largeHitAreas, reducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const observer = new MutationObserver(() => refresh());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    return () => observer.disconnect();
  }, [refresh]);

  const value = useMemo(
    () => ({
      ...tokens,
      refresh,
    }),
    [tokens, refresh],
  );

  return <DesignTokenContext.Provider value={value}>{children}</DesignTokenContext.Provider>;
};

export const useDesignTokens = () => useContext(DesignTokenContext);
