'use client';

import React, { useEffect, useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import {
  onFetchProxy,
  getActiveFetches,
  FetchEntry,
} from '../../../lib/fetchProxy';
import { exportMetrics } from '../export';
import RequestChart from './RequestChart';

const HISTORY_KEY = 'network-insights-history';

const formatBytes = (bytes?: number) =>
  typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} kB` : '—';

export default function NetworkInsights() {
  const [active, setActive] = useState<FetchEntry[]>(getActiveFetches());
  const [history, setHistory, , clearHistoryStorage] = usePersistentState<FetchEntry[]>(
    HISTORY_KEY,
    [],
  );
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [exportFeedback, setExportFeedback] = useState<boolean>(false);

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

  useEffect(() => {
    if (!exportFeedback) return;
    const timeout = window.setTimeout(() => setExportFeedback(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [exportFeedback]);

  const methodOptions = useMemo(() => {
    const methods = new Set<string>();
    history.forEach((entry) => methods.add(entry.method));
    return Array.from(methods);
  }, [history]);

  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    history.forEach((entry) => {
      if (typeof entry.status === 'number') {
        statuses.add(String(entry.status));
      } else {
        statuses.add('unknown');
      }
    });
    return Array.from(statuses);
  }, [history]);

  const filteredHistory = useMemo(
    () =>
      history.filter((entry) => {
        const methodMatch = methodFilter === 'all' || entry.method === methodFilter;
        const statusValue = typeof entry.status === 'number' ? String(entry.status) : 'unknown';
        const statusMatch = statusFilter === 'all' || statusValue === statusFilter;
        return methodMatch && statusMatch;
      }),
    [history, methodFilter, statusFilter],
  );

  const handleExport = () => {
    exportMetrics(history);
    setExportFeedback(true);
  };

  const handleClearHistory = () => {
    clearHistoryStorage();
    setMethodFilter('all');
    setStatusFilter('all');
    setExportFeedback(false);
  };

  return (
    <div className="p-3 text-xs text-white bg-[var(--kali-bg)] space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-lg border border-gray-700 bg-[var(--kali-panel)] shadow-inner">
          <header className="flex items-center gap-2 border-b border-gray-700 px-3 py-2">
            <h2 className="text-[0.75rem] font-semibold uppercase tracking-wide text-gray-300">
              Active Fetches
            </h2>
            <span className="ml-auto rounded-full bg-sky-600/70 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide">
              {active.length}
            </span>
          </header>
          <ul className="divide-y divide-gray-700">
            {active.length === 0 && <li className="px-3 py-2 text-gray-400">None</li>}
            {active.map((f) => (
              <li key={f.id} className="px-3 py-2" data-testid="active-item">
                <div className="truncate">
                  <span className="mr-2 rounded bg-slate-700 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-gray-200">
                    {f.method}
                  </span>
                  {f.url}
                </div>
                <div className="text-gray-400">
                  {((typeof performance !== 'undefined' ? performance.now() : Date.now()) - f.startTime).toFixed(0)}ms elapsed
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-gray-700 bg-[var(--kali-panel)] shadow-inner">
          <header className="space-y-2 border-b border-gray-700 px-3 py-2">
            <div className="flex items-center gap-2">
              <h2 className="text-[0.75rem] font-semibold uppercase tracking-wide text-gray-300">
                History
              </h2>
              <span className="ml-auto rounded-full bg-emerald-600/70 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide">
                {history.length}
              </span>
              <button
                onClick={handleExport}
                className="rounded bg-slate-800 px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide hover:bg-slate-700"
              >
                Export
              </button>
              <button
                onClick={handleClearHistory}
                className="rounded border border-slate-600 px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-wide hover:bg-slate-700"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-[0.7rem] text-gray-300">
              <label className="flex items-center gap-1 uppercase tracking-wide">
                Method
                <select
                  aria-label="Method"
                  className="rounded bg-slate-900 px-2 py-1 text-white"
                  value={methodFilter}
                  onChange={(event) => setMethodFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  {methodOptions.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1 uppercase tracking-wide">
                Status
                <select
                  aria-label="Status"
                  className="rounded bg-slate-900 px-2 py-1 text-white"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status === 'unknown' ? 'Unknown' : status}
                    </option>
                  ))}
                </select>
              </label>
              {exportFeedback && (
                <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-300">
                  Metrics exported
                </span>
              )}
            </div>
          </header>
          <ul className="divide-y divide-gray-700">
            {history.length === 0 && <li className="px-3 py-2 text-gray-400">No requests</li>}
            {history.length > 0 && filteredHistory.length === 0 && (
              <li className="px-3 py-2 text-gray-400">No requests match the current filters</li>
            )}
            {filteredHistory.map((f) => {
              const statusValue = typeof f.status === 'number' ? String(f.status) : 'Unknown';
              return (
                <li key={f.id} className="px-3 py-2" data-testid="history-item">
                  <div className="flex flex-wrap items-center gap-2 text-[0.7rem]">
                    <span className="rounded bg-slate-700 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-gray-200">
                      {f.method}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-gray-200">
                      {statusValue}
                    </span>
                    <span className="truncate text-xs text-white/90">{f.url}</span>
                    {f.fromServiceWorkerCache && (
                      <span className="rounded bg-emerald-600/30 px-1.5 py-0.5 text-[0.6rem] uppercase tracking-wide text-emerald-300">
                        SW cache
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400">
                    {f.duration ? `${f.duration.toFixed(0)}ms` : ''} · req {formatBytes(f.requestSize)} · res {formatBytes(f.responseSize)}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <div className="mt-2 flex justify-center">
        <RequestChart
          data={filteredHistory.map((h) => h.duration ?? 0)}
          label="Request duration (ms)"
        />
      </div>
    </div>
  );
}

