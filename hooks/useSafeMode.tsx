'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const INP_DURATION_THRESHOLD = 250;
const MEMORY_THRESHOLD_BYTES = 320 * 1024 * 1024; // 320MB
const MEMORY_POLL_INTERVAL = 10000;

type SafeModeReason = 'inp' | 'memory' | 'manual';

type SafeModeTrigger = {
  reason: SafeModeReason;
  value: number;
  threshold: number;
  timestamp: number;
};

type SafeModeMetrics = {
  inp: number | null;
  memory: number | null;
};

type ManualOverrideState = 'auto' | 'forced-on' | 'forced-off';

type SafeModeContextValue = {
  safeModeActive: boolean;
  manualOverride: ManualOverrideState;
  metrics: SafeModeMetrics;
  trigger: SafeModeTrigger | null;
  lastTrigger: SafeModeTrigger | null;
  enableSafeMode: () => void;
  disableSafeMode: () => void;
  resetOverride: () => void;
  clearTrigger: () => void;
};

const defaultContext: SafeModeContextValue = {
  safeModeActive: false,
  manualOverride: 'auto',
  metrics: { inp: null, memory: null },
  trigger: null,
  lastTrigger: null,
  enableSafeMode: () => {},
  disableSafeMode: () => {},
  resetOverride: () => {},
  clearTrigger: () => {},
};

const SafeModeContext = createContext<SafeModeContextValue>(defaultContext);

const readMemoryUsage = (): number | null => {
  if (typeof performance === 'undefined') return null;
  const anyPerformance = performance as Performance & {
    memory?: { usedJSHeapSize?: number };
  };
  const memory = anyPerformance.memory?.usedJSHeapSize;
  if (typeof memory !== 'number' || !Number.isFinite(memory)) {
    return null;
  }
  return memory;
};

type SafeModeProviderProps = {
  children: ReactNode;
};

