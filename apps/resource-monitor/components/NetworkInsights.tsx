'use client';

import React, { useEffect, useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import {
  onFetchProxy,
  getActiveFetches,
  FetchEntry,
} from '../../../lib/fetchProxy';
import { exportMetrics } from '../export';
import { HistoryEntry, isHistoryEntryArray } from '../types';
import RequestChart, { ChartPoint } from './RequestChart';

const HISTORY_KEY = 'network-insights-history';

const TIME_RANGE_OPTIONS = [
  { id: '1m', label: '1 min', durationMs: 60_000, description: 'Last 1 minute' },
  { id: '5m', label: '5 min', durationMs: 5 * 60_000, description: 'Last 5 minutes' },
  { id: '15m', label: '15 min', durationMs: 15 * 60_000, description: 'Last 15 minutes' },
] as const;

type TimeRangeId = (typeof TIME_RANGE_OPTIONS)[number]['id'];

const MAX_HISTORY_ITEMS = 500;
const MAX_HISTORY_DURATION = TIME_RANGE_OPTIONS[TIME_RANGE_OPTIONS.length - 1].durationMs;

const formatBytes = (bytes?: number) =>
  typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} kB` : '—';

export default function NetworkInsights() {
  const [active, setActive] = useState<FetchEntry[]>(getActiveFetches());
  const [history, setHistory] = usePersistentState<HistoryEntry[]>(
    HISTORY_KEY,
    [],
    isHistoryEntryArray,
  );
  const [timeRange, setTimeRange] = useState<TimeRangeId>('1m');
  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [pausedSnapshot, setPausedSnapshot] = useState<HistoryEntry[] | null>(null);
  const [pausedAt, setPausedAt] = useState<number | null>(null);

  useEffect(() => {
    const unsubStart = onFetchProxy('start', () => setActive(getActiveFetches()));
    const unsubEnd = onFetchProxy('end', (e: CustomEvent<FetchEntry>) => {
      setActive(getActiveFetches());
      const recordedAt = Date.now();
      const cutoff = recordedAt - MAX_HISTORY_DURATION;
      setHistory((previous) => {
        const trimmed = previous.filter((entry) => entry.recordedAt >= cutoff);
        const next: HistoryEntry[] = [...trimmed, { ...e.detail, recordedAt }];
        return next.length > MAX_HISTORY_ITEMS ? next.slice(-MAX_HISTORY_ITEMS) : next;
      });
    });
    return () => {
      unsubStart();
      unsubEnd();
    };
  }, [setHistory]);

  useEffect(() => {
    const cutoff = Date.now() - MAX_HISTORY_DURATION;
    setHistory((entries) => entries.filter((entry) => entry.recordedAt >= cutoff));
  }, [setHistory]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    if (paused) {
      setPausedSnapshot((snapshot) => snapshot ?? history);
      setPausedAt((value) => value ?? Date.now());
    } else {
      setPausedSnapshot(null);
      setPausedAt(null);
      setNow(Date.now());
    }
  }, [paused, history]);

  useEffect(() => {
    setNow(Date.now());
  }, [timeRange]);

  const activeRange = TIME_RANGE_OPTIONS.find((option) => option.id === timeRange)!;
  const effectiveNow = pausedAt ?? now;
  const visibleHistory = paused && pausedSnapshot ? pausedSnapshot : history;

  const filteredHistory = useMemo(
    () =>
      visibleHistory.filter(
        (entry) => effectiveNow - entry.recordedAt <= activeRange.durationMs,
      ),
    [visibleHistory, effectiveNow, activeRange.durationMs],
  );

  const chartData: ChartPoint[] = useMemo(
    () =>
      filteredHistory.map((entry) => ({
        value: entry.duration ?? 0,
        timestamp: entry.recordedAt,
        label: `${entry.method} ${entry.url}`,
      })),
    [filteredHistory],
  );

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
      <div className="flex flex-wrap items-center gap-2 mb-1" role="group" aria-label="History controls">
        <h2 className="font-bold mr-2">History</h2>
        <fieldset className="flex flex-wrap gap-1" aria-label="Select time range">
          <legend className="sr-only">Time range</legend>
          {TIME_RANGE_OPTIONS.map((option) => (
            <label
              key={option.id}
              className={`relative inline-flex cursor-pointer select-none items-center rounded border px-2 py-1 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-green-400 ${
                timeRange === option.id
                  ? 'border-green-400 bg-green-500 text-black'
                  : 'border-gray-700 bg-[var(--kali-panel)] text-gray-200 hover:border-green-400'
              }`}
            >
              <input
                type="radio"
                name="network-history-range"
                value={option.id}
                checked={timeRange === option.id}
                onChange={() => setTimeRange(option.id)}
                className="sr-only"
                aria-label={option.description}
              />
              <span aria-hidden>{option.label}</span>
            </label>
          ))}
        </fieldset>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-pressed={paused}
          className={`ml-auto inline-flex items-center rounded border px-2 py-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400 ${
            paused
              ? 'border-yellow-500 bg-yellow-400/20 text-yellow-200'
              : 'border-green-500 bg-green-500/20 text-green-200 hover:border-green-400'
          }`}
        >
          {paused ? 'Resume updates' : 'Pause updates'}
        </button>
        <span
          className="text-[11px] text-gray-300"
          role="status"
          aria-live="polite"
        >
          {paused ? 'Updates paused' : 'Live updates on'}
        </span>
        <button
          onClick={() => exportMetrics(history)}
          className="ml-2 inline-flex items-center rounded border border-gray-700 bg-[var(--kali-panel)] px-2 py-1 hover:border-green-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
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
      <div className="mt-3 flex justify-center">
        <RequestChart
          data={chartData}
          label="Request duration (ms)"
          description={activeRange.description}
          paused={paused}
        />
      </div>
    </div>
  );
}

