'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import BeefApp from '../../components/apps/beef';

type Severity = 'Low' | 'Medium' | 'High';

type TimelineState = 'complete' | 'active' | 'pending';

interface LogEntry {
  offsetSeconds: number;
  severity: Severity;
  message: string;
}

const severityStyles: Record<Severity, { icon: string; chipClass: string; label: string }> = {
  Low: {
    icon: '🟢',
    chipClass:
      'border-emerald-400/50 bg-emerald-900/40 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/20',
    label: 'Informational',
  },
  Medium: {
    icon: '🟡',
    chipClass:
      'border-amber-400/60 bg-amber-900/40 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.35)] ring-1 ring-amber-400/25',
    label: 'Warning',
  },
  High: {
    icon: '🔴',
    chipClass:
      'border-red-400/70 bg-red-900/40 text-red-100 shadow-[0_0_16px_rgba(248,113,113,0.45)] ring-1 ring-red-500/30',
    label: 'Critical',
  },
};

const severityLabelClasses: Record<Severity, string> = {
  Low: 'text-emerald-200',
  Medium: 'text-amber-100',
  High: 'text-red-100',
};

const timelineBadgeClasses: Record<TimelineState, string> = {
  complete: 'border-emerald-400/60 bg-emerald-700/30 text-emerald-100',
  active: 'border-cyan-400/70 bg-cyan-600/30 text-cyan-100 animate-pulse',
  pending: 'border-gray-600 bg-gray-800 text-gray-300',
};

const timelineStateLabel: Record<TimelineState, string> = {
  complete: 'Phase completed',
  active: 'Phase in progress',
  pending: 'Phase queued',
};

const timelineStateIcon: Record<TimelineState, string> = {
  complete: '✓',
  active: '●',
  pending: '…',
};

const formatRelativeTime = (seconds: number) => {
  if (seconds < 60) {
    return `+${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `+${minutes}m`;
  }

  return `+${minutes}m ${remainingSeconds}s`;
};

const formatSince = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}m ago`;
  }

  return `${minutes}m ${remainingSeconds}s ago`;
};

type WindowState = 'normal' | 'minimized' | 'maximized' | 'closed';

const statCardClass =
  'rounded-xl border border-gray-800/60 bg-black/35 px-4 py-4 shadow-[0_12px_28px_rgba(6,182,212,0.12)] backdrop-blur flex flex-col gap-2';

const BeefPage: React.FC = () => {
  const [windowState, setWindowState] = useState<WindowState>('normal');

  const isMinimized = windowState === 'minimized';
  const isMaximized = windowState === 'maximized';
  const isClosed = windowState === 'closed';

  const handleMinimize = () => {
    setWindowState('minimized');
  };

  const restoreFromMinimize = () => {
    setWindowState('normal');
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
  const logs: LogEntry[] = [
    { offsetSeconds: 0, severity: 'Low', message: 'Hook initialized (simulation)' },
    { offsetSeconds: 2, severity: 'Medium', message: 'Payload delivered to sandbox browser' },
    { offsetSeconds: 6, severity: 'High', message: 'Sensitive data exfil attempt flagged' },
  ];

  const timelineSteps: { label: string; state: TimelineState }[] = [
    { label: 'Recon', state: 'complete' },
    { label: 'Delivery', state: 'active' },
    { label: 'Post-Exploitation', state: 'pending' },
  ];

  const lastCheckIn = formatSince(logs[logs.length - 1]?.offsetSeconds ?? 0);

  const frameClasses = useMemo(
    () =>
      clsx(
        'relative mx-auto flex h-[32rem] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-800/70 bg-black/40 shadow-2xl shadow-cyan-900/20 backdrop-blur transition-all duration-300 ease-in-out',
        {
          'h-[calc(100vh-4rem)] max-h-[calc(100vh-2rem)] w-full max-w-none rounded-none border-cyan-500/70 shadow-[0_0_60px_rgba(6,182,212,0.35)]':
            isMaximized,
          'scale-[0.98] opacity-70 pointer-events-none': isMinimized,
        },
      ),
    [isMaximized, isMinimized],
  );

  if (isClosed) {
    return (
      <div className="bg-ub-cool-grey text-white h-full w-full flex flex-col">
        <header className="flex flex-col gap-4 border-b border-gray-800 bg-black/30 p-4 backdrop-blur-sm lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex items-center gap-3">
            <Image
              src="/themes/Yaru/apps/beef.svg"
              alt="BeEF badge"
              width={48}
              height={48}
            />
            <div>
              <h1 className="text-xl font-semibold">BeEF Demo</h1>
              <p className="text-sm text-gray-300">Browser Exploitation Framework training lane</p>
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-3 text-sm sm:grid-cols-3 lg:w-auto">
            <div className={statCardClass}>
              <p className="text-xs uppercase tracking-wide text-gray-400">Active hooks</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-white">3</span>
                <span className="text-xs text-gray-400">of 5 targets</span>
              </div>
              <p className="mt-1 text-xs text-emerald-300">+1 new hook this session</p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs uppercase tracking-wide text-gray-400">Campaign status</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-700/30 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                  <span aria-hidden className="text-base leading-none">●</span>
                  Live
                </span>
                <span className="text-xs text-gray-400">(simulated)</span>
              </div>
              <p className="mt-1 text-xs text-gray-300">Operator guidance active</p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs uppercase tracking-wide text-gray-400">Last check-in</p>
              <div className="mt-1 text-lg font-semibold text-white">{lastCheckIn}</div>
              <p className="mt-1 text-xs text-gray-300">Hooked client telemetry received</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end text-gray-200 lg:self-start">
          <img
            src="/themes/Yaru/window/window-minimize-symbolic.svg"
            alt="minimize"
            className="h-6 w-6"
          />
          <img
            src="/themes/Yaru/window/window-close-symbolic.svg"
            alt="close"
            className="h-6 w-6"
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
      </header>

      <div className="px-4 pt-3">
        <nav aria-label="BeEF campaign timeline">
          <ol className="grid gap-3 sm:grid-cols-3">
            {timelineSteps.map((step) => (
              <li key={step.label}>
                <div className="flex items-center gap-3 rounded-xl border border-gray-800/60 bg-black/45 px-3 py-3 shadow-inner shadow-cyan-900/10">
                  <span
                    aria-hidden
                    className={`flex h-9 w-9 items-center justify-center rounded-full border text-base font-semibold ${timelineBadgeClasses[step.state]}`}
                  >
                    {timelineStateIcon[step.state]}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-100">{step.label}</span>
                    <span className="text-[11px] uppercase tracking-wide text-gray-400">
                      {timelineStateLabel[step.state]}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </nav>
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

      <div className="flex-1 overflow-auto p-4 pt-2">
        <BeefApp />
      </div>

      <section className="border-t border-gray-800 bg-black/40 font-mono text-sm">
        <header className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Activity log
        </header>
        <ul role="list" className="divide-y divide-gray-800/70">
          {logs.map((log, idx) => (
            <li key={idx} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex items-center gap-3 sm:w-48">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg shadow-lg backdrop-blur ${severityStyles[log.severity].chipClass}`}
                >
                  <span aria-hidden>{severityStyles[log.severity].icon}</span>
                </span>
                <span
                  className={clsx(
                    'text-[11px] font-semibold uppercase tracking-[0.2em]',
                    severityLabelClasses[log.severity],
                  )}
                >
                  {severityStyles[log.severity].label}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <p className="text-sm leading-snug text-gray-100">{log.message}</p>
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
                  {formatRelativeTime(log.offsetSeconds)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
      </section>
    </div>
  );
};

export default BeefPage;
