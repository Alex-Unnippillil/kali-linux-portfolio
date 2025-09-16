'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import {
  onFetchProxy,
  getActiveFetches,
  FetchEntry,
} from '../../../lib/fetchProxy';
import { exportMetrics } from '../export';
import RequestChart, {
  type RequestChartPoint,
} from './RequestChart';

interface HistoryEntry extends FetchEntry {
  recordedAt: number;
}

const HISTORY_KEY = 'network-insights-history';
const MINUTE_IN_MS = 60_000;
const RANGE_OPTIONS = [
  { label: '1 min', minutes: 1 },
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
];

const getWallNow = () => Date.now();

const formatBytes = (bytes?: number) =>
  typeof bytes === 'number' ? `${(bytes / 1024).toFixed(1)} kB` : '—';

export default function NetworkInsights() {
  const bootTimeRef = useRef(getWallNow());
  const [active, setActive] = useState<FetchEntry[]>(getActiveFetches());
  const [history, setHistory] = usePersistentState<HistoryEntry[]>(HISTORY_KEY, []);
  const [rangeMinutes, setRangeMinutes] = useState<number>(5);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<HistoryEntry[]>([]);
  const [nowMarker, setNowMarker] = useState(getWallNow());

  useEffect(() => {
    const unsubStart = onFetchProxy('start', () =>
      setActive(getActiveFetches()),
    );
    const unsubEnd = onFetchProxy('end', (e: CustomEvent<FetchEntry>) => {
      setActive(getActiveFetches());
      const record: HistoryEntry = {
        ...e.detail,
        recordedAt: getWallNow(),
      };
      setHistory((h) => [...h, record]);
    });
    return () => {
      unsubStart();
      unsubEnd();
    };
  }, [setHistory]);

  useEffect(() => {
    if (history.length === 0) return;
    let updated = false;
    const upgraded = history.map((entry) => {
      if (Number.isFinite(entry.recordedAt)) return entry;
      updated = true;
      return { ...entry, recordedAt: getWallNow() };
    });
    if (updated) {
      setHistory(upgraded);
    }
  }, [history, setHistory]);

  useEffect(() => {
    if (isPaused) return;
    const tick = () => setNowMarker(getWallNow());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [isPaused]);

  const currentTime = isPaused && pausedAt != null ? pausedAt : nowMarker;
  const effectiveHistory = isPaused ? snapshot : history;
  const chartRangeMs = rangeMinutes * MINUTE_IN_MS;
  const rangeLabel =
    rangeMinutes === 1 ? 'last minute' : `last ${rangeMinutes} minutes`;
  const fallbackRecordedAt = bootTimeRef.current;

  const filteredHistory = useMemo(() => {
    const cutoff = currentTime - chartRangeMs;
    return effectiveHistory.filter((entry) => {
      const time = Number.isFinite(entry.recordedAt)
        ? entry.recordedAt
        : fallbackRecordedAt;
      return time >= cutoff;
    });
  }, [chartRangeMs, currentTime, effectiveHistory, fallbackRecordedAt]);

  const chartData = useMemo<RequestChartPoint[]>(() => {
    return filteredHistory
      .filter((entry) => typeof entry.duration === 'number')
      .map((entry) => ({
        time: Number.isFinite(entry.recordedAt)
          ? entry.recordedAt
          : fallbackRecordedAt,
        value: entry.duration ?? 0,
      }));
  }, [filteredHistory, fallbackRecordedAt]);

  const togglePause = () => {
    if (isPaused) {
      setIsPaused(false);
      setPausedAt(null);
      setSnapshot([]);
      setNowMarker(getWallNow());
      return;
    }
    const now = getWallNow();
    setSnapshot(
      history.map((entry) =>
        Number.isFinite(entry.recordedAt)
          ? entry
          : { ...entry, recordedAt: now },
      ),
    );
    setPausedAt(now);
    setNowMarker(now);
    setIsPaused(true);
  };

  const pausedTimeLabel =
    isPaused && pausedAt != null
      ? new Date(pausedAt).toLocaleTimeString()
      : null;

  return (
    <div className="bg-[var(--kali-bg)] p-2 text-xs text-white">
      <h2 className="mb-1 font-bold">Active Fetches</h2>
      <ul className="mb-2 divide-y divide-gray-700 rounded border border-gray-700 bg-[var(--kali-panel)]">
        {active.length === 0 && <li className="p-1 text-gray-400">None</li>}
        {active.map((f) => (
          <li key={f.id} className="p-1">
            <div className="truncate">
              {f.method} {f.url}
            </div>
            <div className="text-gray-400">
              {(
                (typeof performance !== 'undefined'
                  ? performance.now()
                  : Date.now()) - f.startTime
              ).toFixed(0)}
              ms elapsed
            </div>
          </li>
        ))}
      </ul>
      <div className="mb-1 flex items-center">
        <h2 className="font-bold">History</h2>
        <button
          type="button"
          onClick={() => exportMetrics(history)}
          className="ml-auto rounded bg-[var(--kali-panel)] px-2 py-1"
        >
          Export
        </button>
      </div>
      <ul className="divide-y divide-gray-700 rounded border border-gray-700 bg-[var(--kali-panel)]">
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
              {f.duration ? `${f.duration.toFixed(0)}ms` : ''} · req{' '}
              {formatBytes(f.requestSize)} · res {formatBytes(f.responseSize)}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 space-y-2">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Chart controls"
        >
          <span className="text-gray-300">Range:</span>
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.minutes}
              type="button"
              onClick={() => setRangeMinutes(option.minutes)}
              aria-pressed={rangeMinutes === option.minutes}
              className={`rounded border px-2 py-1 text-[0.7rem] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff00] ${
                rangeMinutes === option.minutes
                  ? 'border-[#00ff00] bg-[#00ff00]/20 text-[#00ff00]'
                  : 'border-gray-700 bg-[var(--kali-panel)] text-gray-200 hover:border-[#00ff00]/40'
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={togglePause}
            aria-pressed={isPaused}
            className={`ml-auto rounded border px-2 py-1 text-[0.7rem] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff00] ${
              isPaused
                ? 'border-yellow-400 bg-yellow-500/20 text-yellow-300'
                : 'border-gray-700 bg-[var(--kali-panel)] text-gray-200 hover:border-[#00ff00]/40'
            }`}
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
        </div>
        <RequestChart
          data={chartData}
          label="Request duration (ms)"
          rangeLabel={rangeLabel}
          rangeMs={chartRangeMs}
          currentTime={currentTime}
          unit="ms"
        />
        {isPaused && pausedTimeLabel && (
          <p className="text-[0.65rem] text-yellow-300">
            Chart paused at {pausedTimeLabel}
          </p>
        )}
      </div>
    </div>
  );
}
