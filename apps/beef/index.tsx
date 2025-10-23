'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';

import BeefLabDashboard from '../../components/apps/beef';
import modulesFixture from '../../components/apps/beef/modules.json';
import windowStyles from '../../components/base/window.module.css';

type WindowState = 'normal' | 'minimized' | 'maximized' | 'closed';

const statCardClass =
  'rounded-xl border border-kali-border/70 bg-[color:var(--kali-panel)] px-4 py-4 shadow-[0_20px_48px_rgba(15,148,210,0.18)] backdrop-blur flex flex-col gap-2';

const BeefPage: React.FC = () => {
  const [windowState, setWindowState] = useState<WindowState>('normal');

  const isMinimized = windowState === 'minimized';
  const isMaximized = windowState === 'maximized';
  const isClosed = windowState === 'closed';

  const modulesCount = modulesFixture.modules.length;

  const summaryMetrics = useMemo(
    () => [
      {
        label: 'Active hooks',
        value: '3',
        helper: 'Simulated browsers',
      },
      {
        label: 'Modules loaded',
        value: `${modulesCount}`,
        helper: 'JSON fixtures',
      },
      {
        label: 'Lab safety',
        value: 'Gated',
        helper: 'Acknowledge warning banner',
      },
    ],
    [modulesCount],
  );

  const frameClasses = useMemo(
    () =>
      clsx(
        'relative mx-auto flex h-[32rem] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-kali-border/70 bg-[color:var(--kali-panel)] shadow-[0_24px_64px_rgba(15,148,210,0.2)] backdrop-blur transition-all duration-300 ease-in-out',
        {
          'h-[calc(100vh-4rem)] max-h-[calc(100vh-2rem)] w-full max-w-none rounded-none border-kali-accent/70 shadow-[0_0_60px_rgba(26,220,170,0.32)]':
            isMaximized,
          'pointer-events-none scale-[0.97] opacity-65': isMinimized,
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

  if (isClosed) {
    return (
      <div className="flex h-full w-full flex-col bg-kali-background text-kali-text">
        <header className="flex flex-col gap-4 border-b border-kali-border/60 bg-[color:var(--kali-overlay)] p-4 backdrop-blur-sm lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex items-center gap-3">
              <Image src="/themes/Yaru/apps/beef.svg" alt="BeEF badge" width={48} height={48} />
              <div>
                <h1 className="text-xl font-semibold text-kali-text">BeEF Demo</h1>
                <p className="text-sm text-kali-text/75">Browser Exploitation Framework training lane</p>
              </div>
            </div>
            <div className="grid w-full grid-cols-1 gap-3 text-sm sm:grid-cols-3 lg:w-auto">
              {summaryMetrics.map((metric) => (
                <div key={metric.label} className={statCardClass}>
                  <p className="text-xs uppercase tracking-wide text-kali-text/60">{metric.label}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-kali-text">{metric.value}</span>
                    <span className="text-xs text-kali-text/60">{metric.helper}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex max-w-xl flex-col gap-2 text-sm text-kali-text/75">
            <h2 className="text-2xl font-semibold text-kali-text">Window closed</h2>
            <p>
              The dashboard window is closed. Reopen it to continue the guided BeEF walkthrough with lab gating, module explorer,
              and command composer.
            </p>
            <button
              type="button"
              onClick={restoreWindow}
              className="self-start rounded-md bg-kali-primary px-4 py-2 text-sm font-medium text-kali-inverse shadow hover:bg-kali-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg)]"
            >
              Reopen window
            </button>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-kali-background/95 p-4 text-kali-text">
      <section className={frameClasses} data-window-state={windowState} data-testid="beef-window-frame">
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
                <span className="rounded-full border border-kali-border/60 bg-[color:var(--kali-overlay)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-kali-text/80">
                  Minimized
                </span>
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
            <button type="button" aria-label="Close window" onClick={handleClose} className={closeButtonClass}>
              <Image src="/themes/Yaru/window/window-close-symbolic.svg" alt="Close window" width={16} height={16} />
            </button>
          </div>
        </header>
        {isMinimized && (
          <p className="px-4 pt-2 text-xs font-medium uppercase tracking-wide text-kali-text/70" role="status" aria-live="polite">
            BeEF Demo is minimized. Use the restore button to continue exploring the dashboard.
          </p>
        )}
        <div className="flex-1 overflow-auto bg-[color:color-mix(in_srgb,var(--kali-panel)_65%,transparent)] p-4 pt-3">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            {summaryMetrics.map((metric) => (
              <div key={metric.label} className={statCardClass}>
                <p className="text-xs uppercase tracking-wide text-kali-text/60">{metric.label}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-semibold text-kali-text">{metric.value}</span>
                  <span className="text-xs text-kali-text/60">{metric.helper}</span>
                </div>
              </div>
            ))}
          </div>
          <BeefLabDashboard />
        </div>
      </section>
    </div>
  );
};

export default BeefPage;