export const SafeModeProvider = ({ children }: SafeModeProviderProps) => {
  const [manualOverride, setManualOverride] = useState<ManualOverrideState>('auto');
  const [trigger, setTrigger] = useState<SafeModeTrigger | null>(null);
  const [lastTrigger, setLastTrigger] = useState<SafeModeTrigger | null>(null);
  const [metrics, setMetrics] = useState<SafeModeMetrics>({ inp: null, memory: null });
  const allowAutoRef = useRef(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    allowAutoRef.current = manualOverride !== 'forced-off';
  }, [manualOverride]);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const updateMetrics = useCallback((updates: Partial<SafeModeMetrics>) => {
    setMetrics((prev) => {
      let changed = false;
      const next: SafeModeMetrics = { ...prev };
      if (Object.prototype.hasOwnProperty.call(updates, 'inp') && updates.inp !== prev.inp) {
        next.inp = updates.inp ?? null;
        changed = true;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'memory') && updates.memory !== prev.memory) {
        next.memory = updates.memory ?? null;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, []);

  const pushTrigger = useCallback(
    (reason: SafeModeReason, value: number, threshold: number) => {
      const entry: SafeModeTrigger = {
        reason,
        value,
        threshold,
        timestamp: Date.now(),
      };
      setLastTrigger(entry);
      if (!allowAutoRef.current) {
        return;
      }
      setTrigger((prev) => {
        if (prev && prev.reason === reason && value <= prev.value) {
          return prev;
        }
        return entry;
      });
    },
    [],
  );

  const sampleMemory = useCallback(() => {
    const memory = readMemoryUsage();
    if (memory === null) return;
    updateMetrics({ memory });
    if (memory > MEMORY_THRESHOLD_BYTES) {
      pushTrigger('memory', memory, MEMORY_THRESHOLD_BYTES);
    }
  }, [pushTrigger, updateMetrics]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    if (typeof PerformanceObserver === 'undefined') {
      const interval = window.setInterval(sampleMemory, MEMORY_POLL_INTERVAL);
      sampleMemory();
      return () => {
        window.clearInterval(interval);
      };
    }

    const supportedTypes: string[] | undefined = (PerformanceObserver as unknown as {
      supportedEntryTypes?: string[];
    }).supportedEntryTypes;

    const supports = (type: string) => !supportedTypes || supportedTypes.includes(type);

    let inpObserver: PerformanceObserver | null = null;
    if (supports('event')) {
      try {
        inpObserver = new PerformanceObserver((list) => {
          if (!mountedRef.current) return;
          const entries = list.getEntries() as PerformanceEntry[];
          let maxDuration = 0;
          entries.forEach((entry) => {
            const interactionEntry = entry as PerformanceEventTiming;
            if (!('interactionId' in interactionEntry) || !interactionEntry.interactionId) {
              return;
            }
            if (interactionEntry.duration > maxDuration) {
              maxDuration = interactionEntry.duration;
            }
          });
          if (maxDuration > 0) {
            updateMetrics({ inp: maxDuration });
            if (maxDuration > INP_DURATION_THRESHOLD) {
              pushTrigger('inp', maxDuration, INP_DURATION_THRESHOLD);
            }
          }
        });
        (inpObserver as PerformanceObserver).observe(
          {
            type: 'event',
            buffered: true,
            durationThreshold: 16,
          } as PerformanceObserverInit,
        );
        const existing = typeof performance?.getEntriesByType === 'function'
          ? (performance.getEntriesByType('event') as PerformanceEntry[])
          : [];
        if (existing.length > 0) {
          const maxExisting = existing.reduce((acc, entry) => {
            const eventEntry = entry as PerformanceEventTiming;
            if (!eventEntry.interactionId) return acc;
            return Math.max(acc, eventEntry.duration);
          }, 0);
          if (maxExisting > 0) {
            updateMetrics({ inp: maxExisting });
            if (maxExisting > INP_DURATION_THRESHOLD) {
              pushTrigger('inp', maxExisting, INP_DURATION_THRESHOLD);
            }
          }
        }
      } catch {
        inpObserver = null;
      }
    }

    let longTaskObserver: PerformanceObserver | null = null;
    if (supports('longtask')) {
      try {
        longTaskObserver = new PerformanceObserver(() => {
          if (!mountedRef.current) return;
          sampleMemory();
        });
        longTaskObserver.observe({ entryTypes: ['longtask'], buffered: true });
      } catch {
        longTaskObserver = null;
      }
    }

    sampleMemory();
    const interval = window.setInterval(sampleMemory, MEMORY_POLL_INTERVAL);

    return () => {
      inpObserver?.disconnect();
      longTaskObserver?.disconnect();
      window.clearInterval(interval);
    };
  }, [pushTrigger, sampleMemory, updateMetrics]);

  const safeModeActive =
    manualOverride === 'forced-on' || (manualOverride !== 'forced-off' && trigger !== null);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    if (safeModeActive) {
      root.setAttribute('data-safe-mode', 'true');
      root.dataset.experiments = 'off';
      root.style.setProperty('--experiments-enabled', '0');
    } else {
      root.removeAttribute('data-safe-mode');
      if (root.dataset) {
        root.dataset.experiments = 'on';
      }
      root.style.setProperty('--experiments-enabled', '1');
    }
    return () => {
      root.removeAttribute('data-safe-mode');
      if (root.dataset) {
        delete root.dataset.experiments;
      }
      root.style.removeProperty('--experiments-enabled');
    };
  }, [safeModeActive]);

  const enableSafeMode = useCallback(() => {
    setManualOverride('forced-on');
    setLastTrigger({ reason: 'manual', value: 0, threshold: 0, timestamp: Date.now() });
  }, []);

  const disableSafeMode = useCallback(() => {
    setManualOverride('forced-off');
    setTrigger(null);
  }, []);

  const resetOverride = useCallback(() => {
    setManualOverride('auto');
  }, []);

  const clearTrigger = useCallback(() => {
    setTrigger(null);
    setLastTrigger(null);
  }, []);

  const value = useMemo<SafeModeContextValue>(
    () => ({
      safeModeActive,
      manualOverride,
      metrics,
      trigger,
      lastTrigger,
      enableSafeMode,
      disableSafeMode,
      resetOverride,
      clearTrigger,
    }),
    [
      clearTrigger,
      disableSafeMode,
      enableSafeMode,
      lastTrigger,
      manualOverride,
      metrics,
      resetOverride,
      safeModeActive,
      trigger,
    ],
  );

  return <SafeModeContext.Provider value={value}>{children}</SafeModeContext.Provider>;
};

export const useSafeMode = () => useContext(SafeModeContext);
