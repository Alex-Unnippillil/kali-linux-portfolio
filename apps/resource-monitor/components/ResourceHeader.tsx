'use client';

import React from 'react';
import { AutoPauseReason } from '../scheduler';

interface ResourceHeaderProps {
  cpuUsage: number;
  queued: number;
  running: number;
  completed: number;
  maxParallel: number;
  userPaused: boolean;
  autoPaused: boolean;
  autoPauseReason: AutoPauseReason;
  onParallelismChange: (value: number) => void;
  onPause: () => void;
  onResume: () => void;
}

const formatUsage = (value: number) => `${value.toFixed(1)}%`;

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const BackpressureNotice = ({ reason }: { reason: AutoPauseReason }) => {
  if (!reason) return null;
  if (reason.type === 'cpu') {
    return (
      <p
        className="mt-2 rounded border border-yellow-500/60 bg-yellow-900/40 px-2 py-1 text-xs text-yellow-200"
        role="status"
        aria-live="polite"
      >
        Backpressure engaged: CPU usage {formatUsage(reason.usage)} exceeded the
        {` ${reason.threshold}%`} safety budget. New jobs will queue until usage
        falls below the resume threshold.
      </p>
    );
  }
  return null;
};

const StatBlock = ({
  label,
  value,
  testId,
}: {
  label: string;
  value: number;
  testId: string;
}) => (
  <div className="flex flex-col rounded border border-[var(--kali-border)] bg-[var(--kali-panel)] px-2 py-1">
    <span className="text-[10px] uppercase tracking-wide text-gray-300">{label}</span>
    <span
      className="font-mono text-lg"
      data-testid={testId}
      aria-label={label}
    >
      {value}
    </span>
  </div>
);

export default function ResourceHeader({
  cpuUsage,
  queued,
  running,
  completed,
  maxParallel,
  userPaused,
  autoPaused,
  autoPauseReason,
  onParallelismChange,
  onPause,
  onResume,
}: ResourceHeaderProps) {
  const isUserPaused = userPaused;
  const isAutoPaused = autoPaused && !userPaused;
  const sliderId = 'resource-monitor-parallelism';
  const limitLabel = `Limit: ${maxParallel}`;

  const usageClass =
    cpuUsage < 60 ? 'bg-green-500' : cpuUsage < 80 ? 'bg-yellow-400' : 'bg-red-500';

  return (
    <header className="mb-3 rounded-lg border border-[var(--kali-border)] bg-[var(--kali-panel)] p-3 text-xs text-white">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[140px] flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wide text-gray-300">
              CPU usage
            </span>
            <span className="font-mono text-sm" aria-live="polite">
              {formatUsage(cpuUsage)}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded bg-gray-700">
            <div
              className={`h-full transition-all duration-500 ${usageClass}`}
              style={{ width: `${clampPercent(cpuUsage)}%` }}
              role="presentation"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <StatBlock label="Queued" value={queued} testId="queued-count" />
          <StatBlock label="Running" value={running} testId="running-count" />
          <StatBlock label="Completed" value={completed} testId="completed-count" />
        </div>
        <div className="ml-auto flex flex-col gap-1">
          <label htmlFor={sliderId} className="text-[10px] uppercase tracking-wide text-gray-300">
            Parallelism limit
          </label>
          <div className="flex items-center gap-2">
            <input
              id={sliderId}
              type="range"
              min={1}
              max={8}
              value={maxParallel}
              onChange={(event) => onParallelismChange(Number(event.target.value))}
              aria-valuemin={1}
              aria-valuemax={8}
              aria-valuenow={maxParallel}
              aria-label="Parallelism limit"
              className="h-2 w-36 cursor-pointer appearance-none rounded bg-gray-700 accent-green-400"
            />
            <span className="font-mono text-sm" aria-live="polite">
              {limitLabel}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPause}
            className="rounded bg-gray-800 px-3 py-1 text-xs font-semibold hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isUserPaused}
          >
            Pause
          </button>
          <button
            type="button"
            onClick={onResume}
            className="rounded bg-green-700 px-3 py-1 text-xs font-semibold text-black hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={isAutoPaused}
          >
            Resume
          </button>
        </div>
      </div>
      {isUserPaused && (
        <p className="mt-2 rounded border border-blue-400/40 bg-blue-900/30 px-2 py-1 text-xs text-blue-100" role="status">
          Simulation paused manually. Resume to allow new jobs to start.
        </p>
      )}
      {!isUserPaused && <BackpressureNotice reason={autoPauseReason} />}
    </header>
  );
}
