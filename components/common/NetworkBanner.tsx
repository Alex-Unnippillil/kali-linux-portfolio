import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import clsx from 'clsx';

type ConnectionStatus = 'online' | 'offline';

type ConnectionSnapshot = {
  status: ConnectionStatus;
  metered: boolean;
  effectiveType?: string;
};

type SimulationMode = 'system' | 'offline' | 'online' | 'metered';

type NavigatorWithConnection = Navigator & {
  connection?: (NetworkInformation & {
    metered?: boolean;
  }) | null;
};

const readNavigatorSnapshot = (): ConnectionSnapshot => {
  if (typeof window === 'undefined') {
    return {
      status: 'online',
      metered: false,
    };
  }

  const nav = window.navigator as NavigatorWithConnection;
  const status: ConnectionStatus = nav.onLine ? 'online' : 'offline';
  const connection = nav.connection ?? null;

  const metered = Boolean(
    connection?.metered ?? connection?.saveData ?? false
  );

  return {
    status,
    metered,
    effectiveType: connection?.effectiveType ?? undefined,
  };
};

const isSnapshotEqual = (a: ConnectionSnapshot, b: ConnectionSnapshot) =>
  a.status === b.status && a.metered === b.metered && a.effectiveType === b.effectiveType;

const SIMULATION_STATE: Record<Exclude<SimulationMode, 'system'>, ConnectionSnapshot> = {
  offline: {
    status: 'offline',
    metered: false,
  },
  online: {
    status: 'online',
    metered: false,
  },
  metered: {
    status: 'online',
    metered: true,
  },
};

export interface NetworkBannerProps {
  className?: string;
  onRetry?: () => Promise<void> | void;
}

