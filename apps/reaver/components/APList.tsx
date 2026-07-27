import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface AccessPoint {
  ssid: string;
  bssid: string;
  wps: 'enabled' | 'locked' | 'disabled';
}

const LockOpen = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      d="M10 2a4 4 0 00-4 4v2a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-5V6a2 2 0 114 0h2a4 4 0 00-4-4h-2z"
      clipRule="evenodd"
    />
  </svg>
);

const LockClosed = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      d="M5 8a5 5 0 1110 0v2a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2V8zm8-2a3 3 0 00-6 0v2h6V6z"
      clipRule="evenodd"
    />
  </svg>
);

const statusIcon = (status: AccessPoint['wps']) => {
  switch (status) {
    case 'enabled':
      return (
        <LockOpen className="w-6 h-6 text-green-400" aria-label="WPS enabled" />
      );
    case 'locked':
      return (
        <LockClosed className="w-6 h-6 text-yellow-400" aria-label="WPS locked" />
      );
    case 'disabled':
    default:
      return (
        <LockClosed className="w-6 h-6 text-red-400" aria-label="WPS disabled" />
      );
  }
};

const MIN_DELAY_MS = 300;
const MAX_DELAY_MS = 1200;
const DEFAULT_REFRESH_SECONDS = 8;

const APList: React.FC = () => {
  const [allAps, setAllAps] = useState<AccessPoint[]>([]);
  const [displayedAps, setDisplayedAps] = useState<AccessPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [refreshSeconds, setRefreshSeconds] = useState(DEFAULT_REFRESH_SECONDS);
  const [scanCycle, setScanCycle] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scheduledAddsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshIntervalMs = useMemo(
    () => Math.max(2, refreshSeconds) * 1000,
    [refreshSeconds],
  );

  const clearScheduledAdds = useCallback(() => {
    scheduledAddsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    scheduledAddsRef.current = [];
  }, []);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleScan = useCallback(() => {
    clearScheduledAdds();
    if (allAps.length === 0) {
      setDisplayedAps([]);
      return;
    }

    setScanCycle((cycle) => cycle + 1);
    setDisplayedAps([]);

    let accumulatedDelay = 0;
    const span = MAX_DELAY_MS - MIN_DELAY_MS;

    allAps.forEach((ap) => {
      const randomDelta = MIN_DELAY_MS + Math.random() * span;
      accumulatedDelay += randomDelta;
      const timeoutId = setTimeout(() => {
        setDisplayedAps((current) => {
          if (current.find((existing) => existing.bssid === ap.bssid)) {
            return current;
          }
          return [...current, ap];
        });
      }, accumulatedDelay);

      scheduledAddsRef.current.push(timeoutId);
    });
  }, [allAps, clearScheduledAdds]);

  const stopTimers = useCallback(() => {
    clearRefreshTimer();
    clearScheduledAdds();
  }, [clearRefreshTimer, clearScheduledAdds]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch('/demo-data/reaver/aps.json')
      .then((response) => response.json())
      .then((data: AccessPoint[]) => {
        if (!active) return;
        setAllAps(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setAllAps([]);
        setError('Unable to load sample access points.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isScanning || allAps.length === 0) {
      return;
    }

    scheduleScan();
    clearRefreshTimer();
    refreshTimerRef.current = setInterval(() => {
      scheduleScan();
    }, refreshIntervalMs);

    return () => {
      clearRefreshTimer();
      clearScheduledAdds();
    };
  }, [
    isScanning,
    allAps,
    refreshIntervalMs,
    scheduleScan,
    clearRefreshTimer,
    clearScheduledAdds,
  ]);

  useEffect(() => () => stopTimers(), [stopTimers]);

  const startScan = () => {
    setScanCycle(0);
    setDisplayedAps([]);
    setIsScanning(true);
  };

  const stopScan = () => {
    setIsScanning(false);
    stopTimers();
  };

  const handleRefreshChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = Number(event.target.value);
    if (Number.isNaN(value)) return;
    setRefreshSeconds(Math.min(30, Math.max(2, Math.round(value))));
  };

  const statusMessage = useMemo(() => {
    if (loading) {
      return 'Loading sample APs…';
    }
    if (error) {
      return error;
    }
    return isScanning ? 'Scanning for WPS-enabled access points…' : 'Scan paused';
  }, [loading, error, isScanning]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={startScan}
            className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 text-sm font-semibold"
            disabled={isScanning || loading || !!error || allAps.length === 0}
          >
            Start scan
          </button>
          <button
            type="button"
            onClick={stopScan}
            className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-400 text-sm font-semibold"
            disabled={!isScanning}
          >
            Stop scan
          </button>
        </div>
        <label className="text-sm text-gray-300">
          <span className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
            Refresh interval (seconds)
          </span>
          <input
            type="number"
            min={2}
            max={30}
            step={1}
            value={refreshSeconds}
            onChange={handleRefreshChange}
            className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </label>
        <p className="text-xs text-gray-400" aria-live="polite">
          <span className="font-semibold text-gray-300">Status:</span> {statusMessage}{' '}
          <span className="ml-2" data-testid="scan-cycle">
            Scan cycle: {scanCycle}
          </span>
        </p>
      </div>

      {!loading && !error && !isScanning && displayedAps.length === 0 ? (
        <p className="text-sm text-gray-400 mb-3">
          Press "Start scan" to simulate access point discovery.
        </p>
      ) : null}

      {isScanning && displayedAps.length === 0 ? (
        <p className="text-sm text-gray-400 mb-3" aria-live="polite">
          Listening for beacon frames…
        </p>
      ) : null}

      <ul
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4"
        aria-label="Simulated access points"
      >
        {displayedAps.map((ap) => (
          <li
            key={ap.bssid}
            className="ap-list-item flex items-center justify-between bg-gray-800 rounded p-3 shadow-sm"
          >
            <div>
              <div className="font-semibold">{ap.ssid}</div>
              <div className="text-xs font-mono text-gray-400">{ap.bssid}</div>
            </div>
            {statusIcon(ap.wps)}
          </li>
        ))}
      </ul>

      <style jsx>{`
        .ap-list-item {
          opacity: 0;
          transform: translateY(8px);
          animation: ap-list-fade 0.45s ease-out forwards;
        }

        @keyframes ap-list-fade {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default APList;
