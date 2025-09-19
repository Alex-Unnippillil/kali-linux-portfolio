'use client';

import { useCallback, useMemo, useState, type FC } from 'react';
import type {
  ResourceSnapshot,
  SnapshotFetchEntry,
  TimerSnapshot,
  WindowSnapshot,
} from '../../lib/resourceSnapshot';

interface SnapshotError {
  message: string;
}

const formatNumber = (value: number | null | undefined, digits = 2) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
};

const formatTimestamp = (value: string | number | null | undefined) => {
  if (!value) return '—';
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleString()} (${date.toISOString()})`;
};

const coerceNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const coerceDataset = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw === 'string') result[key] = raw;
    else if (raw != null) result[key] = JSON.stringify(raw);
  }
  return result;
};

const normaliseWindow = (value: unknown, index: number): WindowSnapshot => {
  const raw = (value as Partial<WindowSnapshot>) || {};
  const id = typeof raw.id === 'string' && raw.id ? raw.id : `window-${index}`;
  const title = typeof raw.title === 'string' && raw.title ? raw.title : id;
  const bounds = (raw as any)?.bounds || {};
  return {
    id,
    title,
    className: typeof raw.className === 'string' ? raw.className : '',
    state: {
      minimized: !!(raw.state?.minimized),
      maximized: !!(raw.state?.maximized),
      focused: !!(raw.state?.focused),
    },
    zIndex: coerceNumber(raw.zIndex) ?? 0,
    bounds: {
      x: coerceNumber(bounds.x) ?? 0,
      y: coerceNumber(bounds.y) ?? 0,
      width: coerceNumber(bounds.width) ?? 0,
      height: coerceNumber(bounds.height) ?? 0,
    },
    area: coerceNumber((raw as any).area) ?? 0,
    dataset: coerceDataset(raw.dataset),
    metrics: {
      cpu: coerceNumber(raw.metrics?.cpu),
      memory: coerceNumber(raw.metrics?.memory),
    },
  };
};

const normaliseTimer = (value: unknown, index: number): TimerSnapshot => {
  const raw = (value as Partial<TimerSnapshot>) || {};
  const id = typeof raw.id === 'string' && raw.id ? raw.id : `timer-${index}`;
  const label = typeof raw.label === 'string' && raw.label ? raw.label : id;
  const laps = Array.isArray(raw.laps)
    ? raw.laps
        .map((lap) => coerceNumber(lap) ?? undefined)
        .filter((lap): lap is number => typeof lap === 'number')
    : [];
  return {
    id,
    label,
    mode: raw.mode === 'stopwatch' ? 'stopwatch' : 'timer',
    running: !!raw.running,
    startedAt: coerceNumber(raw.startedAt),
    expectedEnd: coerceNumber(raw.expectedEnd),
    remainingSeconds: coerceNumber(raw.remainingSeconds),
    elapsedSeconds: coerceNumber(raw.elapsedSeconds),
    laps,
    lastUpdated: coerceNumber(raw.lastUpdated),
  };
};

const normaliseError = (value: unknown): SnapshotFetchEntry['error'] => {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const raw = value as { name?: unknown; message?: unknown; stack?: unknown };
    const message =
      typeof raw.message === 'string'
        ? raw.message
        : JSON.stringify(raw);
    const name = typeof raw.name === 'string' ? raw.name : undefined;
    const stack = typeof raw.stack === 'string' ? raw.stack : undefined;
    return { name, message, stack };
  }
  return String(value);
};

const normaliseFetch = (value: unknown, index: number): SnapshotFetchEntry => {
  const raw = (value as Partial<SnapshotFetchEntry>) || {};
  return {
    id: typeof raw.id === 'number' ? raw.id : index,
    url: typeof raw.url === 'string' ? raw.url : '',
    method: typeof raw.method === 'string' ? raw.method : 'GET',
    startTime: coerceNumber(raw.startTime) ?? 0,
    endTime: coerceNumber(raw.endTime) ?? undefined,
    duration: coerceNumber(raw.duration) ?? undefined,
    status: coerceNumber(raw.status) ?? undefined,
    requestSize: coerceNumber(raw.requestSize) ?? undefined,
    responseSize: coerceNumber(raw.responseSize) ?? undefined,
    fromServiceWorkerCache: !!raw.fromServiceWorkerCache,
    error: normaliseError(raw.error),
  };
};

const parseSnapshotText = (text: string): ResourceSnapshot => {
  const raw = JSON.parse(text) as Partial<ResourceSnapshot> & { [key: string]: unknown };
  const windows = Array.isArray(raw.windows)
    ? raw.windows.map(normaliseWindow)
    : [];
  const timers = Array.isArray(raw.timers)
    ? raw.timers.map(normaliseTimer)
    : [];
  const metrics = raw.metrics && typeof raw.metrics === 'object'
    ? {
        cpu: coerceNumber((raw.metrics as any).cpu),
        memory: coerceNumber((raw.metrics as any).memory),
      }
    : { cpu: null, memory: null };
  const network = raw.network && typeof raw.network === 'object'
    ? {
        active: Array.isArray((raw.network as any).active)
          ? (raw.network as any).active.map(normaliseFetch)
          : [],
        history: Array.isArray((raw.network as any).history)
          ? (raw.network as any).history.map(normaliseFetch)
          : [],
      }
    : undefined;
  const capturedAt =
    typeof raw.capturedAt === 'string' && raw.capturedAt
      ? raw.capturedAt
      : new Date(0).toISOString();
  return {
    version: typeof raw.version === 'number' ? raw.version : 1,
    capturedAt,
    metrics,
    windows,
    timers,
    network,
  };
};

const WindowTable: FC<{ windows: WindowSnapshot[] }> = ({ windows }) => {
  if (!windows.length) {
    return <p className="text-gray-300">No windows captured.</p>;
  }
  return (
    <div className="overflow-auto border border-gray-700 rounded bg-[var(--kali-panel)]">
      <table className="w-full text-left text-[0.8rem]">
        <thead className="bg-black bg-opacity-30">
          <tr>
            <th className="px-2 py-1">Title</th>
            <th className="px-2 py-1">State</th>
            <th className="px-2 py-1">Position</th>
            <th className="px-2 py-1">Size</th>
            <th className="px-2 py-1">CPU</th>
            <th className="px-2 py-1">Memory</th>
            <th className="px-2 py-1">z-index</th>
          </tr>
        </thead>
        <tbody>
          {windows.map((w) => {
            const stateLabels = [
              w.state.focused ? 'focused' : 'background',
              w.state.minimized ? 'minimized' : null,
              w.state.maximized ? 'maximized' : null,
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <tr key={w.id} className="odd:bg-black odd:bg-opacity-20">
                <td className="px-2 py-1">
                  <div className="font-semibold">{w.title}</div>
                  <div className="text-gray-400">{w.id}</div>
                </td>
                <td className="px-2 py-1">{stateLabels || 'background'}</td>
                <td className="px-2 py-1">
                  ({formatNumber(w.bounds.x, 0)}, {formatNumber(w.bounds.y, 0)})
                </td>
                <td className="px-2 py-1">
                  {formatNumber(w.bounds.width, 0)} × {formatNumber(w.bounds.height, 0)}
                </td>
                <td className="px-2 py-1">{formatNumber(w.metrics.cpu)}</td>
                <td className="px-2 py-1">{formatNumber(w.metrics.memory)}</td>
                <td className="px-2 py-1">{formatNumber(w.zIndex, 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const TimerList: FC<{ timers: TimerSnapshot[] }> = ({ timers }) => {
  if (!timers.length) {
    return <p className="text-gray-300">No timers captured.</p>;
  }
  return (
    <ul className="space-y-2">
      {timers.map((timer) => (
        <li key={timer.id} className="border border-gray-700 rounded p-2 bg-[var(--kali-panel)]">
          <div className="flex justify-between text-sm font-semibold">
            <span>{timer.label}</span>
            <span>{timer.mode === 'stopwatch' ? 'Stopwatch' : 'Timer'}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.8rem] mt-1">
            <div>
              <dt className="text-gray-400">Running</dt>
              <dd>{timer.running ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Remaining (s)</dt>
              <dd>{formatNumber(timer.remainingSeconds, 0)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Elapsed (s)</dt>
              <dd>{formatNumber(timer.elapsedSeconds, 0)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Start</dt>
              <dd>{formatTimestamp(timer.startedAt ?? null)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Expected end</dt>
              <dd>{formatTimestamp(timer.expectedEnd ?? null)}</dd>
            </div>
            <div>
              <dt className="text-gray-400">Last update</dt>
              <dd>{formatTimestamp(timer.lastUpdated ?? null)}</dd>
            </div>
          </dl>
          {timer.laps.length > 0 && (
            <div className="mt-2 text-[0.75rem]">
              <div className="text-gray-400">Laps (s)</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {timer.laps.map((lap, idx) => (
                  <span key={idx} className="px-2 py-1 bg-black bg-opacity-40 rounded">
                    {formatNumber(lap, 0)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};

const NetworkSection: FC<{
  network: NonNullable<ResourceSnapshot['network']>;
}> = ({ network }) => {
  const totalHistory = network.history.length;
  const totalActive = network.active.length;
  return (
    <div className="space-y-3">
      <div className="text-sm">
        <span className="font-semibold">History:</span> {totalHistory} ·{' '}
        <span className="font-semibold">Active:</span> {totalActive}
      </div>
      {totalActive > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-1">Active requests</h3>
          <ul className="space-y-1 text-[0.8rem]">
            {network.active.map((entry) => (
              <li key={`active-${entry.id}`} className="border border-gray-700 rounded px-2 py-1 bg-[var(--kali-panel)]">
                <div className="truncate font-semibold">{entry.method} {entry.url}</div>
                <div className="text-gray-400">
                  Started at {formatNumber(entry.startTime, 0)}ms
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 className="font-semibold text-sm mb-1">History</h3>
        {totalHistory === 0 ? (
          <p className="text-gray-300 text-[0.8rem]">No completed requests.</p>
        ) : (
          <div className="overflow-auto max-h-64 border border-gray-700 rounded bg-[var(--kali-panel)]">
            <table className="w-full text-left text-[0.8rem]">
              <thead className="bg-black bg-opacity-30">
                <tr>
                  <th className="px-2 py-1">Method</th>
                  <th className="px-2 py-1">URL</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Duration (ms)</th>
                  <th className="px-2 py-1">Req (B)</th>
                  <th className="px-2 py-1">Res (B)</th>
                  <th className="px-2 py-1">Error</th>
                </tr>
              </thead>
              <tbody>
                {network.history.map((entry) => (
                  <tr key={`hist-${entry.id}`} className="odd:bg-black odd:bg-opacity-20">
                    <td className="px-2 py-1 whitespace-nowrap">{entry.method}</td>
                    <td className="px-2 py-1 max-w-[16rem] truncate" title={entry.url}>
                      {entry.url}
                    </td>
                    <td className="px-2 py-1">{entry.status ?? '—'}</td>
                    <td className="px-2 py-1">{formatNumber(entry.duration, 0)}</td>
                    <td className="px-2 py-1">{formatNumber(entry.requestSize, 0)}</td>
                    <td className="px-2 py-1">{formatNumber(entry.responseSize, 0)}</td>
                    <td className="px-2 py-1 text-[0.7rem] whitespace-pre-wrap max-w-[12rem]">
                      {typeof entry.error === 'string'
                        ? entry.error
                        : entry.error
                        ? `${entry.error.name ? `${entry.error.name}: ` : ''}${entry.error.message}`
                        : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default function LogViewer() {
  const [snapshot, setSnapshot] = useState<ResourceSnapshot | null>(null);
  const [error, setError] = useState<SnapshotError | null>(null);
  const [loadingClipboard, setLoadingClipboard] = useState(false);

  const loadSnapshot = useCallback((text: string) => {
    try {
      const parsed = parseSnapshotText(text);
      setSnapshot(parsed);
      setError(null);
    } catch (err) {
      console.error('Failed to parse diagnostics snapshot', err);
      setError({ message: 'Failed to parse diagnostics snapshot. Ensure the JSON is valid.' });
      setSnapshot(null);
    }
  }, []);

  const onFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        loadSnapshot(text);
      } catch (err) {
        console.error('Failed to read file', err);
        setError({ message: 'Could not read the selected file.' });
      }
    },
    [loadSnapshot],
  );

  const onPaste = useCallback(async () => {
    if (loadingClipboard) return;
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      setError({ message: 'Clipboard API is not available in this browser.' });
      return;
    }
    try {
      setLoadingClipboard(true);
      const text = await navigator.clipboard.readText();
      if (!text) {
        setError({ message: 'Clipboard is empty.' });
        return;
      }
      loadSnapshot(text);
    } catch (err) {
      console.error('Failed to read clipboard', err);
      setError({ message: 'Failed to read from clipboard.' });
    } finally {
      setLoadingClipboard(false);
    }
  }, [loadSnapshot, loadingClipboard]);

  const clearSnapshot = useCallback(() => {
    setSnapshot(null);
    setError(null);
  }, []);

  const summary = useMemo(() => {
    if (!snapshot) return null;
    return {
      windows: snapshot.windows.length,
      timers: snapshot.timers.length,
      networkHistory: snapshot.network?.history.length ?? 0,
      networkActive: snapshot.network?.active.length ?? 0,
    };
  }, [snapshot]);

  return (
    <div className="h-full w-full bg-[var(--kali-bg)] text-white overflow-auto">
      <div className="p-4 space-y-4 text-sm">
        <header className="space-y-2">
          <h1 className="text-lg font-bold">Diagnostics Log Viewer</h1>
          <p className="text-gray-300">
            Load a diagnostics snapshot exported from the resource monitor to inspect window state,
            timers, and network activity.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="file"
              accept="application/json"
              onChange={onFile}
              aria-label="Load snapshot file"
              className="text-xs text-white"
            />
            <button
              type="button"
              onClick={onPaste}
              disabled={loadingClipboard}
              className="px-3 py-1 bg-[var(--kali-panel)] rounded disabled:opacity-50"
            >
              {loadingClipboard ? 'Reading clipboard…' : 'Paste snapshot'}
            </button>
            <button
              type="button"
              onClick={clearSnapshot}
              className="px-3 py-1 bg-[var(--kali-panel)] rounded"
            >
              Clear
            </button>
          </div>
          {error && (
            <div role="alert" className="text-red-300 text-xs">
              {error.message}
            </div>
          )}
        </header>
        {snapshot ? (
          <div className="space-y-4">
            <section className="border border-gray-700 rounded p-3 bg-[var(--kali-panel)] space-y-1">
              <div>
                <span className="font-semibold">Captured:</span> {formatTimestamp(snapshot.capturedAt)}
              </div>
              <div>
                <span className="font-semibold">Schema version:</span> {snapshot.version}
              </div>
              <div>
                <span className="font-semibold">Overall CPU:</span> {formatNumber(snapshot.metrics.cpu)}%
              </div>
              <div>
                <span className="font-semibold">Overall memory:</span> {formatNumber(snapshot.metrics.memory)}%
              </div>
              {summary && (
                <div className="flex flex-wrap gap-4 text-xs text-gray-300">
                  <span>Windows: {summary.windows}</span>
                  <span>Timers: {summary.timers}</span>
                  <span>Network history: {summary.networkHistory}</span>
                  <span>Active requests: {summary.networkActive}</span>
                </div>
              )}
            </section>
            <section>
              <h2 className="font-semibold mb-2">Windows</h2>
              <WindowTable windows={snapshot.windows} />
            </section>
            <section>
              <h2 className="font-semibold mb-2">Timers</h2>
              <TimerList timers={snapshot.timers} />
            </section>
            {snapshot.network && (
              <section>
                <h2 className="font-semibold mb-2">Network</h2>
                <NetworkSection network={snapshot.network} />
              </section>
            )}
          </div>
        ) : (
          <p className="text-gray-300 text-sm">
            No snapshot loaded. Export a diagnostics snapshot from the Resource Monitor toolbox and
            load it here.
          </p>
        )}
      </div>
    </div>
  );
}
