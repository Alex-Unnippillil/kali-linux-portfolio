'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import windowStyles from '../../components/base/window.module.css';
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
      'border-[color:color-mix(in_srgb,var(--color-primary)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_18%,rgba(5,12,20,0.78))] text-[color:color-mix(in_srgb,var(--color-text)_85%,var(--color-primary)_15%)] shadow-[0_0_18px_color-mix(in_srgb,var(--color-primary)_28%,transparent)] ring-1 ring-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)]',
    label: 'Informational',
  },
  Medium: {
    icon: '🟡',
    chipClass:
      'border-[color:color-mix(in_srgb,var(--color-accent)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_18%,rgba(5,12,20,0.78))] text-[color:color-mix(in_srgb,var(--color-text)_85%,var(--color-accent)_15%)] shadow-[0_0_18px_color-mix(in_srgb,var(--color-accent)_30%,transparent)] ring-1 ring-[color:color-mix(in_srgb,var(--color-accent)_35%,transparent)]',
    label: 'Warning',
  },
  High: {
    icon: '🔴',
    chipClass:
      'border-[color:color-mix(in_srgb,var(--color-error,_#f97373)_65%,transparent)] bg-[color:color-mix(in_srgb,var(--color-error,_#f97373)_20%,rgba(22,7,10,0.82))] text-[color:color-mix(in_srgb,var(--color-text)_82%,var(--color-error,_#f97373)_18%)] shadow-[0_0_20px_color-mix(in_srgb,var(--color-error,_#f97373)_35%,transparent)] ring-1 ring-[color:color-mix(in_srgb,var(--color-error,_#f97373)_40%,transparent)]',
    label: 'Critical',
  },
};

const severityLabelClasses: Record<Severity, string> = {
  Low: 'text-[color:var(--color-primary)]',
  Medium: 'text-[color:var(--color-accent)]',
  High: 'text-[color:var(--color-error,_#f97373)]',
};

const timelineBadgeClasses: Record<TimelineState, string> = {
  complete:
    'border-[color:color-mix(in_srgb,var(--color-primary)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_15%,rgba(6,12,20,0.8))] text-[color:color-mix(in_srgb,var(--color-text)_88%,var(--color-primary)_12%)]',
  active:
    'border-[color:color-mix(in_srgb,var(--color-accent)_60%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_20%,rgba(6,12,20,0.8))] text-[color:color-mix(in_srgb,var(--color-text)_88%,var(--color-accent)_12%)] animate-pulse',
  pending:
    'border-[color:color-mix(in_srgb,var(--color-border)_90%,transparent)] bg-[color:color-mix(in_srgb,var(--color-muted)_40%,rgba(6,12,20,0.84))] text-[color:color-mix(in_srgb,var(--color-text)_65%,var(--color-muted)_20%)]',
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
  'rounded-xl border border-[color:color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--color-surface)_82%,rgba(4,12,20,0.85))] px-4 py-4 shadow-[0_24px_48px_rgba(4,16,28,0.45)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-border)_40%,transparent)] backdrop-blur flex flex-col gap-2';

const windowStateBadgeClass =
  'hidden sm:inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.28em]';

const maximizedStateClasses =
  'border-[color:color-mix(in_srgb,var(--color-accent)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-accent)_20%,rgba(6,12,20,0.82))] text-[color:color-mix(in_srgb,var(--color-text)_88%,var(--color-accent)_12%)]';
const minimizedStateClasses =
  'border-[color:color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--color-muted)_45%,rgba(6,12,20,0.85))] text-[color:color-mix(in_srgb,var(--color-text)_72%,var(--color-muted)_20%)]';

const controlButtonClass = `${windowStyles.windowControlButton} mx-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/0 transition hover:bg-white/10 focus-visible:outline-none`;
const closeControlButtonClass = `${windowStyles.windowControlButton} mx-1 flex h-7 w-7 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,var(--color-error,_#f97373)_25%,rgba(6,12,20,0.78))] transition hover:bg-[color:color-mix(in_srgb,var(--color-error,_#f97373)_45%,rgba(6,12,20,0.78))] focus-visible:outline-none`;

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
        'relative mx-auto flex h-[32rem] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] shadow-[0_36px_72px_rgba(3,12,24,0.55)] backdrop-blur-xl transition-all duration-300 ease-in-out',
        {
          'h-[calc(100vh-4rem)] max-h-[calc(100vh-2rem)] w-full max-w-none rounded-none border-[color:color-mix(in_srgb,var(--color-window-accent)_65%,transparent)] shadow-[0_0_90px_color-mix(in_srgb,var(--color-window-accent)_55%,transparent)]':
            isMaximized,
          'scale-[0.97] opacity-70 pointer-events-none saturate-[0.85]': isMinimized,
        },
      ),
    [isMaximized, isMinimized],
  );

  if (isClosed) {
    return (
      <div className="flex h-full w-full flex-col bg-[color:color-mix(in_srgb,var(--kali-bg)_92%,rgba(4,10,16,0.9))] text-white">
        <header className="flex flex-col gap-4 border-b border-[color:color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--color-muted)_38%,rgba(6,12,20,0.9))] p-4 backdrop-blur-lg lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/themes/Yaru/apps/beef.svg"
                alt="BeEF badge"
                width={48}
                height={48}
                className="drop-shadow-[0_0_18px_var(--kali-blue-glow)]"
              />
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">BeEF Demo</h1>
                <p className="text-sm text-white/65">Browser Exploitation Framework training lane</p>
              </div>
            </div>
            <div className="grid w-full grid-cols-1 gap-3 text-sm sm:grid-cols-3 lg:w-auto">
              <div className={statCardClass}>
                <p className="text-xs uppercase tracking-wide text-white/55">Active hooks</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-white">3</span>
                  <span className="text-xs text-white/55">of 5 targets</span>
                </div>
                <p className="mt-1 text-xs text-[color:color-mix(in_srgb,var(--color-primary)_75%,var(--color-text)_25%)]">+1 new hook this session</p>
              </div>
              <div className={statCardClass}>
                <p className="text-xs uppercase tracking-wide text-white/55">Campaign status</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_20%,rgba(6,12,20,0.82))] px-2 py-0.5 text-xs font-semibold text-[color:color-mix(in_srgb,var(--color-text)_88%,var(--color-primary)_12%)] shadow-[0_0_14px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]">
                    <span aria-hidden className="flex h-2 w-2 rounded-full bg-[color:var(--color-primary)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]" />
                    Live
                  </span>
                  <span className="text-xs text-white/55">(simulated)</span>
                </div>
                <p className="mt-1 text-xs text-white/65">Operator guidance active</p>
              </div>
              <div className={statCardClass}>
                <p className="text-xs uppercase tracking-wide text-white/55">Last check-in</p>
                <div className="mt-1 text-lg font-semibold text-white">{lastCheckIn}</div>
                <p className="mt-1 text-xs text-white/65">Hooked client telemetry received</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 text-left lg:text-right">
            <div className="flex items-center gap-2 text-white/75 lg:justify-end">
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
            </div>
            <div>
              <h2 className="text-lg font-semibold">Window closed</h2>
              <p className="mt-1 text-sm text-white/65">
                The BeEF demo window has been closed. Reopen it to continue exploring the simulation.
              </p>
            </div>
            <button
              type="button"
              onClick={restoreWindow}
              className="inline-flex items-center justify-center rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_40%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_75%,rgba(6,12,20,0.2))] px-4 py-2 text-sm font-semibold text-[color:color-mix(in_srgb,var(--color-text)_90%,var(--color-primary)_10%)] shadow-[0_12px_32px_rgba(4,16,28,0.45)] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_85%,rgba(6,12,20,0.2))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
                  <div className="flex items-center gap-3 rounded-xl border border-[color:color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-[color:color-mix(in_srgb,var(--color-muted)_38%,rgba(6,12,20,0.85))] px-3 py-3 shadow-inner shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <span
                      aria-hidden
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-base font-semibold ${timelineBadgeClasses[step.state]}`}
                    >
                      {timelineStateIcon[step.state]}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white/90">{step.label}</span>
                      <span className="text-[11px] uppercase tracking-wide text-white/55">
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
    <div className="flex min-h-screen w-full items-center justify-center bg-[color:color-mix(in_srgb,var(--kali-bg)_88%,rgba(4,10,16,0.9))] p-4 text-white">
      <section
        className={frameClasses}
        data-window-state={windowState}
        data-testid="beef-window-frame"
      >
        <header className="border-b border-[color:color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color:color-mix(in_srgb,var(--color-muted)_34%,rgba(6,12,20,0.92))] text-sm text-white shadow-[0_1px_0_rgba(255,255,255,0.04)]">
          <div className={clsx('flex items-center justify-between px-4', windowStyles.windowTitlebar)}>
            <div className="flex items-center gap-3">
              <Image
                src="/themes/Yaru/apps/beef.svg"
                alt="BeEF badge"
                width={28}
                height={28}
                className="drop-shadow-[0_0_14px_var(--kali-blue-glow)]"
                priority
              />
              <span className="text-base font-semibold leading-none">BeEF Demo</span>
              {isMaximized && (
                <span className={clsx(windowStateBadgeClass, maximizedStateClasses)}>Maximized</span>
              )}
              {isMinimized && (
                <span className={clsx(windowStateBadgeClass, minimizedStateClasses)}>Minimized</span>
              )}
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
                className={closeControlButtonClass}
              >
                <Image
                  src="/themes/Yaru/window/window-close-symbolic.svg"
                  alt="Close window"
                  width={16}
                  height={16}
                />
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 pt-3 text-xs uppercase tracking-[0.28em] text-white/55">
          Browser Exploitation Framework training lane
        </div>

        <div className="flex-1 overflow-auto px-4 pb-4 pt-2">
          <BeefApp />
        </div>

      <section className="border-t border-[color:color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--color-muted)_32%,rgba(6,12,20,0.88))] font-mono text-sm shadow-[0_-1px_0_rgba(255,255,255,0.04)]">
        <header className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/55">
          Activity log
        </header>
        <ul role="list" className="divide-y divide-[color:color-mix(in_srgb,var(--color-border)_65%,transparent)]">
          {logs.map((log, idx) => (
            <li key={idx} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex items-center gap-3 sm:w-52">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg shadow-[0_0_22px_rgba(3,15,28,0.55)] backdrop-blur ${severityStyles[log.severity].chipClass}`}
                >
                  <span aria-hidden>{severityStyles[log.severity].icon}</span>
                </span>
                <span
                  className={clsx(
                    'text-[11px] font-semibold uppercase tracking-[0.22em]',
                    severityLabelClasses[log.severity],
                  )}
                >
                  {severityStyles[log.severity].label}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <p className="text-sm leading-snug text-white/85">{log.message}</p>
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
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
