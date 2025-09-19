'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { useSettings, type OpsRoute } from '../../../hooks/useSettings';
import useNotifications from '../../../hooks/useNotifications';
import {
  onFetchProxy,
  getActiveFetches,
  FetchEntry,
} from '../../../lib/fetchProxy';
import { exportMetrics } from '../export';
import RequestChart from './RequestChart';

const HISTORY_KEY = 'network-insights-history';
const SLOW_THRESHOLD = 4000;

const ROUTE_OPTIONS: { value: OpsRoute; label: string; description: string }[] = [
  {
    value: 'global',
    label: 'Global Ops Center',
    description: 'Broadcast to the global operations bridge for awareness across teams.',
  },
  {
    value: 'network',
    label: 'Network On-Call',
    description: 'Escalate connectivity regressions to the network operations rotation.',
  },
  {
    value: 'security',
    label: 'Security Response',
    description: 'Route suspicious failures directly to the security incident handlers.',
  },
];

const ROUTE_LABELS = ROUTE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<OpsRoute, string>,
);

const getAlertReason = (entry: FetchEntry): string | null => {
  if (entry.error) return 'Request failed';
  if (typeof entry.status === 'number' && entry.status >= 500) {
    return `HTTP ${entry.status}`;
  }
  if (typeof entry.duration === 'number' && entry.duration > SLOW_THRESHOLD) {
    return `Slow ${Math.round(entry.duration)}ms`;
  }
  return null;
};

const formatBytes = (bytes?: number) =>
  typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} kB` : '—';

export default function NetworkInsights() {
  const [active, setActive] = useState<FetchEntry[]>(getActiveFetches());
  const [history, setHistory] = usePersistentState<FetchEntry[]>(HISTORY_KEY, []);
  const { opsRoute, setOpsRoute } = useSettings();
  const { pushNotification } = useNotifications();
  const routeRef = useRef<OpsRoute>(opsRoute);

  useEffect(() => {
    routeRef.current = opsRoute;
  }, [opsRoute]);

  const selectedRoute = useMemo(
    () => ROUTE_OPTIONS.find((option) => option.value === opsRoute) ?? ROUTE_OPTIONS[0],
    [opsRoute],
  );

  useEffect(() => {
    const unsubStart = onFetchProxy('start', () => setActive(getActiveFetches()));
    const unsubEnd = onFetchProxy('end', (e: CustomEvent<FetchEntry>) => {
      const entry = e.detail;
      setActive(getActiveFetches());
      setHistory((h) => [...h, entry]);
      const reason = getAlertReason(entry);
      if (reason) {
        const label = ROUTE_LABELS[routeRef.current] ?? routeRef.current;
        pushNotification(label, `${reason} – ${entry.method} ${entry.url}`);
      }
    });
    return () => {
      unsubStart();
      unsubEnd();
    };
  }, [setHistory, pushNotification]);

  const handleTestAlert = () => {
    const label = ROUTE_LABELS[routeRef.current] ?? routeRef.current;
    pushNotification(label, `Test alert routed to ${label}`);
  };

  return (
    <div className="space-y-3 bg-[var(--kali-bg)] p-2 text-xs text-white">
      <div className="rounded border border-gray-700 bg-[var(--kali-panel)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="ops-route"
            className="text-sm font-semibold uppercase tracking-wide text-gray-200"
          >
            Alert routing
          </label>
          <select
            id="ops-route"
            value={opsRoute}
            onChange={(event) => setOpsRoute(event.target.value as OpsRoute)}
            className="rounded border border-gray-600 bg-[var(--kali-bg)] px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-white"
          >
            {ROUTE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleTestAlert}
            className="rounded border border-gray-600 bg-[var(--kali-bg)] px-2 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-[var(--kali-panel)] focus:outline-none focus:ring-1 focus:ring-white"
          >
            Send test alert
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-400">{selectedRoute.description}</p>
      </div>

      <section>
        <h2 className="mb-1 font-bold uppercase tracking-wide text-gray-300">Active fetches</h2>
        <ul className="divide-y divide-gray-700 rounded border border-gray-700 bg-[var(--kali-panel)]">
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

      <section>
        <div className="mb-1 flex items-center">
          <h2 className="font-bold uppercase tracking-wide text-gray-300">History</h2>
          <button
            onClick={() => exportMetrics(history)}
            className="ml-auto rounded border border-gray-600 bg-[var(--kali-bg)] px-2 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-[var(--kali-panel)] focus:outline-none focus:ring-1 focus:ring-white"
          >
            Export
          </button>
        </div>
        <ul className="divide-y divide-gray-700 rounded border border-gray-700 bg-[var(--kali-panel)]">
          {history.length === 0 && <li className="p-1 text-gray-400">No requests</li>}
          {history.map((f) => {
            const reason = getAlertReason(f);
            return (
              <li key={f.id} className="p-1">
                <div className="truncate">
                  {f.method} {f.url}
                  {f.fromServiceWorkerCache && (
                    <span className="ml-2 text-green-400">(SW cache)</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-gray-400">
                  <span>
                    {f.duration ? `${f.duration.toFixed(0)}ms` : ''} · req {formatBytes(f.requestSize)} · res {formatBytes(f.responseSize)}
                  </span>
                  {reason && (
                    <span className="rounded bg-ub-orange/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ub-orange">
                      Routed ({reason})
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex justify-center">
        <RequestChart
          data={history.map((h) => h.duration ?? 0)}
          label="Request duration (ms)"
        />
      </div>
    </div>
  );
}

