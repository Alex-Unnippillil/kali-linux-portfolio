'use client';

import React, { useEffect, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import {
  onFetchProxy,
  getActiveFetches,
  FetchEntry,
} from '../../../lib/fetchProxy';
import { exportMetrics } from '../export';
import IncidentPanel from './IncidentPanel';
import RequestChart from './RequestChart';

const HISTORY_KEY = 'network-insights-history';

const formatBytes = (bytes?: number) =>
  typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} kB` : '—';

export default function NetworkInsights() {
  const [active, setActive] = useState<FetchEntry[]>(getActiveFetches());
  const [history, setHistory] = usePersistentState<FetchEntry[]>(HISTORY_KEY, []);

  useEffect(() => {
    const unsubStart = onFetchProxy('start', () => setActive(getActiveFetches()));
    const unsubEnd = onFetchProxy('end', (e: CustomEvent<FetchEntry>) => {
      setActive(getActiveFetches());
      setHistory((h) => [...h, e.detail]);
    });
    return () => {
      unsubStart();
      unsubEnd();
    };
  }, [setHistory]);

  return (
    <div className="p-2 text-xs text-white bg-[var(--kali-bg)] space-y-4">
      <header className="border-b border-gray-700 pb-2">
        <h1 className="text-base font-semibold uppercase tracking-wide">Ops Dashboard</h1>
        <p className="mt-1 text-[11px] text-gray-300">
          Monitor network activity and capture incident response notes in one place.
        </p>
      </header>
      <section aria-labelledby="network-active" className="space-y-2">
        <h2 id="network-active" className="font-bold">Active Fetches</h2>
        <ul className="divide-y divide-gray-700 border border-gray-700 rounded bg-[var(--kali-panel)]">
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
      </section>
      <section aria-labelledby="network-history" className="space-y-2">
        <div className="flex items-center">
          <h2 id="network-history" className="font-bold">
            History
          </h2>
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
        <div className="flex justify-center">
          <RequestChart
            data={history.map((h) => h.duration ?? 0)}
            label="Request duration (ms)"
          />
        </div>
      </section>
      <IncidentPanel />
    </div>
  );
}

