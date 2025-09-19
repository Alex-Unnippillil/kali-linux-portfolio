'use client';

import React, { useEffect, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import {
  onFetchProxy,
  getActiveFetches,
  FetchEntry,
  API_TIMEOUT_MS,
} from '../../../lib/fetchProxy';
import { API_BROADCAST_CHANNEL, API_CACHE_NAME } from '../../../lib/pwa/runtimeCaching.js';
import { exportMetrics } from '../export';
import RequestChart from './RequestChart';

const HISTORY_KEY = 'network-insights-history';

const formatBytes = (bytes?: number) =>
  typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} kB` : '—';

const toPathname = (input: string) => {
  try {
    return new URL(input, typeof window !== 'undefined' ? window.location.href : undefined).pathname;
  } catch {
    return input;
  }
};

export default function NetworkInsights() {
  const [active, setActive] = useState<FetchEntry[]>(getActiveFetches());
  const [history, setHistory] = usePersistentState<FetchEntry[]>(HISTORY_KEY, []);
  const [lastTimeout, setLastTimeout] = useState<FetchEntry | null>(null);
  const [lastRefreshPath, setLastRefreshPath] = useState<string | null>(null);

  useEffect(() => {
    const unsubStart = onFetchProxy('start', () => setActive(getActiveFetches()));
    const unsubEnd = onFetchProxy('end', (e: CustomEvent<FetchEntry>) => {
      setActive(getActiveFetches());
      setHistory((h) => [...h, e.detail]);
      if (e.detail.timedOut && !e.detail.error) {
        setLastRefreshPath(toPathname(e.detail.url));
      }
    });
    const unsubTimeout = onFetchProxy('timeout', (e: CustomEvent<FetchEntry>) => {
      setLastTimeout(e.detail);
    });

    let channel: BroadcastChannel | null = null;
    let serviceWorkerListener: ((event: MessageEvent) => void) | null = null;

    const handleBroadcast = (data: any) => {
      if (!data || data.type !== 'CACHE_UPDATED') return;
      const payload = data.payload || {};
      if (payload.cacheName !== API_CACHE_NAME || !payload.updatedUrl) return;
      setLastRefreshPath(toPathname(payload.updatedUrl));
    };

    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(API_BROADCAST_CHANNEL);
      channel.addEventListener('message', (event) => handleBroadcast(event.data));
    } else if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      serviceWorkerListener = (event: MessageEvent) => {
        if (!event?.data) return;
        handleBroadcast(event.data);
      };
      try {
        navigator.serviceWorker.addEventListener('message', serviceWorkerListener);
      } catch {
        // ignore failures from unsupported browsers
      }
    }

    return () => {
      unsubStart();
      unsubEnd();
      unsubTimeout();
      if (channel) {
        try {
          channel.close();
        } catch {
          // ignore
        }
      }
      if (serviceWorkerListener && navigator?.serviceWorker) {
        try {
          navigator.serviceWorker.removeEventListener('message', serviceWorkerListener);
        } catch {
          // ignore
        }
      }
    };
  }, [setHistory]);

  return (
    <div className="p-2 text-xs text-white bg-[var(--kali-bg)]">
      {lastTimeout && (
        <div className="mb-2 rounded border border-amber-600 bg-[var(--kali-panel)]/60 p-2 text-amber-200">
          <div className="font-semibold">Timeout fallback in use</div>
          <div className="truncate">
            {lastTimeout.method} {toPathname(lastTimeout.url)}
          </div>
          <div>
            Timed out after
            {' '}
            {Math.round(
              (lastTimeout.timeoutAt ?? lastTimeout.endTime ?? lastTimeout.startTime + API_TIMEOUT_MS) -
                lastTimeout.startTime,
            )}
            ms · retrying in background
          </div>
        </div>
      )}
      {lastRefreshPath && (
        <div className="mb-2 rounded border border-sky-600 bg-[var(--kali-panel)]/60 p-2 text-sky-200">
          <div className="font-semibold">Background refresh completed</div>
          <div>{lastRefreshPath}</div>
        </div>
      )}
      <h2 className="font-bold mb-1">Active Fetches</h2>
      <ul className="mb-2 divide-y divide-gray-700 border border-gray-700 rounded bg-[var(--kali-panel)]">
        {active.length === 0 && <li className="p-1 text-gray-400">None</li>}
        {active.map((f) => (
          <li key={f.id} className="p-1">
            <div className="truncate">
              {f.method} {f.url}
            </div>
            <div className="text-gray-400">
              {((typeof performance !== 'undefined' ? performance.now() : Date.now()) - f.startTime).toFixed(0)}ms elapsed
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center mb-1">
        <h2 className="font-bold">History</h2>
        <button
          onClick={() => exportMetrics(history)}
          className="ml-auto px-2 py-1 rounded bg-[var(--kali-panel)]"
        >
          Export
        </button>
      </div>
      <ul className="divide-y divide-gray-700 border border-gray-700 rounded bg-[var(--kali-panel)]">
        {history.length === 0 && <li className="p-1 text-gray-400">No requests</li>}
        {history.map((f) => (
          <li key={f.id} className="p-1">
            <div className="truncate">
              {f.method} {f.url}
              {f.fromServiceWorkerCache && (
                <span className="ml-2 text-green-400">(SW cache)</span>
              )}
            </div>
            <div className="text-gray-400">
              {f.duration ? `${f.duration.toFixed(0)}ms` : ''} · req {formatBytes(f.requestSize)} · res {formatBytes(f.responseSize)}
            </div>
            {f.timedOut && (
              <div className="text-amber-300">
                Timed out after
                {' '}
                {Math.round(
                  (f.timeoutAt ?? f.endTime ?? f.startTime + API_TIMEOUT_MS) - f.startTime,
                )}
                ms · served cached response
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-center">
        <RequestChart
          data={history.map((h) => h.duration ?? 0)}
          label="Request duration (ms)"
        />
      </div>
    </div>
  );
}

