"use client";

import React, { useCallback, useEffect, useState } from 'react';
import {
  LOG_BUFFER_LIMIT,
  LogEvent,
  formatLogsForExport,
  getAppLogBuffer,
  getBufferedAppIds,
  subscribeToLogUpdates,
} from '../../../lib/logger';

const levelColors: Record<LogEvent['level'], string> = {
  info: 'text-green-300',
  warn: 'text-yellow-300',
  error: 'text-red-300',
  debug: 'text-slate-200',
};

function LogMonitor() {
  const [appIds, setAppIds] = useState<string[]>(() => getBufferedAppIds());
  const [selectedApp, setSelectedApp] = useState<string>(() => {
    const ids = getBufferedAppIds();
    return ids[0] ?? '';
  });
  const [logs, setLogs] = useState<LogEvent[]>(() => {
    const ids = getBufferedAppIds();
    return ids[0] ? getAppLogBuffer(ids[0]) : [];
  });

  useEffect(() => {
    const update = () => {
      const ids = getBufferedAppIds();
      setAppIds(ids);
      let nextSelected = '';
      setSelectedApp((current) => {
        if (ids.length === 0) {
          nextSelected = '';
          return '';
        }
        if (current && ids.includes(current)) {
          nextSelected = current;
          return current;
        }
        nextSelected = ids[0];
        return ids[0];
      });
      setLogs(nextSelected ? getAppLogBuffer(nextSelected) : []);
    };
    const unsubscribe = subscribeToLogUpdates(update);
    update();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!selectedApp) {
      setLogs([]);
      return;
    }
    setLogs(getAppLogBuffer(selectedApp));
  }, [selectedApp]);

  const handleExport = useCallback(() => {
    if (!selectedApp || logs.length === 0) return;
    const payload = formatLogsForExport(selectedApp);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeName = selectedApp.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'logs';
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}-logs.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [logs.length, selectedApp]);

  const hasLogs = logs.length > 0;

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-black/40 px-4 py-3">
        <label className="text-sm font-semibold" htmlFor="log-monitor-app">
          Application
        </label>
        <select
          id="log-monitor-app"
          value={selectedApp}
          onChange={(event) => setSelectedApp(event.target.value)}
          className="rounded bg-black/30 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ubt-blue"
        >
          {appIds.length === 0 && <option value="">No logs yet</option>}
          {appIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleExport}
          disabled={!selectedApp || !hasLogs}
          className="rounded bg-ubt-blue px-3 py-1 text-sm font-semibold text-black transition hover:bg-blue-300 disabled:cursor-not-allowed disabled:bg-black/30 disabled:text-white/40"
        >
          Export JSON
        </button>
      </div>
      <p className="px-4 pt-3 text-xs text-white/70">
        Monitoring the last {LOG_BUFFER_LIMIT} events emitted per application.
      </p>
      <div className="flex-1 overflow-auto px-4 pb-4 pt-2">
        {!selectedApp ? (
          <p className="text-sm text-white/70">
            Logs will appear here once an application emits events through the logger.
          </p>
        ) : !hasLogs ? (
          <p className="text-sm text-white/70">No log entries recorded yet for {selectedApp}.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-ub-cool-grey">
              <tr className="border-b border-black/40 text-xs uppercase tracking-wide text-white/60">
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Level</th>
                <th className="px-2 py-2">Message</th>
                <th className="px-2 py-2">Meta</th>
                <th className="px-2 py-2">Correlation</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry) => (
                <tr
                  key={`${entry.timestamp}-${entry.message}-${entry.correlationId}`}
                  className="border-b border-black/30 last:border-b-0"
                >
                  <td className="px-2 py-2 align-top text-xs text-white/70">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td
                    className={`px-2 py-2 align-top font-semibold ${
                      levelColors[entry.level] ?? 'text-white'
                    }`}
                  >
                    {entry.level.toUpperCase()}
                  </td>
                  <td className="px-2 py-2 align-top">{entry.message}</td>
                  <td className="px-2 py-2 align-top text-xs text-white/80">
                    {entry.meta ? (
                      <code className="whitespace-pre-wrap break-words">
                        {JSON.stringify(entry.meta, null, 2)}
                      </code>
                    ) : (
                      <span className="text-white/50">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2 align-top text-xs text-white/60 break-all">
                    {entry.correlationId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default LogMonitor;