const NetworkBanner: React.FC<NetworkBannerProps> = ({ className = '', onRetry }) => {
  const [snapshot, setSnapshot] = useState<ConnectionSnapshot>(readNavigatorSnapshot);
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('system');
  const [isRetrying, setIsRetrying] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOfflineRef = useRef(false);
  const initializedRef = useRef(false);

  const simulatedState = useMemo(() => {
    if (simulationMode === 'system') return null;
    return SIMULATION_STATE[simulationMode];
  }, [simulationMode]);

  const effectiveSnapshot = simulatedState ?? snapshot;
  const effectiveStatus = effectiveSnapshot.status;
  const metered = effectiveSnapshot.metered;
  const devMode = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateSnapshot = () => {
      setSnapshot(prev => {
        const next = readNavigatorSnapshot();
        if (isSnapshotEqual(prev, next)) return prev;
        return next;
      });
    };

    updateSnapshot();

    window.addEventListener('online', updateSnapshot);
    window.addEventListener('offline', updateSnapshot);

    const nav = window.navigator as NavigatorWithConnection;
    const connection = nav.connection ?? null;

    let removeConnectionListener: (() => void) | undefined;

    if (connection) {
      const handleChange = () => updateSnapshot();
      if (typeof connection.addEventListener === 'function') {
        connection.addEventListener('change', handleChange);
        removeConnectionListener = () => {
          connection.removeEventListener?.('change', handleChange);
        };
      } else if ('onchange' in connection) {
        const previous = (connection as NetworkInformation & { onchange?: EventListener | null }).onchange;
        (connection as NetworkInformation & { onchange?: EventListener | null }).onchange = handleChange;
        removeConnectionListener = () => {
          (connection as NetworkInformation & { onchange?: EventListener | null }).onchange = previous ?? null;
        };
      }
    }

    return () => {
      window.removeEventListener('online', updateSnapshot);
      window.removeEventListener('offline', updateSnapshot);
      removeConnectionListener?.();
    };
  }, []);

  useEffect(() => {
    if (simulatedState) {
      setShowBackOnline(false);
      return;
    }

    let timeoutId: number | undefined;

    if (!initializedRef.current) {
      initializedRef.current = true;
      if (snapshot.status === 'offline') {
        wasOfflineRef.current = true;
      }
      setShowBackOnline(false);
      return () => undefined;
    }

    if (snapshot.status === 'offline') {
      wasOfflineRef.current = true;
      setShowBackOnline(false);
    } else if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setShowBackOnline(true);
      timeoutId = window.setTimeout(() => {
        setShowBackOnline(false);
      }, 4000);
    } else {
      setShowBackOnline(false);
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [snapshot.status, simulatedState]);

  const retryDisabled = effectiveStatus !== 'online' || isRetrying;

  const handleRetry = useCallback(async () => {
    if (!onRetry || retryDisabled) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, retryDisabled]);

  const handleSimulationChange = useCallback((value: SimulationMode) => {
    setSimulationMode(value);
  }, []);

  const shouldRenderBanner =
    effectiveStatus === 'offline' ||
    metered ||
    (showBackOnline && !simulatedState) ||
    simulationMode !== 'system';

  if (!shouldRenderBanner && !devMode) {
    return null;
  }

  const tone: 'offline' | 'metered' | 'online' = effectiveStatus === 'offline' ? 'offline' : metered ? 'metered' : 'online';

  let heading = '';
  let description = '';
  let actionLabel = 'Retry sync';

  if (tone === 'offline') {
    heading = 'Offline mode';
    description =
      'It looks like you are offline. Network features are paused until the connection recovers.';
    actionLabel = 'Retry sync';
  } else if (tone === 'metered') {
    heading = 'Metered connection detected';
    description =
      'Data saver is active, so heavy network calls are disabled. You can sync manually if needed.';
    actionLabel = 'Sync anyway';
  } else {
    heading = 'Back online';
    description = 'Connection restored. Network actions are available again.';
    actionLabel = 'Retry sync';
  }

  return (
    <section className={clsx('space-y-2 text-sm', className)} aria-live="polite">
      {shouldRenderBanner && (
        <div
          className={clsx(
            'flex flex-col gap-3 rounded-md border px-4 py-3 shadow-md backdrop-blur',
            tone === 'offline' && 'border-rose-500/70 bg-rose-950/60 text-rose-100',
            tone === 'metered' && 'border-amber-500/70 bg-amber-950/70 text-amber-100',
            tone === 'online' && 'border-emerald-500/70 bg-emerald-950/70 text-emerald-100'
          )}
          role="status"
          data-tone={tone}
        >
          <div>
            <h2 className="font-semibold uppercase tracking-wide">{heading}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-current/90">{description}</p>
            {tone !== 'offline' && effectiveSnapshot.effectiveType && (
              <p className="mt-1 text-xs text-current/70">
                Connection type: {effectiveSnapshot.effectiveType}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retryDisabled}
              className={clsx(
                'rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition',
                retryDisabled
                  ? 'cursor-not-allowed bg-black/40 text-current/40'
                  : tone === 'metered'
                  ? 'bg-amber-400/90 text-amber-950 hover:bg-amber-300'
                  : 'bg-white/90 text-slate-950 hover:bg-white'
              )}
            >
              {isRetrying ? 'Retrying…' : actionLabel}
            </button>
            {tone === 'offline' && (
              <span className="self-center text-[11px] uppercase tracking-wide text-current/60">
                Waiting for connection…
              </span>
            )}
          </div>
        </div>
      )}

      {devMode && (
        <div className="rounded-md border border-slate-700/70 bg-slate-900/60 p-3 text-xs text-slate-200">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold uppercase tracking-wide text-slate-300">
              Developer network controls
            </span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wide text-slate-400">
                  Simulate network state
                </span>
                <select
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
                  value={simulationMode}
                  onChange={event => handleSimulationChange(event.target.value as SimulationMode)}
                  aria-label="Simulate network state"
                >
                  <option value="system">System</option>
                  <option value="offline">Offline</option>
                  <option value="online">Force online</option>
                  <option value="metered">Metered</option>
                </select>
              </label>
              {simulationMode !== 'system' && (
                <button
                  type="button"
                  className="rounded border border-slate-600 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-200"
                  onClick={() => handleSimulationChange('system')}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            These controls are only visible in development and tests. They do not override production behaviour.
          </p>
        </div>
      )}
    </section>
  );
};

export default NetworkBanner;
