"use client";

import React, { useEffect, useMemo, useState } from 'react';
import useDataRetention from '../../hooks/useDataRetention';
import { ArtifactType, formatTtl, retentionArtifacts } from '../../utils/dataRetention';

const formatTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

const formatUndoCountdown = (expiresAt: number, now: number) => {
  const diff = Math.max(0, expiresAt - now);
  const seconds = Math.ceil(diff / 1000);
  return `${seconds}s`;
};

const DataRetentionPanel: React.FC = () => {
  const {
    settings,
    updateSetting,
    purgeAll,
    purgeType,
    lastRun,
    undo,
    undoExpiresAt,
    isPurging,
    logs,
    retentionOptions,
  } = useDataRetention();
  const [now, setNow] = useState(Date.now());

  const orderedArtifacts = useMemo(() => (
    Object.entries(retentionArtifacts) as Array<[
      ArtifactType,
      (typeof retentionArtifacts)[ArtifactType],
    ]>
  ), []);

  useEffect(() => {
    if (!undoExpiresAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [undoExpiresAt]);

  return (
    <section className="mx-auto my-6 w-full max-w-3xl rounded-lg border border-gray-800 bg-black bg-opacity-40 p-4 text-sm text-white">
      <header className="mb-4">
        <h2 className="text-lg font-semibold">Data Retention</h2>
        <p className="text-xs text-gray-300">
          Configure how long artifacts are kept on this device. Purges run automatically and can be undone briefly.
        </p>
      </header>
      <div className="space-y-3">
        {orderedArtifacts.map(([type, meta]) => {
          const ttl = settings[type];
          const hasOption = retentionOptions.some(option => option.value === ttl);
          const selectValue = hasOption ? String(ttl) : 'custom';
          const fallbackOption = retentionOptions[0];
          return (
            <div
              key={type}
              className="flex flex-col gap-2 rounded-md border border-gray-800 bg-black/30 p-3 md:flex-row md:items-center"
            >
              <div className="flex-1">
                <p className="font-medium">{meta.label}</p>
                <p className="text-xs text-gray-400">{meta.description}</p>
              </div>
              <div className="flex flex-col items-stretch gap-2 md:w-64">
                <label className="text-xs text-gray-400" htmlFor={`ttl-${type}`}>
                  Time to keep
                </label>
                <select
                  id={`ttl-${type}`}
                  className="rounded border border-gray-700 bg-black/40 px-2 py-1 text-sm focus:border-ub-orange focus:outline-none"
                  value={selectValue}
                  onChange={event => {
                    const value = event.target.value;
                    const option = retentionOptions.find(o => `${o.value}` === value);
                    if (option) {
                      updateSetting(type, option.value);
                      return;
                    }
                    // fallback to default option when unknown
                    if (fallbackOption) {
                      updateSetting(type, fallbackOption.value);
                    }
                  }}
                  aria-label={`Retention TTL for ${meta.label}`}
                >
                  {retentionOptions.map(option => (
                    <option key={option.value} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                  {!hasOption && (
                    <option value="custom" disabled>
                      {formatTtl(ttl)}
                    </option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={() => purgeType(type)}
                  disabled={isPurging}
                  className="rounded border border-gray-700 bg-black/40 px-2 py-1 text-sm transition hover:border-ub-orange disabled:opacity-50"
                >
                  Purge expired now
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
        <button
          type="button"
          onClick={() => purgeAll('manual')}
          disabled={isPurging}
          className="w-full rounded bg-ub-orange px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-60 md:w-auto"
        >
          {isPurging ? 'Purging…' : 'Run purge now'}
        </button>
        {undoExpiresAt && (
          <button
            type="button"
            onClick={() => undo()}
            className="w-full rounded border border-yellow-500/70 px-3 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/10 md:w-auto"
          >
            Undo purge ({formatUndoCountdown(undoExpiresAt, now)})
          </button>
        )}
        {lastRun && (
          <p className="text-xs text-gray-300 md:ml-auto">
            Last purge ({lastRun.trigger}): {lastRun.removedTotal}{' '}
            item{lastRun.removedTotal === 1 ? '' : 's'} at {formatTimestamp(lastRun.timestamp)}
          </p>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-200">Recent retention activity</h3>
        <ul className="mt-2 space-y-1">
          {logs.length === 0 && (
            <li className="rounded border border-gray-800 bg-black/30 px-3 py-2 text-xs text-gray-400">
              No retention actions recorded yet.
            </li>
          )}
          {logs.slice(0, 5).map(log => (
            <li
              key={log.id}
              className="rounded border border-gray-800 bg-black/30 px-3 py-2 text-xs text-gray-200"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <span className="font-medium text-gray-100">{log.summary}</span>
                <span className="text-[11px] text-gray-400">{formatTimestamp(log.timestamp)}</span>
              </div>
              {log.details.length > 0 && (
                <div className="mt-1 text-[11px] text-gray-300">
                  {log.details
                    .map(detail => `${retentionArtifacts[detail.type].label}: ${detail.removed}`)
                    .join(', ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default DataRetentionPanel;
