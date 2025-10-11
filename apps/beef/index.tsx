'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import BeefApp from '../../components/apps/beef';

type Severity = 'Low' | 'Medium' | 'High';

interface LogEntry {
  time: string;
  severity: Severity;
  message: string;
}

const severityStyles: Record<Severity, { icon: string; color: string }> = {
  Low: { icon: '🟢', color: 'bg-green-700' },
  Medium: { icon: '🟡', color: 'bg-yellow-700' },
  High: { icon: '🔴', color: 'bg-red-700' },
};

type WindowState = 'normal' | 'minimized' | 'maximized' | 'closed';

const BeefPage: React.FC = () => {
  const [logs] = useState<LogEntry[]>([
    { time: '10:00:00', severity: 'Low', message: 'Hook initialized' },
    { time: '10:00:02', severity: 'Medium', message: 'Payload delivered' },
    { time: '10:00:03', severity: 'High', message: 'Sensitive data exfil attempt' },
  ]);

  const [windowState, setWindowState] = useState<WindowState>('normal');

  const isMinimized = windowState === 'minimized';
  const isMaximized = windowState === 'maximized';
  const isClosed = windowState === 'closed';

  const frameClasses = useMemo(
    () =>
      clsx(
        'relative flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/10 bg-ub-cool-grey text-white shadow-2xl transition-all duration-300 ease-out',
        isMaximized &&
          'fixed inset-4 z-50 mx-auto h-auto max-w-none rounded-2xl border-white/20 bg-ub-cool-grey sm:inset-6 lg:inset-12',
        isMinimized && 'pointer-events-none opacity-90',
      ),
    [isMaximized, isMinimized],
  );

  const handleMinimize = () => {
    setWindowState((prev) => (prev === 'minimized' ? prev : 'minimized'));
  };

  const handleMaximize = () => {
    setWindowState((prev) => (prev === 'maximized' ? 'normal' : 'maximized'));
  };

  const handleClose = () => {
    setWindowState('closed');
  };

  const restoreWindow = () => {
    setWindowState('normal');
  };

  const restoreFromMinimize = () => {
    if (isMinimized) {
      setWindowState('normal');
    }
  };

  if (isClosed) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-ub-grey text-white">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-white/10 bg-ub-cool-grey/80 p-8 text-center shadow-2xl">
          <Image
            src="/themes/Yaru/apps/beef.svg"
            alt="BeEF badge"
            width={72}
            height={72}
            className="drop-shadow-lg"
            priority
          />
          <div>
            <h1 className="text-2xl font-semibold">Window closed</h1>
            <p className="mt-2 text-sm text-kali-muted">
              The BeEF demo window has been closed. Reopen it to continue exploring the simulation.
            </p>
          </div>
          <button
            type="button"
            onClick={restoreWindow}
            className="rounded-md bg-kali-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-kali-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ub-cool-grey"
          >
            Reopen window
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-ub-grey/80 p-4 text-white">
      <section
        className={frameClasses}
        data-window-state={windowState}
        data-testid="beef-window-frame"
      >
        <header className="flex items-center justify-between bg-ub-window-title px-4 py-3 text-sm font-medium">
          <div className="flex items-center gap-3">
            <Image
              src="/themes/Yaru/apps/beef.svg"
              alt="BeEF badge"
              width={32}
              height={32}
              className="drop-shadow"
              priority
            />
            <h1 className="text-lg font-semibold">BeEF Demo</h1>
            {isMaximized && <span className="rounded bg-black/30 px-2 py-0.5 text-xs uppercase tracking-wide">Maximized</span>}
            {isMinimized && <span className="rounded bg-black/30 px-2 py-0.5 text-xs uppercase tracking-wide">Minimized</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={isMinimized ? 'Restore window' : 'Minimize window'}
              onClick={isMinimized ? restoreFromMinimize : handleMinimize}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-lg font-semibold text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {isMinimized ? '▢' : '–'}
            </button>
            <button
              type="button"
              aria-label={isMaximized ? 'Restore window size' : 'Maximize window'}
              onClick={handleMaximize}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-base font-semibold text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {isMaximized ? '❐' : '▢'}
            </button>
            <button
              type="button"
              aria-label="Close window"
              onClick={handleClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-base font-semibold text-white transition hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              ×
            </button>
          </div>
        </header>

        {isMinimized ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-ub-cool-grey/60 p-6 text-center text-sm">
            <p className="text-kali-muted">
              The BeEF demo is minimized. Restore it to continue the walkthrough.
            </p>
            <button
              type="button"
              onClick={restoreFromMinimize}
              className="rounded-md bg-kali-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-kali-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ub-cool-grey"
            >
              Restore window
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <div className="flex-1 overflow-auto p-4">
              <BeefApp />
            </div>
            <div className="border-t border-white/10 bg-black/20 font-mono text-xs">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2">
                  <span
                    className={clsx(
                      'flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem]',
                      severityStyles[log.severity].color,
                    )}
                  >
                    <span>{severityStyles[log.severity].icon}</span>
                    {log.severity}
                  </span>
                  <span className="text-kali-muted">{log.time}</span>
                  <span className="truncate">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default BeefPage;
