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

export type ExperimentFlags = Record<string, boolean>;

export type ExperimentFlagLoader = () => Promise<ExperimentFlags>;

interface ExperimentContextValue {
  flags: ExperimentFlags;
  loading: boolean;
  ready: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getFlag: (key: string) => boolean | undefined;
}

const ExperimentContext = createContext<ExperimentContextValue | undefined>(undefined);

const NORMALIZE_TRUE = new Set(['1', 'true', 'enabled', 'on']);
const NORMALIZE_FALSE = new Set(['0', 'false', 'disabled', 'off']);

const sanitizeFlags = (raw: Record<string, unknown> | null | undefined): ExperimentFlags => {
  if (!raw || typeof raw !== 'object') return {};
  const result: ExperimentFlags = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key) continue;
    if (typeof value === 'boolean') {
      result[key] = value;
      continue;
    }
    if (typeof value === 'number') {
      result[key] = value !== 0;
      continue;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (NORMALIZE_TRUE.has(normalized)) {
        result[key] = true;
        continue;
      }
      if (NORMALIZE_FALSE.has(normalized)) {
        result[key] = false;
        continue;
      }
    }
  }
  return result;
};

const parseJsonFlags = (value: string | undefined): ExperimentFlags => {
  if (!value) return {};
  const trimmed = value.trim();
  if (!trimmed) return {};
  if (trimmed === 'true') {
    return { all: true };
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      return sanitizeFlags(parsed as Record<string, unknown>);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to parse experiment flag JSON', error);
    }
  }
  return {};
};

const defaultLoader: ExperimentFlagLoader = async () => {
  if (typeof fetch === 'function') {
    try {
      const response = await fetch('/api/experiments', { cache: 'no-store' });
      if (response.ok) {
        const payload = await response.json();
        const raw =
          (payload && typeof payload === 'object' && 'flags' in payload
            ? (payload as { flags?: Record<string, unknown> }).flags
            : payload) ?? {};
        return sanitizeFlags(raw);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to fetch experiment flags', error);
      }
    }
  }

  return parseJsonFlags(process.env.NEXT_PUBLIC_UI_EXPERIMENTS);
};

export const ExperimentsProvider = ({
  children,
  loader = defaultLoader,
  initialFlags,
}: {
  children: ReactNode;
  loader?: ExperimentFlagLoader;
  initialFlags?: ExperimentFlags;
}) => {
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const [flags, setFlags] = useState<ExperimentFlags>(initialFlags ?? {});
  const [loading, setLoading] = useState<boolean>(initialFlags === undefined);
  const [error, setError] = useState<Error | null>(null);

  const runLoad = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loaderRef.current();
      setFlags(result ?? {});
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load experiment flags'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!loading && initialFlags !== undefined) return;
      setLoading(true);
      try {
        const result = await loaderRef.current();
        if (!cancelled) {
          setFlags(result ?? {});
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load experiment flags'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load().catch(() => {
      // errors handled above
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<ExperimentContextValue>(() => {
    const allEnabled = flags.all === true;
    const getFlag = (key: string) => {
      if (allEnabled) return true;
      return flags[key];
    };
    return {
      flags,
      loading,
      ready: !loading,
      error,
      refresh: runLoad,
      getFlag,
    };
  }, [error, flags, loading, runLoad]);

  return <ExperimentContext.Provider value={value}>{children}</ExperimentContext.Provider>;
};

export const useExperiments = (): ExperimentContextValue => {
  const ctx = useContext(ExperimentContext);
  if (!ctx) {
    throw new Error('useExperiments must be used within ExperimentsProvider');
  }
  return ctx;
};

export default ExperimentsProvider;
