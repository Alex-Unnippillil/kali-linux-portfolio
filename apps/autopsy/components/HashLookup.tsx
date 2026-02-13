'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface LookupJob {
  id: number;
  hash: string;
  source: 'auto' | 'manual';
}

interface LookupRecord {
  id: number;
  hash: string;
  status: 'running' | 'complete' | 'error';
  result: string | null;
  startedAt: number;
  completedAt?: number;
  source: 'auto' | 'manual';
  errorMessage?: string;
}

const MAX_LOOKUPS_PER_SECOND = 3;
const ONE_SECOND = 1000;
const DEBOUNCE_DELAY = 300;

const normalizeHash = (value: string) => value.trim().toLowerCase();

const HashLookup: React.FC = () => {
  const [input, setInput] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [hashDatabase, setHashDatabase] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<LookupRecord[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const queueRef = useRef<LookupJob[]>([]);
  const inFlightRef = useRef(0);
  const dispatchTimesRef = useRef<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idCounterRef = useRef(0);
  const lastAutoValueRef = useRef('');

  const updatePending = useCallback(() => {
    setPendingCount(queueRef.current.length + inFlightRef.current);
  }, []);

  const clearScheduledTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startLookup = useCallback(
    (job: LookupJob) => {
      const startedAt = Date.now();
      setHistory((prev) => [
        ...prev,
        {
          id: job.id,
          hash: job.hash,
          status: 'running',
          result: null,
          startedAt,
          source: job.source,
        },
      ]);
    },
    []
  );

  const finalizeLookup = useCallback(
    (jobId: number, result: string | null, errorMessage?: string) => {
      setHistory((prev) =>
        prev.map((entry) =>
          entry.id === jobId
            ? {
                ...entry,
                status: errorMessage ? 'error' : 'complete',
                result,
                completedAt: Date.now(),
                errorMessage,
              }
            : entry
        )
      );
    },
    []
  );

  const performLookup = useCallback(
    async (job: LookupJob) => {
      const normalized = normalizeHash(job.hash);
      await new Promise((resolve) => setTimeout(resolve, 200));
      const match = hashDatabase[normalized] ?? null;
      finalizeLookup(job.id, match);
    },
    [hashDatabase, finalizeLookup]
  );

  const processQueue = useCallback(() => {
    if (queueRef.current.length === 0) {
      clearScheduledTimer();
      return;
    }

    const now = Date.now();
    dispatchTimesRef.current = dispatchTimesRef.current.filter(
      (time) => now - time < ONE_SECOND
    );

    if (dispatchTimesRef.current.length >= MAX_LOOKUPS_PER_SECOND) {
      const wait = Math.max(0, ONE_SECOND - (now - dispatchTimesRef.current[0]));
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          processQueue();
        }, wait);
      }
      updatePending();
      return;
    }

    const nextJob = queueRef.current.shift();
    if (!nextJob) {
      updatePending();
      return;
    }

    clearScheduledTimer();
    dispatchTimesRef.current.push(now);
    inFlightRef.current += 1;
    updatePending();
    startLookup(nextJob);

    performLookup(nextJob)
      .catch(() => {
        finalizeLookup(nextJob.id, null, 'Lookup failed');
      })
      .finally(() => {
        inFlightRef.current -= 1;
        updatePending();
        processQueue();
      });
  }, [
    clearScheduledTimer,
    finalizeLookup,
    performLookup,
    startLookup,
    updatePending,
  ]);

  const enqueueLookup = useCallback(
    (hash: string, source: 'auto' | 'manual') => {
      const normalized = normalizeHash(hash);
      if (!normalized) return;
      const job: LookupJob = {
        id: ++idCounterRef.current,
        hash: normalized,
        source,
      };
      queueRef.current.push(job);
      updatePending();
      processQueue();
    },
    [processQueue, updatePending]
  );

  useEffect(() => {
    let isMounted = true;
    setIsLoadingData(true);
    fetch('/demo-data/autopsy/hashes.json')
      .then((res) => res.json())
      .then((data: Record<string, string>) => {
        if (!isMounted) return;
        const normalized = Object.fromEntries(
          Object.entries(data || {}).map(([key, value]) => [
            key.toLowerCase(),
            value,
          ])
        );
        setHashDatabase(normalized);
        setDataError(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setDataError('Failed to load hash database');
        setHashDatabase({});
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingData(false);
        }
      });

    return () => {
      isMounted = false;
      clearScheduledTimer();
    };
  }, [clearScheduledTimer]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedInput(normalizeHash(input));
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(handle);
  }, [input]);

  useEffect(() => {
    if (!debouncedInput) {
      lastAutoValueRef.current = '';
      return;
    }
    if (debouncedInput === lastAutoValueRef.current) return;
    lastAutoValueRef.current = debouncedInput;
    enqueueLookup(debouncedInput, 'auto');
  }, [debouncedInput, enqueueLookup]);

  const pendingLabel = useMemo(() => {
    if (pendingCount === 0) return '';
    return pendingCount === 1
      ? '1 lookup pending'
      : `${pendingCount} lookups pending`;
  }, [pendingCount]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold mb-1" htmlFor="hash-input">
          Hash lookup
        </label>
        <input
          id="hash-input"
          className="w-full bg-ub-grey text-white rounded px-3 py-2"
          placeholder="Enter a SHA-256 hash"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="flex items-center space-x-2">
        <button
          type="button"
          className="px-3 py-1 bg-ub-orange text-black rounded disabled:opacity-50"
          onClick={() => enqueueLookup(input, 'manual')}
          disabled={!normalizeHash(input)}
        >
          Queue lookup
        </button>
        {pendingCount > 0 && (
          <div
            data-testid="pending-indicator"
            role="status"
            aria-live="polite"
            className="flex items-center space-x-2 text-sm text-ub-orange"
          >
            <span
              className="inline-block h-3 w-3 border-2 border-ub-orange border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>{pendingLabel}</span>
          </div>
        )}
      </div>
      {isLoadingData && (
        <div className="text-xs text-gray-400">Loading hash database…</div>
      )}
      {dataError && (
        <div className="text-xs text-red-400" role="alert">
          {dataError}
        </div>
      )}
      <div>
        <h3 className="text-sm font-semibold mb-2">Lookup history</h3>
        {history.length === 0 ? (
          <div className="text-xs text-gray-400">No lookups yet.</div>
        ) : (
          <ul className="space-y-2 text-xs" data-testid="lookup-history">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="rounded bg-ub-grey px-3 py-2"
                data-testid="lookup-row"
                data-start={entry.startedAt}
                data-status={entry.status}
                data-source={entry.source}
              >
                <div className="font-mono break-all">{entry.hash}</div>
                <div className="mt-1">
                  Status:{' '}
                  <span className="font-semibold capitalize">{entry.status}</span>
                  {entry.status === 'complete' && (
                    <>
                      {' '}
                      — {entry.result ? `Matched ${entry.result}` : 'No match'}
                    </>
                  )}
                  {entry.status === 'error' && entry.errorMessage && (
                    <>
                      {' '}
                      — {entry.errorMessage}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HashLookup;

