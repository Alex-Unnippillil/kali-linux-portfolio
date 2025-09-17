'use client';

import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';

interface BrowserContextValue {
  isIncognito: boolean;
  storagePrefix: string;
}

const BrowserContext = createContext<BrowserContextValue | null>(null);

interface BrowserProviderProps {
  isIncognito: boolean;
  children: ReactNode;
}

export const BrowserProvider = ({ isIncognito, children }: BrowserProviderProps) => {
  const value = useMemo<BrowserContextValue>(
    () => ({
      isIncognito,
      storagePrefix: isIncognito ? 'browser:incognito:' : 'browser:default:',
    }),
    [isIncognito],
  );

  return <BrowserContext.Provider value={value}>{children}</BrowserContext.Provider>;
};

export const useBrowserContext = () => {
  const ctx = useContext(BrowserContext);
  if (!ctx) {
    throw new Error('useBrowserContext must be used within a BrowserProvider');
  }
  return ctx;
};
