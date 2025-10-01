"use client";

import { useState, useMemo, useEffect, useId } from 'react';

import {
  configureScheduler,
  getSchedulerDiagnostics,
  runInputTask,
  subscribeScheduler,
  type SchedulerDiagnostics,
} from '../scanner/schedule';

interface ViewerProps {
  data: any[];
}

export default function ResultViewer({ data }: ViewerProps) {
  const [tab, setTab] = useState<'raw' | 'parsed' | 'chart'>('raw');
  const [sortKey, setSortKey] = useState('');
  const [filter, setFilter] = useState('');
  const [diagnostics, setDiagnostics] = useState<SchedulerDiagnostics | null>(null);
  const [overloadLag, setOverloadLag] = useState(120);
  const [lowFpsCap, setLowFpsCap] = useState(10);
  const [eventLogSize, setEventLogSize] = useState(25);
  const overloadId = useId();
  const lowFpsId = useId();
  const eventLogId = useId();

  useEffect(() => {
    try {
      const sk = localStorage.getItem('rv-sort');
      if (sk) setSortKey(sk);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('rv-sort', sortKey);
    } catch {
      /* ignore */
    }
  }, [sortKey]);

  useEffect(() => {
    setDiagnostics(getSchedulerDiagnostics());
    const unsubscribe = subscribeScheduler((snapshot) => {
      setDiagnostics(snapshot);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!diagnostics) return;
    const configLag = Math.round(diagnostics.config.overloadLagMs);
    if (configLag !== overloadLag) setOverloadLag(configLag);
    const lowMs = diagnostics.config.minIntervalMs.low;
    const derivedFps = lowMs > 0 ? Math.round(1000 / lowMs) : 0;
    if (derivedFps !== lowFpsCap) setLowFpsCap(derivedFps);
    const configuredLog = diagnostics.config.maxEventLog;
    if (configuredLog !== eventLogSize) setEventLogSize(configuredLog);
  }, [diagnostics, eventLogSize, overloadLag, lowFpsCap]);

  const keys = data[0] ? Object.keys(data[0]) : [];
  const filtered = useMemo(() => {
    const lower = filter.toLowerCase();
    return data.filter((row) => JSON.stringify(row).toLowerCase().includes(lower));
  }, [data, filter]);
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1));
  }, [filtered, sortKey]);

  const exportCsv = () => {
    const csv = [keys.join(','), ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="text-xs" aria-label="result viewer">
      <div role="tablist" className="mb-2 flex flex-wrap gap-2">
        <button
          role="tab"
          aria-selected={tab === 'raw'}
          onClick={() => runInputTask('result-viewer:tab-raw', () => setTab('raw'))}
          className="rounded bg-ub-cool-grey px-2 py-1 text-white"
          type="button"
        >
          Raw
        </button>
        <button
          role="tab"
          aria-selected={tab === 'parsed'}
          onClick={() => runInputTask('result-viewer:tab-parsed', () => setTab('parsed'))}
          className="rounded bg-ub-cool-grey px-2 py-1 text-white"
          type="button"
        >
          Parsed
        </button>
        <button
          role="tab"
          aria-selected={tab === 'chart'}
          onClick={() => runInputTask('result-viewer:tab-chart', () => setTab('chart'))}
          className="rounded bg-ub-cool-grey px-2 py-1 text-white"
          type="button"
        >
          Chart
        </button>
      </div>
      {tab === 'raw' && <pre className="bg-black text-white p-1 h-40 overflow-auto">{JSON.stringify(data, null, 2)}</pre>}
      {tab === 'parsed' && (
        <div>
          <details className="mb-2 space-y-2 rounded border border-black/30 bg-black/10 p-2">
            <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-white">
              Advanced controls
            </summary>
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-[11px] sm:flex-row sm:items-center sm:gap-2">
                <span>Filter</span>
                <input
                  value={filter}
                  onChange={(e) =>
                    runInputTask('result-viewer:filter-change', () => setFilter(e.target.value))
                  }
                  className="w-full flex-1 rounded border border-black/40 bg-white p-1 text-black"
                  aria-label="Filter rows"
                />
              </label>
              {keys.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keys.map((k) => (
                    <button
                      key={k}
                      onClick={() => runInputTask(`result-viewer:sort-${k}`, () => setSortKey(k))}
                      className={`rounded px-2 py-1 ${sortKey === k ? 'bg-ub-yellow text-black' : 'bg-ub-cool-grey text-white'}`}
                      type="button"
                    >
                      Sort by {k}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={exportCsv} className="self-start rounded bg-ub-green px-2 py-1 text-black" type="button">
                Export CSV
              </button>
              <section className="rounded border border-black/40 bg-black/20 p-2 text-[11px]">
                <h4 className="mb-1 font-semibold uppercase tracking-wide">Scheduler diagnostics</h4>
                <div className="mb-2 grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label htmlFor={overloadId}>Overload threshold (ms)</label>
                    <input
                      id={overloadId}
                      type="number"
                      min={0}
                      value={overloadLag}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        const sanitized = Number.isFinite(next) ? Math.max(0, Math.round(next)) : 0;
                        setOverloadLag(sanitized);
                        configureScheduler({ overloadLagMs: sanitized });
                      }}
                      aria-label="Overload threshold (ms)"
                      className="rounded border border-black/40 bg-white p-1 text-black"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={lowFpsId}>Low priority FPS cap</label>
                    <input
                      id={lowFpsId}
                      type="number"
                      min={0}
                      max={120}
                      value={lowFpsCap}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        const sanitized = Number.isFinite(next)
                          ? Math.max(0, Math.min(120, Math.round(next)))
                          : 0;
                        setLowFpsCap(sanitized);
                        const ms = sanitized > 0 ? Math.round(1000 / sanitized) : 0;
                        configureScheduler({ minIntervalMs: { low: ms } });
                      }}
                      aria-label="Low priority FPS cap"
                      className="rounded border border-black/40 bg-white p-1 text-black"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor={eventLogId}>Event log size</label>
                    <input
                      id={eventLogId}
                      type="number"
                      min={1}
                      max={100}
                      value={eventLogSize}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        const sanitized = Number.isFinite(next)
                          ? Math.max(1, Math.min(100, Math.round(next)))
                          : 1;
                        setEventLogSize(sanitized);
                        configureScheduler({ maxEventLog: sanitized });
                      }}
                      aria-label="Event log size"
                      className="rounded border border-black/40 bg-white p-1 text-black"
                    />
                  </div>
                  <div className="flex flex-col justify-center gap-1 rounded border border-black/40 bg-black/10 p-2">
                    <span>Last lag: {diagnostics ? diagnostics.metrics.lastLagMs.toFixed(1) : '0.0'} ms</span>
                    <span>Overload events: {diagnostics?.metrics.overloadEvents ?? 0}</span>
                    <span>Input events processed: {diagnostics?.metrics.inputExecutions ?? 0}</span>
                  </div>
                </div>
                <div>
                  <h5 className="mb-1 font-semibold">Recent shed events</h5>
                  {diagnostics?.metrics.shedEvents.length ? (
                    <div className="max-h-32 overflow-auto rounded border border-black/30">
                      <table className="w-full text-left">
                        <thead>
                          <tr>
                            <th className="border px-1">Time</th>
                            <th className="border px-1">Task</th>
                            <th className="border px-1">Reason</th>
                            <th className="border px-1">Lag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diagnostics.metrics.shedEvents.map((event) => (
                            <tr key={`${event.id}-${event.timestamp}-${event.skipped}`}>
                              <td className="border px-1">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </td>
                              <td className="border px-1">
                                <span className="font-semibold">{event.label}</span>
                                <span className="ml-1 text-[10px] uppercase">[{event.priority}]</span>
                              </td>
                              <td className="border px-1">{event.reason}</td>
                              <td className="border px-1">{event.lagMs.toFixed(1)} ms</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-[11px] italic text-white/70">No shed events recorded.</p>
                  )}
                </div>
              </section>
            </div>
          </details>
          <div className="overflow-auto max-h-60">
            <table className="w-full text-left">
              <thead>
                <tr>
                  {keys.map((k) => (
                    <th key={k} className="border px-1">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={i}>
                    {keys.map((k) => (
                      <td key={k} className="border px-1">
                        {String(row[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'chart' && (
        <svg width="100%" height="100" role="img" aria-label="bar chart">
          {data.slice(0, keys.length).map((row, i) => (
            <rect
              key={i}
              x={i * 40}
              y={100 - Number(row[keys[0]])}
              width={30}
              height={Number(row[keys[0]])}
              fill={['#377eb8', '#4daf4a', '#e41a1c', '#984ea3', '#ff7f00'][i % 5]}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

