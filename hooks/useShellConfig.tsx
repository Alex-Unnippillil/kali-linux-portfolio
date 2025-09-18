import { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const OPTIONAL_MODULE_IDS = [
  'plugin-manager',
  'metasploit',
  'wireshark',
  'autopsy',
  'volatility',
  'hydra',
  'john',
  'ettercap',
  'dsniff',
  'reaver',
  'beef',
  'radare2',
  'ghidra',
  'hashcat',
  'mimikatz',
  'mimikatz/offline',
  'msf-post',
  'nmap-nse',
  'openvas',
  'recon-ng',
];

const STORAGE_KEY = 'shell:last-known-good';

type ShellSnapshot = {
  disabledAppIds: string[];
  timestamp: number;
};

interface ShellConfigValue {
  safeMode: boolean;
  optionalAppIds: string[];
  disabledAppIds: string[];
  version: number;
  lastKnownGood: ShellSnapshot | null;
  enterSafeMode: () => void;
  exitSafeMode: () => void;
  setSafeMode: (enabled: boolean) => void;
  restartWithLastKnownGood: () => void;
  isAppDisabled: (id: string) => boolean;
}

const defaultValue: ShellConfigValue = {
  safeMode: false,
  optionalAppIds: [],
  disabledAppIds: [],
  version: 0,
  lastKnownGood: null,
  enterSafeMode: () => {},
  exitSafeMode: () => {},
  setSafeMode: () => {},
  restartWithLastKnownGood: () => {},
  isAppDisabled: () => false,
};

export const ShellConfigContext = createContext<ShellConfigValue>(defaultValue);

export function ShellConfigProvider({ children }: { children: ReactNode }) {
  const optionalAppIds = useMemo(() => [...OPTIONAL_MODULE_IDS], []);
  const optionalAppSet = useMemo(() => new Set(optionalAppIds), [optionalAppIds]);
  const [safeMode, setSafeModeState] = useState(false);
  const [disabledAppIds, setDisabledAppIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const snapshot = JSON.parse(stored) as ShellSnapshot;
      if (snapshot && Array.isArray(snapshot.disabledAppIds)) {
        window.sessionStorage.removeItem(STORAGE_KEY);
        return [...snapshot.disabledAppIds];
      }
      return [];
    } catch {
      return [];
    }
  });
  const disabledAppSet = useMemo(() => new Set(disabledAppIds), [disabledAppIds]);
  const [lastKnownGood, setLastKnownGood] = useState<ShellSnapshot | null>(null);
  const snapshotRef = useRef<ShellSnapshot | null>(null);
  const [version, setVersion] = useState(0);

  const captureSnapshot = useCallback((): ShellSnapshot => {
    return {
      disabledAppIds: Array.from(disabledAppSet),
      timestamp: Date.now(),
    };
  }, [disabledAppSet]);

  const applySnapshot = useCallback((snapshot: ShellSnapshot | null) => {
    if (snapshot) {
      setDisabledAppIds([...snapshot.disabledAppIds]);
    } else {
      setDisabledAppIds([]);
    }
    setVersion((value) => value + 1);
  }, []);

  const enterSafeMode = useCallback(() => {
    if (safeMode) return;
    const snapshot = captureSnapshot();
    snapshotRef.current = snapshot;
    setLastKnownGood(snapshot);
    setSafeModeState(true);
    setDisabledAppIds(Array.from(optionalAppSet));
    setVersion((value) => value + 1);
  }, [safeMode, captureSnapshot, optionalAppSet]);

  const exitSafeMode = useCallback(() => {
    if (!safeMode) return;
    setSafeModeState(false);
    applySnapshot(snapshotRef.current);
  }, [safeMode, applySnapshot]);

  const setSafeModeFlag = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        enterSafeMode();
      } else {
        exitSafeMode();
      }
    },
    [enterSafeMode, exitSafeMode],
  );

  const restartWithLastKnownGood = useCallback(() => {
    const snapshot = snapshotRef.current;
    setSafeModeState(false);
    applySnapshot(snapshot);
    if (typeof window !== 'undefined') {
      try {
        if (snapshot) {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        } else {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        /* ignore storage failures */
      }
      setTimeout(() => {
        window.location.href = '/';
      }, 10);
    }
  }, [applySnapshot]);

  const isAppDisabled = useCallback(
    (id: string) => {
      if (safeMode && optionalAppSet.has(id)) {
        return true;
      }
      return disabledAppSet.has(id);
    },
    [safeMode, optionalAppSet, disabledAppSet],
  );

  const value = useMemo(
    () => ({
      safeMode,
      optionalAppIds,
      disabledAppIds,
      version,
      lastKnownGood,
      enterSafeMode,
      exitSafeMode,
      setSafeMode: setSafeModeFlag,
      restartWithLastKnownGood,
      isAppDisabled,
    }),
    [
      safeMode,
      optionalAppIds,
      disabledAppIds,
      version,
      lastKnownGood,
      enterSafeMode,
      exitSafeMode,
      setSafeModeFlag,
      restartWithLastKnownGood,
      isAppDisabled,
    ],
  );

  return <ShellConfigContext.Provider value={value}>{children}</ShellConfigContext.Provider>;
}

export function useShellConfig() {
  return useContext(ShellConfigContext);
}
