'use client';

import React, { useMemo } from 'react';
import { useTelemetryConsole } from './TelemetryConsoleProvider';
import { telemetryStore } from '../../lib/telemetryStore';

const badgeColor: Record<string, string> = {
  info: 'bg-blue-500/70',
  warn: 'bg-yellow-500/70 text-black',
  error: 'bg-red-600/80',
};

const typeLabel: Record<string, string> = {
  'toast': 'Toast',
  'error': 'Error',
  'feature-flag': 'Feature flag',
};

const TelemetryConsoleOverlay: React.FC = () => {
  const {
    enabled,
    isOpen,
    filteredEvents,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    levelFilter,
    setLevelFilter,
    clear,
    setOpen,
  } = useTelemetryConsole();

  const typeOptions = useMemo(
    () => [
      { value: 'all', label: 'All types' },
      { value: 'toast', label: 'Toasts' },
      { value: 'error', label: 'Errors' },
      { value: 'feature-flag', label: 'Feature flags' },
    ],
    [],
  );

  const levelOptions = useMemo(
    () => [
      { value: 'all', label: 'All levels' },
      { value: 'info', label: 'Info' },
      { value: 'warn', label: 'Warnings' },
      { value: 'error', label: 'Errors' },
    ],
    [],
  );

  if (!enabled || !telemetryStore.enabled) return null;
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 text-white flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Telemetry console"
    >
      <header className="px-6 py-4 border-b border-white/20 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Telemetry Console</h2>
          <p className="text-sm text-white/70">
            Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded">Ctrl</kbd>
            +<kbd className="bg-white/10 px-1.5 py-0.5 rounded">Shift</kbd>
            +<kbd className="bg-white/10 px-1.5 py-0.5 rounded">L</kbd> or use Settings → Dev tools to toggle.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-sm"
            onClick={() => clear('filtered')}
            disabled={filteredEvents.length === 0}
          >
            Clear filtered
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-sm"
            onClick={() => clear('all')}
          >
            Clear all
          </button>
          <button
            type="button"
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-sm"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      </header>
      <section className="px-6 py-3 border-b border-white/10 grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm" htmlFor="telemetry-console-search">
          <span className="text-white/70">Search</span>
          <input
            id="telemetry-console-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="bg-black/40 border border-white/20 rounded px-2 py-1 text-white"
            placeholder="Filter by message, source, flag"
            aria-label="Search telemetry entries"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="telemetry-console-type">
          <span className="text-white/70">Type</span>
          <select
            id="telemetry-console-type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as any)}
            className="bg-black/40 border border-white/20 rounded px-2 py-1 text-white"
            aria-label="Filter by telemetry type"
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm" htmlFor="telemetry-console-level">
          <span className="text-white/70">Level</span>
          <select
            id="telemetry-console-level"
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value as any)}
            className="bg-black/40 border border-white/20 rounded px-2 py-1 text-white"
            aria-label="Filter by severity"
          >
            {levelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>
      <main className="flex-1 overflow-y-auto px-6 py-4">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/60">
            No telemetry entries match the current filters.
          </div>
        ) : (
          <ul className="space-y-4">
            {filteredEvents.map((event) => {
              const levelClass = badgeColor[event.level] ?? 'bg-white/20';
              const typeText = typeLabel[event.type] ?? event.type;
              const timestamp = new Date(event.timestamp).toLocaleTimeString();
              return (
                <li
                  key={event.id}
                  className="border border-white/20 rounded-lg bg-black/30 p-4 space-y-3"
                >
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <span className="font-mono text-xs bg-white/10 px-2 py-0.5 rounded">
                        {timestamp}
                      </span>
                      <span className={`text-xs uppercase tracking-wide px-2 py-0.5 rounded ${levelClass}`}>
                        {event.level}
                      </span>
                      <span className="text-xs uppercase tracking-wide bg-white/10 px-2 py-0.5 rounded">
                        {typeText}
                      </span>
                    </div>
                    {event.source && (
                      <span className="text-xs text-white/60">{event.source}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold">{event.message}</p>
                    {'actionLabel' in event && event.actionLabel && (
                      <p className="text-sm text-white/70">
                        Action: <span className="font-mono">{event.actionLabel}</span>
                      </p>
                    )}
                    {event.type === 'feature-flag' && (
                      <div className="text-sm text-white/70 space-y-1">
                        <p>
                          <span className="font-medium">Flag:</span> {event.flag}
                        </p>
                        <p>
                          <span className="font-medium">Value:</span> {String(event.value)}
                          {event.previousValue !== undefined && (
                            <>
                              {' '}
                              <span className="text-white/50">(previous: {String(event.previousValue)})</span>
                            </>
                          )}
                        </p>
                        {event.origin && (
                          <p>
                            <span className="font-medium">Origin:</span> {event.origin}
                          </p>
                        )}
                      </div>
                    )}
                    {event.type === 'error' && (
                      <div className="space-y-2 text-sm text-white/70">
                        {event.errorName && (
                          <p>
                            <span className="font-medium">Error:</span> {event.errorName}
                          </p>
                        )}
                        {event.componentStack && (
                          <pre className="bg-black/60 border border-white/10 rounded p-2 overflow-auto text-xs">
                            {event.componentStack.trim()}
                          </pre>
                        )}
                        {event.stack && (
                          <details>
                            <summary className="cursor-pointer text-white/80">Stack trace</summary>
                            <pre className="bg-black/60 border border-white/10 rounded p-2 overflow-auto text-xs mt-2">
                              {event.stack}
                            </pre>
                          </details>
                        )}
                      </div>
                    )}
                    {event.tags && event.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-xs text-white/60">
                        {event.tags.map((tag) => (
                          <span key={tag} className="bg-white/10 px-2 py-0.5 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};

export default TelemetryConsoleOverlay;

