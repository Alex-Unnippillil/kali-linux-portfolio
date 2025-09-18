'use client';

import React, { useEffect, useState, type SVGProps } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import {
  onFetchProxy,
  getActiveFetches,
  FetchEntry,
} from '../../../lib/fetchProxy';
import { exportMetrics } from '../export';
import RequestChart from './RequestChart';
import EmptyState from '../../../components/base/EmptyState';
import { getEmptyStateCopy } from '../../../modules/emptyStates';

const RadarIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-12 h-12"
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 12l6-6" />
    <path d="M12 3v3" />
    <path d="M21 12h-3" />
  </svg>
);

const HistoryIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-12 h-12"
    {...props}
  >
    <path d="M3 3v5h5" />
    <path d="M3.05 13A9 9 0 1 0 12 3" />
    <path d="M12 7v5l3 1" />
  </svg>
);

const activeEmptyCopy = getEmptyStateCopy('resource-monitor-active-empty');
const historyEmptyCopy = getEmptyStateCopy('resource-monitor-history-empty');

const HISTORY_KEY = 'network-insights-history';

const formatBytes = (bytes?: number) =>
  typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} kB` : '—';

export default function NetworkInsights() {
  const [active, setActive] = useState<FetchEntry[]>(getActiveFetches());
  const [history, setHistory] = usePersistentState<FetchEntry[]>(HISTORY_KEY, []);
  const activeDocs = activeEmptyCopy.documentation;
  const activeExtra = activeEmptyCopy.secondaryDocumentation;
  const historyDocs = historyEmptyCopy.documentation;
  const historyExtra = historyEmptyCopy.secondaryDocumentation;

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

  const runDemoRequest = () => {
    const url = '/api/dummy';
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const record: FetchEntry = {
      id: Date.now(),
      url,
      method: 'POST',
      startTime: now,
      endTime: now,
      duration: 0,
      status: 0,
    };
    if (typeof fetch !== 'function') {
      setHistory((prev) => [...prev, record]);
      return;
    }
    fetch(url, { method: 'POST' }).catch(() => {
      setHistory((prev) => [...prev, record]);
      setActive((prev) => [...prev, record]);
      setTimeout(() => {
        setActive((prev) => prev.filter((entry) => entry.id !== record.id));
      }, 1500);
    });
  };

  return (
    <div className="p-2 text-xs text-white bg-[var(--kali-bg)]">
      <h2 className="font-bold mb-1">Active Fetches</h2>
      <div className="mb-2">
        {active.length === 0 ? (
          <EmptyState
            className="w-full border-gray-700 bg-[var(--kali-panel)]"
            icon={<RadarIcon />}
            title={activeEmptyCopy.title}
            description={activeEmptyCopy.description}
            primaryAction={{
              label: activeEmptyCopy.primaryActionLabel,
              onClick: runDemoRequest,
            }}
            secondaryAction={
              activeDocs
                ? { label: activeDocs.label, href: activeDocs.url }
                : undefined
            }
            extraActions={
              activeExtra
                ? [
                    {
                      label: activeExtra.label,
                      href: activeExtra.url,
                    },
                  ]
                : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-gray-700 border border-gray-700 rounded bg-[var(--kali-panel)]">
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
        )}
      </div>
      <div className="flex items-center mb-1">
        <h2 className="font-bold">History</h2>
        <button
          onClick={() => exportMetrics(history)}
          className="ml-auto px-2 py-1 rounded bg-[var(--kali-panel)]"
        >
          Export
        </button>
      </div>
      {history.length === 0 ? (
        <EmptyState
          className="w-full border-gray-700 bg-[var(--kali-panel)]"
          icon={<HistoryIcon />}
          title={historyEmptyCopy.title}
          description={historyEmptyCopy.description}
          primaryAction={{
            label: historyEmptyCopy.primaryActionLabel,
            onClick: runDemoRequest,
          }}
          secondaryAction={
            historyDocs
              ? { label: historyDocs.label, href: historyDocs.url }
              : undefined
          }
          extraActions={
            historyExtra
              ? [
                  {
                    label: historyExtra.label,
                    href: historyExtra.url,
                  },
                ]
              : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-gray-700 border border-gray-700 rounded bg-[var(--kali-panel)]">
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
      )}
      <div className="mt-2 flex justify-center">
        <RequestChart
          data={history.map((h) => h.duration ?? 0)}
          label="Request duration (ms)"
        />
      </div>
    </div>
  );
}

