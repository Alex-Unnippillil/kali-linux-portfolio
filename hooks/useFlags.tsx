import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ensureClientSeed,
  evaluateFlags,
  flagDefinitions,
  FlagDecisions,
  FlagOverrides,
  mergeFlagOverrides,
  parseFlagOverridesFromSearch,
  readFlagOverridesFromStorage,
  writeFlagOverridesToStorage,
} from '../lib/flags';

interface FlagsProviderProps {
  initialSeed: string;
  initialDecisions: FlagDecisions;
  initialOverrides?: FlagOverrides;
  children: ReactNode;
}

interface FlagContextValue {
  seed: string;
  flags: FlagDecisions;
  overrides: FlagOverrides;
  setOverride: (flag: string, value: boolean | null | undefined) => void;
  isEnabled: (flag: string) => boolean;
}

const FlagsContext = createContext<FlagContextValue | undefined>(undefined);

const evaluateWithSeed = (
  seed: string,
  overrides: FlagOverrides,
): FlagDecisions => evaluateFlags(flagDefinitions, seed, overrides);

export const FlagsProvider = ({
  initialSeed,
  initialDecisions,
  initialOverrides,
  children,
}: FlagsProviderProps): JSX.Element => {
  const [seed, setSeed] = useState(initialSeed);
  const [flags, setFlags] = useState<FlagDecisions>(initialDecisions);
  const [overrides, setOverrides] = useState<FlagOverrides>(initialOverrides ?? {});

  useEffect(() => {
    setFlags(initialDecisions);
  }, [initialDecisions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storage = window.localStorage ?? null;
    const storageOverrides = readFlagOverridesFromStorage(storage);
    const queryOverrides = parseFlagOverridesFromSearch(window.location.search);
    const mergedOverrides = mergeFlagOverrides(storageOverrides, initialOverrides ?? {}, queryOverrides);
    const resolvedSeed = ensureClientSeed(storage, initialSeed);

    if (Object.keys(queryOverrides).length > 0) {
      const persisted = mergeFlagOverrides(storageOverrides, queryOverrides);
      writeFlagOverridesToStorage(storage, persisted);
    }

    setSeed(resolvedSeed);
    setOverrides(mergedOverrides);
    setFlags(evaluateWithSeed(resolvedSeed, mergedOverrides));
  }, [initialSeed, initialOverrides]);

  const setOverride = useCallback(
    (flag: string, value: boolean | null | undefined) => {
      setOverrides((current) => {
        const next = { ...current };
        if (typeof value === 'boolean') {
          next[flag] = value;
        } else {
          delete next[flag];
        }

        if (typeof window !== 'undefined') {
          writeFlagOverridesToStorage(window.localStorage ?? null, next);
        }

        setFlags(evaluateWithSeed(seed, next));
        return next;
      });
    },
    [seed],
  );

  const isEnabled = useCallback((flag: string) => flags[flag] ?? false, [flags]);

  const value = useMemo<FlagContextValue>(
    () => ({ seed, flags, overrides, setOverride, isEnabled }),
    [seed, flags, overrides, setOverride, isEnabled],
  );

  return <FlagsContext.Provider value={value}>{children}</FlagsContext.Provider>;
};

export const useFlags = (): FlagContextValue => {
  const context = useContext(FlagsContext);
  if (!context) {
    throw new Error('useFlags must be used inside a <FlagsProvider>');
  }
  return context;
};

export const useFlag = (flag: string): boolean => {
  const { isEnabled } = useFlags();
  return isEnabled(flag);
};

export const getFlagValue = (flags: FlagDecisions, flag: string): boolean => flags[flag] ?? false;

