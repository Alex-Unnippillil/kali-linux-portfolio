'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type OfflineApp = {
  description: string;
  href: string;
  name: string;
};

const OFFLINE_APPS: OfflineApp[] = [
  {
    href: '/apps/terminal',
    name: 'Terminal',
    description: 'Run the simulated shell and explore built-in man pages.',
  },
  {
    href: '/apps/2048',
    name: '2048',
    description: 'Keep your puzzle streak going without a network connection.',
  },
  {
    href: '/apps/checkers',
    name: 'Checkers',
    description: 'Play a quick board game while the connection recovers.',
  },
  {
    href: '/apps/sticky_notes',
    name: 'Sticky Notes',
    description: 'Draft notes locally — they stay cached until you come back online.',
  },
  {
    href: '/apps/minesweeper',
    name: 'Minesweeper',
    description: 'Classic logic puzzle that works completely offline.',
  },
  {
    href: '/apps/weather',
    name: 'Weather',
    description: 'Review the last forecast that was synced before going offline.',
  },
];

const overlayId = 'offline-overlay-heading';

const normalizePath = (path: string, basePath: string): string => {
  if (!basePath || basePath === '/') return path;
  return `${basePath}${path}`;
};

const OfflineOverlay = (): ReactElement | null => {
  const [isOffline, setIsOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleStatusChange = () => {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setIsOffline(offline);
      if (!offline) {
        setDismissed(false);
        setIsRetrying(false);
      }
    };

    handleStatusChange();

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const basePath = useMemo(() => {
    const raw =
      typeof window !== 'undefined'
        ? (window as typeof window & {
            __NEXT_DATA__?: { assetPrefix?: string; buildId?: string; runtimeConfig?: Record<string, unknown> };
          }).__NEXT_DATA__?.assetPrefix ??
          process.env.NEXT_PUBLIC_BASE_PATH ??
          process.env.BASE_PATH
        : undefined;
    if (!raw) return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    return trimmed.endsWith('/') && trimmed !== '/' ? trimmed.slice(0, -1) : trimmed;
  }, []);

  const offlineApps = useMemo(
    () =>
      OFFLINE_APPS.map((app) => ({
        ...app,
        href: normalizePath(app.href, basePath),
      })),
    [basePath],
  );

  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    window.location.reload();
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  if (!isOffline || dismissed) {
    return null;
  }

  return (
    <div
      aria-labelledby={overlayId}
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 px-4 py-6"
      role="dialog"
    >
      <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/95 p-6 text-left shadow-2xl">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-white">
            <p className="text-sm uppercase tracking-wide text-blue-200">Offline mode</p>
            <h2 className="text-2xl font-semibold" id={overlayId}>
              You are currently offline
            </h2>
            <p className="text-sm text-slate-200">
              The desktop shell is still available, but live data and sync features are paused until your connection returns.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex min-w-[8rem] items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-wait disabled:opacity-75"
              onClick={handleRetry}
              type="button"
              disabled={isRetrying}
            >
              {isRetrying ? 'Reconnecting…' : 'Retry now'}
            </button>
            <button
              className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              onClick={handleDismiss}
              type="button"
            >
              Continue offline
            </button>
          </div>
          <section aria-label="Offline ready apps" className="rounded-lg bg-slate-800/80 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
              Cached tools you can still open
            </h3>
            <ul className="mt-3 space-y-3" role="list">
              {offlineApps.map((app) => (
                <li key={app.href} className="rounded-md border border-slate-700/70 bg-slate-900/50 p-3">
                  <a
                    className="flex flex-col gap-1 text-slate-100 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                    href={app.href}
                  >
                    <span className="text-sm font-medium">{app.name}</span>
                    <span className="text-xs text-slate-300">{app.description}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
          <section aria-label="Offline tips" className="text-xs text-slate-300">
            <p>
              Tip: You can always access this offline workspace from the app menu. Try reloading after reconnecting to refresh live
              widgets and sync your latest progress.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default OfflineOverlay;
