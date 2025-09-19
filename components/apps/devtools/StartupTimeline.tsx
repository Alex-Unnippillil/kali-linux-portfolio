import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getTimeline,
  StartupTimelineEntry,
  toCsv,
} from '../../../lib/startupTimeline';

const formatMs = (value: number): string => value.toFixed(2);

const StartupTimeline: React.FC = () => {
  const [entries, setEntries] = useState<StartupTimelineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const data = getTimeline();
    setEntries(data);
    if (typeof console !== 'undefined' && typeof console.table === 'function' && data.length) {
      const tableData = data.map((entry, index) => ({
        index: index + 1,
        phase: entry.phase,
        timestamp_ms: Number(formatMs(entry.timestamp)),
        since_start_ms: Number(formatMs(entry.sinceStart)),
        since_previous_ms: Number(formatMs(entry.sincePrevious)),
        metadata: entry.metadata ?? null,
      }));
      console.table(tableData);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleExport = useCallback(() => {
    const data = getTimeline();
    if (!data.length) {
      setError('No timeline entries are available to export yet.');
      return;
    }
    try {
      const csv = toCsv(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `startup-timeline-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to export the timeline.');
    }
  }, []);

  const hasEntries = entries.length > 0;

  const rows = useMemo(
    () =>
      entries.map((entry, index) => ({
        key: `${entry.phase}-${index}`,
        index: index + 1,
        phase: entry.phase,
        timestamp: formatMs(entry.timestamp),
        sinceStart: formatMs(entry.sinceStart),
        sincePrevious: formatMs(entry.sincePrevious),
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : '',
      })),
    [entries]
  );

  return (
    <div className="w-full h-full bg-ub-grey text-white p-4 overflow-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold">Startup Timeline</h1>
          <p className="text-sm text-gray-300">
            Inspect performance marks emitted during the boot sequence.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            className="px-3 py-1 rounded bg-ub-orange text-black font-medium focus:outline-none focus:ring-2 focus:ring-ub-orange focus:ring-offset-2"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-3 py-1 rounded border border-ub-orange text-ub-orange font-medium focus:outline-none focus:ring-2 focus:ring-ub-orange focus:ring-offset-2"
          >
            Export CSV
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-300 mb-3">{error}</p>}
      {hasEntries ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left uppercase text-gray-300 border-b border-gray-700">
              <tr>
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Phase</th>
                <th className="py-2 pr-4 text-right">Timestamp (ms)</th>
                <th className="py-2 pr-4 text-right">Since start (ms)</th>
                <th className="py-2 pr-4 text-right">Since previous (ms)</th>
                <th className="py-2 pr-4">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.key}
                  className={idx % 2 === 0 ? 'bg-ub-cool-grey bg-opacity-30' : ''}
                >
                  <td className="py-1 pr-4 font-mono">{row.index}</td>
                  <td className="py-1 pr-4">{row.phase}</td>
                  <td className="py-1 pr-4 text-right font-mono">{row.timestamp}</td>
                  <td className="py-1 pr-4 text-right font-mono">{row.sinceStart}</td>
                  <td className="py-1 pr-4 text-right font-mono">{row.sincePrevious}</td>
                  <td className="py-1 pr-4 font-mono break-all max-w-xs">
                    {row.metadata || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-300">
          No startup marks were recorded yet. Reload the desktop with instrumentation enabled to
          populate the timeline.
        </p>
      )}
      <p className="text-xs text-gray-400 mt-4">
        Timeline data is also mirrored on{' '}
        <code className="font-mono text-gray-200">window.__STARTUP_TIMELINE__</code> when the devtools flag
        is enabled.
      </p>
    </div>
  );
};

export default StartupTimeline;
