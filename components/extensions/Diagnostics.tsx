'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  ExtensionDiagnosticsEntry,
  getDiagnosticsSnapshot,
  subscribeToDiagnostics,
  toggleExtensionEnabled,
} from '../../utils/extensionDiagnostics';

const KEYBOARD_SHORTCUT = { ctrlKey: true, shiftKey: true, key: 'e' } as const;
const OPEN_EVENT = 'extensions:diagnostics:open';
const TOGGLE_EVENT = 'extensions:diagnostics:toggle';
const CLOSE_EVENT = 'extensions:diagnostics:close';

const formatDuration = (ms?: number) => {
  if (typeof ms !== 'number') return 'Pending';
  if (ms < 1) return '<1 ms';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return '—';
  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    return formatter.format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleTimeString();
  }
};

const useDiagnosticsData = () => {
  const [entries, setEntries] = useState<ExtensionDiagnosticsEntry[]>(() => getDiagnosticsSnapshot());
  useEffect(() => subscribeToDiagnostics(setEntries), []);
  return entries;
};

const ExtensionDiagnosticsOverlay: React.FC = () => {
  const entries = useDiagnosticsData();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const node = containerRef.current;
    if (!node) return;
    node.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = containerRef.current;
    if (!node) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === 'Tab') {
        const focusable = Array.from(
          node.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    node.addEventListener('keydown', handleKeyDown);
    return () => node.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    const handleKeyboardToggle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (
        event.ctrlKey === KEYBOARD_SHORTCUT.ctrlKey &&
        event.shiftKey === KEYBOARD_SHORTCUT.shiftKey &&
        event.key.toLowerCase() === KEYBOARD_SHORTCUT.key
      ) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', handleKeyboardToggle);
    return () => window.removeEventListener('keydown', handleKeyboardToggle);
  }, []);

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    const handleToggle = () => setOpen((value) => !value);
    const handleClose = () => setOpen(false);
    window.addEventListener(OPEN_EVENT, handleOpen as EventListener);
    window.addEventListener(TOGGLE_EVENT, handleToggle as EventListener);
    window.addEventListener(CLOSE_EVENT, handleClose as EventListener);
    return () => {
      window.removeEventListener(OPEN_EVENT, handleOpen as EventListener);
      window.removeEventListener(TOGGLE_EVENT, handleToggle as EventListener);
      window.removeEventListener(CLOSE_EVENT, handleClose as EventListener);
    };
  }, []);

  const summary = useMemo(() => {
    const totalMessages = entries.reduce((sum, entry) => sum + entry.messageCount, 0);
    const disabledCount = entries.filter((entry) => !entry.enabled).length;
    return {
      totalMessages,
      disabledCount,
    };
  }, [entries]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 text-white">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="extension-diagnostics-title"
        tabIndex={-1}
        className="max-h-full w-full max-w-4xl overflow-hidden rounded-lg border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div>
            <h2 id="extension-diagnostics-title" className="text-xl font-semibold text-white">
              Extension diagnostics
            </h2>
            <p className="mt-1 text-sm text-white/70">
              Ctrl+Shift+E to toggle · {entries.length} registered · {summary.disabledCount} disabled ·{' '}
              {summary.totalMessages} messages logged
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded border border-white/20 px-3 py-1 text-sm text-white transition hover:border-white/40 hover:bg-white/10"
          >
            Close
          </button>
        </header>
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5">
              <tr>
                <th scope="col" className="px-4 py-2 text-left font-medium text-white/80">
                  Extension
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-white/80">
                  Permissions
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-white/80">
                  Init
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-white/80">
                  Messages
                </th>
                <th scope="col" className="px-4 py-2 text-left font-medium text-white/80">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-white/70">
                    No extensions have registered diagnostics yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const labelId = `${entry.id}-diagnostic-label`;
                  return (
                    <tr key={entry.id} data-extension-id={entry.id}>
                      <th
                        id={labelId}
                        scope="row"
                        className="px-4 py-3 text-left text-sm font-semibold text-white"
                      >
                        {entry.name}
                        <div className="text-xs font-normal text-white/60">{entry.id}</div>
                      </th>
                      <td className="px-4 py-3 align-top text-xs text-white/70">
                        {entry.permissions.length > 0 ? entry.permissions.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-white/70">
                        <div>{formatDuration(entry.initDurationMs)}</div>
                        <div className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-white/40">
                          started {formatTimestamp(entry.initStartedAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-white/70">
                        <div className="font-semibold text-white">{entry.messageCount}</div>
                        <div className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-white/40">
                          last {formatTimestamp(entry.lastMessageAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-white/70">
                        <div className="mb-2 text-sm font-semibold">
                          {entry.enabled ? 'Enabled' : 'Disabled'}
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-labelledby={labelId}
                          aria-checked={entry.enabled}
                          data-extension-toggle
                          className={clsx(
                            'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
                            entry.enabled
                              ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                              : 'border-rose-400/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20',
                          )}
                          onClick={() => toggleExtensionEnabled(entry.id)}
                        >
                          <span
                            aria-hidden="true"
                            className={clsx(
                              'h-2.5 w-2.5 rounded-full',
                              entry.enabled ? 'bg-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.6)]',
                            )}
                          />
                          {entry.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExtensionDiagnosticsOverlay;
