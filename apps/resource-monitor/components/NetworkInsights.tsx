'use client';

import React, { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import {
  onFetchProxy,
  getActiveFetches,
  FetchEntry,
} from '../../../lib/fetchProxy';
import { exportMetrics } from '../export';
import RequestChart from './RequestChart';
import { kaliTheme } from '../../../styles/themes/kali';

const HISTORY_KEY = 'network-insights-history';

const formatBytes = (bytes?: number) =>
  typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} kB` : '—';

type PanelStyleVars = CSSProperties & {
  '--panel-bg'?: string;
  '--panel-hover'?: string;
  '--panel-border'?: string;
  '--focus-ring-color'?: string;
};

const panelVars: PanelStyleVars = {
  '--panel-bg': kaliTheme.panel,
  '--panel-hover': kaliTheme.hover,
  '--panel-border': kaliTheme.panelBorder,
  '--focus-ring-color': kaliTheme.focus,
};

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
    <div
      className="p-2 text-xs text-white"
      style={{ backgroundColor: kaliTheme.background, boxShadow: kaliTheme.shadow }}
    >
      <h2 className="font-bold mb-1">Active Fetches</h2>
      <ul
        className="mb-2 divide-y divide-[var(--panel-border)] border rounded bg-[var(--panel-bg)]"
        style={{ ...panelVars, borderColor: 'var(--panel-border)' }}
      >
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
          className="ml-auto px-2 py-1 rounded bg-[var(--panel-bg)] hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] transition-colors"
          style={{ ...panelVars, boxShadow: kaliTheme.shadow }}
        >
          Export
        </button>
      </div>
      <ul
        className="divide-y divide-[var(--panel-border)] border rounded bg-[var(--panel-bg)]"
        style={{ ...panelVars, borderColor: 'var(--panel-border)' }}
      >
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
    </div>
  );
}

