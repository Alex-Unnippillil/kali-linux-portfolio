'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import BeefApp from '../../components/apps/beef';
import windowStyles from '../../components/base/window.module.css';

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
      'border-kali-primary/55 bg-kali-primary/15 text-kali-primary shadow-[0_0_14px_rgba(15,148,210,0.32)] ring-1 ring-kali-primary/35',
    label: 'Informational',
  },
  Medium: {
    icon: '🟡',
    chipClass:
      'border-kali-accent/60 bg-kali-accent/18 text-kali-accent shadow-[0_0_16px_rgba(15,148,210,0.36)] ring-1 ring-kali-accent/40',
    label: 'Warning',
  },
  High: {
    icon: '🔴',
    chipClass:
      'border-kali-error/65 bg-kali-error/15 text-kali-error shadow-[0_0_18px_rgba(255,77,109,0.38)] ring-1 ring-kali-error/45',
    label: 'Critical',
  },
};

const severityLabelClasses: Record<Severity, string> = {
  Low: 'text-kali-primary',
  Medium: 'text-kali-accent',
  High: 'text-kali-error',
};

const timelineBadgeClasses: Record<TimelineState, string> = {
  complete:
    'border-kali-primary/60 bg-[color:color-mix(in_srgb,var(--color-primary)_20%,var(--kali-panel))] text-kali-primary',
  active:
    'border-kali-accent/60 bg-[color:color-mix(in_srgb,var(--color-accent)_28%,var(--kali-panel))] text-kali-text shadow-[0_0_18px_rgba(15,148,210,0.28)] animate-pulse',
  pending: 'border-kali-border/60 bg-[color:var(--kali-overlay)] text-kali-text/75',
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
  'rounded-xl border border-kali-border/60 bg-[color:var(--kali-panel)] px-4 py-4 shadow-[0_18px_42px_rgba(15,148,210,0.14)] backdrop-blur flex flex-col gap-2';

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
        'relative mx-auto flex h-[32rem] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-kali-border/70 bg-[color:var(--kali-panel)] shadow-[0_24px_64px_rgba(15,148,210,0.16)] backdrop-blur transition-all duration-300 ease-in-out',
        {
          'h-[calc(100vh-4rem)] max-h-[calc(100vh-2rem)] w-full max-w-none rounded-none border-kali-accent/70 shadow-[0_0_60px_rgba(15,148,210,0.32)]':
            isMaximized,
          'scale-[0.98] opacity-70 pointer-events-none': isMinimized,
        },
      ),
    [isMaximized, isMinimized],
  );

  const controlButtonClass = clsx(
    windowStyles.windowControlButton,
    'mx-1 flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--kali-control-overlay)] text-kali-text transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-accent)_22%,var(--kali-control-overlay))] focus-visible:outline-none',
  );
  const closeButtonClass = clsx(
    windowStyles.windowControlButton,
    'mx-1 flex h-7 w-7 items-center justify-center rounded-full bg-kali-error text-kali-inverse transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-error)_85%,var(--kali-overlay))] focus-visible:outline-none',
  );

  if (isClosed) {
    return (
      <div className="flex h-full w-full flex-col bg-kali-background text-kali-text">
        <header className="flex flex-col gap-4 border-b border-kali-border/60 bg-[color:var(--kali-overlay)] p-4 backdrop-blur-sm lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex items-center gap-3">
            <Image
              src="/themes/Yaru/apps/beef.svg"
              alt="BeEF badge"
              width={48}
              height={48}
            />
            <div>
              <h1 className="text-xl font-semibold text-kali-text">BeEF Demo</h1>
              <p className="text-sm text-kali-text/75">Browser Exploitation Framework training lane</p>
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-3 text-sm sm:grid-cols-3 lg:w-auto">
            <div className={statCardClass}>
              <p className="text-xs uppercase tracking-wide text-kali-text/60">Active hooks</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-kali-text">3</span>
                <span className="text-xs text-kali-text/60">of 5 targets</span>
              </div>
              <p className="mt-1 text-xs text-kali-primary">+1 new hook this session</p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs uppercase tracking-wide text-kali-text/60">Campaign status</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-kali-primary/45 bg-kali-primary/18 px-2 py-0.5 text-xs font-semibold text-kali-primary">
                  <span aria-hidden className="text-base leading-none">●</span>
                  Live
                </span>
                <span className="text-xs text-kali-text/60">(simulated)</span>
              </div>
              <p className="mt-1 text-xs text-kali-text/75">Operator guidance active</p>
            </div>
            <div className={statCardClass}>
              <p className="text-xs uppercase tracking-wide text-kali-text/60">Last check-in</p>
              <div className="mt-1 text-lg font-semibold text-kali-text">{lastCheckIn}</div>
              <p className="mt-1 text-xs text-kali-text/75">Hooked client telemetry received</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end text-kali-text/80 lg:self-start">
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
            className="rounded-md bg-kali-primary px-4 py-2 text-sm font-medium text-kali-inverse shadow hover:bg-kali-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
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
                <div className="flex items-center gap-3 rounded-xl border border-kali-border/60 bg-[color:var(--kali-panel)] px-3 py-3 shadow-inner shadow-[0_0_24px_rgba(15,148,210,0.08)]">
                  <span
                    aria-hidden
                    className={`flex h-9 w-9 items-center justify-center rounded-full border text-base font-semibold ${timelineBadgeClasses[step.state]}`}
                  >
                    {timelineStateIcon[step.state]}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-kali-text">{step.label}</span>
                    <span className="text-[11px] uppercase tracking-wide text-kali-text/60">
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
    <div className="flex min-h-screen w-full items-center justify-center bg-kali-background/95 p-4 text-kali-text">
      <section
        className={frameClasses}
        data-window-state={windowState}
        data-testid="beef-window-frame"
      >
        <header
          className={clsx(
            windowStyles.windowTitlebar,
            'relative flex items-center justify-between bg-[color:var(--kali-overlay)] px-3 text-sm font-medium text-kali-text',
          )}
        >
          <div className="flex items-center gap-3">
            <Image
              src="/themes/Yaru/apps/beef.svg"
              alt="BeEF badge"
              width={24}
              height={24}
              className="drop-shadow"
              priority
            />
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold">BeEF Demo</h1>
              {isMaximized && (
                <span className="rounded-full border border-kali-accent/50 bg-kali-accent/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-kali-text">
                  Maximized
                </span>
              )}
              {isMinimized && (
                <>
                  <span className="rounded-full border border-kali-border/60 bg-[color:var(--kali-overlay)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-kali-text/80">
                    Minimized
                  </span>
                  <span className="sr-only">BeEF Demo is minimized</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              aria-label={isMinimized ? 'Restore window' : 'Minimize window'}
              onClick={isMinimized ? restoreFromMinimize : handleMinimize}
              className={controlButtonClass}
            >
              <Image
                src={
                  isMinimized
                    ? '/themes/Yaru/window/window-restore-symbolic.svg'
                    : '/themes/Yaru/window/window-minimize-symbolic.svg'
                }
                alt={isMinimized ? 'Restore window' : 'Minimize window'}
                width={16}
                height={16}
              />
            </button>
            <button
              type="button"
              aria-label={isMaximized ? 'Restore window size' : 'Maximize window'}
              onClick={handleMaximize}
              className={controlButtonClass}
            >
              <Image
                src={
                  isMaximized
                    ? '/themes/Yaru/window/window-restore-symbolic.svg'
                    : '/themes/Yaru/window/window-maximize-symbolic.svg'
                }
                alt={isMaximized ? 'Restore window size' : 'Maximize window'}
                width={16}
                height={16}
              />
            </button>
            <button
              type="button"
              aria-label="Close window"
              onClick={handleClose}
              className={closeButtonClass}
            >
              <Image
                src="/themes/Yaru/window/window-close-symbolic.svg"
                alt="Close window"
                width={16}
                height={16}
              />
            </button>
          </div>
        </header>

      <div className="flex-1 overflow-auto bg-[color:color-mix(in_srgb,var(--kali-panel)_65%,transparent)] p-4 pt-2">
        <BeefApp />
      </div>

      <section className="border-t border-kali-border/70 bg-[color:var(--kali-panel)] font-mono text-sm">
        <header className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-kali-text/60">
          Activity log
        </header>
        <ul role="list" className="divide-y divide-kali-border/60">
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
                <p className="text-sm leading-snug text-kali-text">{log.message}</p>
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-kali-text/60">
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
