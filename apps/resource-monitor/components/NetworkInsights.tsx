'use client';

import React, { useEffect, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import {
  onFetchProxy,
  getActiveFetches,
  FetchEntry,
} from '../../../lib/fetchProxy';
import { exportMetrics } from '../export';
import RequestChart from './RequestChart';
import cacheStore, {
  type CacheEvent,
  type CacheEntryRecord,
  type CacheStats,
  type CacheEvictionReason,
} from '../../../utils/cacheStore';

const HISTORY_KEY = 'network-insights-history';

const formatBytes = (bytes?: number) =>
  typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} kB` : '—';

interface EvictionEntry {
  record: CacheEntryRecord;
  reason: CacheEvictionReason;
  timestamp: number;
}

export default function NetworkInsights() {
  const [active, setActive] = useState<FetchEntry[]>(getActiveFetches());
  const [history, setHistory] = usePersistentState<FetchEntry[]>(HISTORY_KEY, []);
  const [cacheStats, setCacheStats] = useState<CacheStats>(cacheStore.getStats());
  const [evictions, setEvictions] = useState<EvictionEntry[]>([]);

  useEffect(() => {
    const unsubStart = onFetchProxy('start', () => setActive(getActiveFetches()));
    const unsubEnd = onFetchProxy('end', (e: CustomEvent<FetchEntry>) => {
      setActive(getActiveFetches());
      setHistory((h) => [...h, e.detail]);
    });
    const unsubCache = cacheStore.subscribe((event: CacheEvent) => {
      if (event.type === 'stats') {
        setCacheStats(event.stats);
      }
      if (event.type === 'evict') {
        setEvictions((prev) => {
          const next = [
            {
              record: event.record,
              reason: event.reason,
              timestamp: Date.now(),
            },
            ...prev,
          ];
          return next.slice(0, 5);
        });
      }
    });
    return () => {
      unsubStart();
      unsubEnd();
      unsubCache();
    };
  }, [setHistory]);

  return (
    <div className="p-2 text-xs text-white bg-[var(--kali-bg)]">
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
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-center">
        <RequestChart
          data={history.map((h) => h.duration ?? 0)}
          label="Request duration (ms)"
        />
      </div>
      <div className="mt-3 rounded border border-gray-700 bg-[var(--kali-panel)] p-2">
        <h2 className="font-bold mb-2">Cache Diagnostics</h2>
        <dl className="grid grid-cols-2 gap-2 text-[11px] text-gray-200 sm:grid-cols-4">
          <div>
            <dt className="text-gray-400">Hit ratio</dt>
            <dd>{(cacheStats.hitRatio * 100).toFixed(1)}%</dd>
          </div>
          <div>
            <dt className="text-gray-400">Hits</dt>
            <dd>{cacheStats.hits}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Misses</dt>
            <dd>{cacheStats.misses}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Evictions</dt>
            <dd>{cacheStats.evictions}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Corruptions</dt>
            <dd>{cacheStats.corruptions}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Entries</dt>
            <dd>{cacheStats.entries}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Size</dt>
            <dd>{formatBytes(cacheStats.totalBytes)}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Capacity</dt>
            <dd>{formatBytes(cacheStats.maxBytes)}</dd>
          </div>
        </dl>
        <div className="mt-3">
          <h3 className="font-semibold text-xs text-gray-200">Recent evictions</h3>
          <ul className="mt-1 space-y-1">
            {evictions.length === 0 && (
              <li className="text-gray-500 text-[11px]">None</li>
            )}
            {evictions.map((entry) => (
              <li key={`${entry.record.hash}-${entry.timestamp}`} className="flex flex-wrap justify-between text-[11px] text-gray-200">
                <span className="truncate max-w-[60%]">{entry.record.hash.slice(0, 12)}</span>
                <span className="text-gray-400">
                  {entry.reason} · {formatBytes(entry.record.size)} ·{' '}
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

