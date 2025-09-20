'use client';

import React from 'react';
import { useShellConfig } from '../../hooks/useShellConfig';

const ModeBanner: React.FC = () => {
  const {
    redTeamMode,
    toggleRedTeamMode,
    evidenceCaptureEnabled,
    evidence,
    warnings,
    dismissWarning,
  } = useShellConfig();

  const latestWarning = warnings[0];

  if (!redTeamMode) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-[1500]">
        <button
          type="button"
          onClick={toggleRedTeamMode}
          className="pointer-events-auto rounded-full border border-red-400/70 bg-black/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-200 shadow-lg transition hover:bg-red-900/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
        >
          Enter Red Team Mode
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 z-[1600] w-full max-w-[28rem] -translate-x-1/2 px-3">
      <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-red-500/80 bg-gradient-to-br from-red-900/95 via-red-900/85 to-black/80 px-4 py-3 text-red-100 shadow-2xl">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 inline-flex h-3 w-3 flex-none animate-pulse rounded-full bg-red-400"
            aria-hidden="true"
          />
          <div className="flex-1 space-y-2">
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-100/90">
                Red Team Mode Active
              </p>
              <p className="text-xs leading-relaxed text-red-100/80">
                Evidence capture {evidenceCaptureEnabled ? 'enabled' : 'paused'} · {evidence.length} item
                {evidence.length === 1 ? '' : 's'} logged
              </p>
            </div>
            {latestWarning ? (
              <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3" aria-live="polite">
                <p className="text-xs font-semibold text-amber-200">
                  ⚠ {latestWarning.message}
                </p>
                <button
                  type="button"
                  onClick={() => dismissWarning(latestWarning.id)}
                  className="mt-2 text-[11px] uppercase tracking-[0.2em] text-amber-200/90 underline decoration-dotted underline-offset-4 hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <p className="text-[11px] uppercase tracking-[0.3em] text-red-200/70">
                Operational safeguards engaged.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={toggleRedTeamMode}
            className="ml-2 rounded-md bg-red-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow hover:bg-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModeBanner;
