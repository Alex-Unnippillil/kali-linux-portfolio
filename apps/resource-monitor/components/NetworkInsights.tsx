'use client';

import React, { useEffect, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { onFetchProxy, getActiveFetches, FetchEntry } from '../../../lib/fetchProxy';
import { exportMetrics } from '../export';
import {
  HISTORY_KEY,
  HistoryEntry,
  ensureHistoryEntry,
  normalizeHistory,
} from './history';
import RequestChart from './RequestChart';
import SloDashboard from './SloDashboard';

const formatBytes = (bytes?: number) =>
  typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} kB` : '—';

export default function NetworkInsights() {
  const [active, setActive] = useState<FetchEntry[]>(getActiveFetches());
  const [history, setHistory] = usePersistentState<HistoryEntry[]>(HISTORY_KEY, []);

  useEffect(() => {
    setHistory((entries) => normalizeHistory(entries));
  }, [setHistory]);

  useEffect(() => {
    const unsubStart = onFetchProxy('start', () => setActive(getActiveFetches()));
    const unsubEnd = onFetchProxy('end', (e: CustomEvent<FetchEntry>) => {
      setActive(getActiveFetches());
      const entry = ensureHistoryEntry(e.detail);
      setHistory((h) => [...h, entry]);
    });
    return () => {
      unsubStart();
      unsubEnd();
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
      <SloDashboard entries={history} />
    </div>
  );
}

