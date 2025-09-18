'use client';

import { useMemo } from 'react';
import { useShellConfig } from '../../hooks/useShellConfig';
import DiagnosticLinks from './DiagnosticLinks';

export default function SafeModeBanner() {
  const { safeMode, optionalAppIds, lastKnownGood, restartWithLastKnownGood } = useShellConfig();

  const disabledCount = optionalAppIds.length;
  const lastKnownGoodLabel = useMemo(() => {
    if (!lastKnownGood) return null;
    try {
      return new Date(lastKnownGood.timestamp).toLocaleString();
    } catch {
      return null;
    }
  }, [lastKnownGood]);

  if (!safeMode) {
    return null;
  }

  return (
    <aside className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-4">
      <div className="pointer-events-auto w-full max-w-4xl rounded-lg border border-ub-orange/80 bg-black/85 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ub-orange">Safe mode active</h2>
            <p className="text-sm text-ubt-ice-white/90">
              Optional modules and plugin loaders are temporarily disabled to boot the desktop with minimal
              extensions.
              {lastKnownGoodLabel ? ` Last known good configuration captured ${lastKnownGoodLabel}.` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="rounded-full bg-ub-orange/20 px-3 py-1 text-xs font-semibold text-ub-orange">
              {disabledCount} modules offline
            </span>
            <button
              type="button"
              onClick={restartWithLastKnownGood}
              className="rounded-md bg-ub-orange px-3 py-2 text-sm font-medium text-black transition hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Exit &amp; restart
            </button>
          </div>
        </div>
        <DiagnosticLinks />
      </div>
    </aside>
  );
}
