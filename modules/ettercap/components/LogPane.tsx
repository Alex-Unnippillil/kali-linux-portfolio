'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LogEntry, LogLevel } from '../simulator';

const levelLabels: Record<LogLevel, string> = {
  info: 'Info',
  warn: 'Warn',
  error: 'Error',
};

const levelStyles: Record<LogLevel, string> = {
  info: 'bg-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] text-[color:var(--kali-text)]',
  warn: 'bg-[color:color-mix(in_srgb,var(--color-warning)_30%,transparent)] text-[color:var(--kali-text)]',
  error: 'bg-[color:color-mix(in_srgb,var(--color-danger)_30%,transparent)] text-[color:var(--kali-text)]',
};

const formatLogLine = (log: LogEntry) =>
  `[${log.level.toUpperCase()}] (${log.time}s) ${log.message}`;

export default function LogPane({
  logs,
  onClear,
}: {
  logs: LogEntry[];
  onClear: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState('');
  const [activeLevels, setActiveLevels] = useState<Record<LogLevel, boolean>>({
    info: true,
    warn: true,
    error: true,
  });
  const [showCopyFallback, setShowCopyFallback] = useState(false);
  const logContainerRef = useRef<HTMLUListElement | null>(null);
  const fallbackTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const logText = useMemo(() => logs.map(formatLogLine).join('\n'), [logs]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (!activeLevels[log.level]) return false;
      if (!query) return true;
      return log.message.toLowerCase().includes(query) || log.level.includes(query);
    });
  }, [activeLevels, logs, search]);

  useEffect(() => {
    if (!autoScroll || collapsed) return;
    const container = logContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [autoScroll, collapsed, filteredLogs]);

  useEffect(() => {
    if (!showCopyFallback) return;
    const textarea = fallbackTextareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.select();
  }, [showCopyFallback]);

  const copyAll = useCallback(async () => {
    if (!logText) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(logText);
        return;
      } catch {
        setShowCopyFallback(true);
      }
    } else {
      setShowCopyFallback(true);
    }
  }, [logText]);

  const downloadAll = useCallback(() => {
    if (!logText) return;
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ettercap-simulation-logs.txt';
    link.click();
    URL.revokeObjectURL(url);
  }, [logText]);

  const toggleLevel = (level: LogLevel) =>
    setActiveLevels((current) => ({ ...current, [level]: !current[level] }));

  return (
    <section className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color:var(--kali-panel)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)] px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--kali-text)]">Simulation logs</h3>
          <p className="text-xs text-[color:color-mix(in_srgb,var(--color-primary)_65%,var(--kali-text))]">
            Deterministic log stream from the selected scenario.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] px-2 py-1 text-[color:color-mix(in_srgb,var(--color-primary)_75%,var(--kali-text))] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_15%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            onClick={onClear}
            aria-label="Clear logs"
          >
            Clear
          </button>
          <button
            type="button"
            className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] px-2 py-1 text-[color:color-mix(in_srgb,var(--color-primary)_75%,var(--kali-text))] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_15%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            onClick={copyAll}
            aria-label="Copy all logs"
          >
            Copy all
          </button>
          <button
            type="button"
            className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] px-2 py-1 text-[color:color-mix(in_srgb,var(--color-primary)_75%,var(--kali-text))] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_15%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            onClick={downloadAll}
            aria-label="Download logs"
          >
            Download
          </button>
          <button
            type="button"
            className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] px-2 py-1 text-[color:color-mix(in_srgb,var(--color-primary)_75%,var(--kali-text))] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_15%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            onClick={() => setAutoScroll((value) => !value)}
            aria-label="Toggle auto scroll"
          >
            {autoScroll ? 'Pause auto-scroll' : 'Resume auto-scroll'}
          </button>
          <button
            type="button"
            className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] px-2 py-1 text-[color:color-mix(in_srgb,var(--color-primary)_75%,var(--kali-text))] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_15%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)]"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand log list' : 'Collapse log list'}
          >
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </header>

      {!collapsed && (
        <div className="space-y-3 p-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
            <span className="font-semibold uppercase tracking-wide">Filter levels</span>
            {(['info', 'warn', 'error'] as const).map((level) => (
              <label key={level} className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={activeLevels[level]}
                  onChange={() => toggleLevel(level)}
                  aria-label={`${levelLabels[level]} logs`}
                  className="accent-[color:var(--color-primary)]"
                />
                <span>{levelLabels[level]}</span>
              </label>
            ))}
          </div>
          <label className="block text-xs text-[color:color-mix(in_srgb,var(--color-primary)_65%,var(--kali-text))]">
            Search logs
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search logs"
              className="mt-1 w-full rounded border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:var(--kali-bg)] px-3 py-2 text-sm text-[color:var(--kali-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]"
              placeholder="Filter log messages"
            />
          </label>
          <ul
            ref={logContainerRef}
            className="max-h-64 overflow-auto rounded border border-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)] bg-[color:var(--kali-bg)] p-2 text-sm"
            aria-live="polite"
          >
            {filteredLogs.length === 0 ? (
              <li className="px-2 py-3 text-xs text-[color:color-mix(in_srgb,var(--color-primary)_60%,var(--kali-text))]">
                No log entries match the current filters.
              </li>
            ) : (
              filteredLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-start gap-2 border-b border-[color:color-mix(in_srgb,var(--color-primary)_15%,transparent)] px-2 py-2 last:border-b-0"
                >
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${levelStyles[log.level]}`}
                  >
                    {log.level}
                  </span>
                  <span className="text-[10px] text-[color:color-mix(in_srgb,var(--color-primary)_55%,var(--kali-text))]">
                    {log.time}s
                  </span>
                  <span className="flex-1 break-words text-[color:var(--kali-text)]">{log.message}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {showCopyFallback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:var(--kali-panel)] p-4">
            <h4 className="text-sm font-semibold text-[color:var(--kali-text)]">Copy logs</h4>
            <p className="mt-1 text-xs text-[color:color-mix(in_srgb,var(--color-primary)_65%,var(--kali-text))]">
              Clipboard access is unavailable. Select the text below and copy it manually.
            </p>
            <textarea
              ref={fallbackTextareaRef}
              value={logText}
              readOnly
              aria-label="Log output"
              className="mt-3 h-40 w-full rounded border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:var(--kali-bg)] p-2 text-xs text-[color:var(--kali-text)]"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_40%,transparent)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_80%,var(--kali-text))]"
                onClick={() => setShowCopyFallback(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
