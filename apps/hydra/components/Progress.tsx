'use client';

import React, { useMemo } from 'react';

export type EtaStability = 'collecting' | 'low' | 'medium' | 'high';

export interface ProgressAttempt {
  time: number;
  result?: string;
}

export interface EtaMetrics {
  completed: number;
  remaining: number;
  etaSeconds: number | null;
  averageDuration: number | null;
  stability: EtaStability;
  variation: number | null;
  windowSize: number;
  samplesCollected: number;
  samplesNeeded: number;
}

export const computeEtaMetrics = (
  attempts: ProgressAttempt[],
  limit: number
): EtaMetrics => {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
  const sanitizedAttempts = (attempts ?? []).filter(
    (attempt) => typeof attempt.time === 'number' && !Number.isNaN(attempt.time)
  );

  const clampedAttempts =
    safeLimit > 0 ? sanitizedAttempts.slice(0, safeLimit) : sanitizedAttempts;

  const completed = Math.min(clampedAttempts.length, safeLimit || clampedAttempts.length);
  const remaining = Math.max(safeLimit - completed, 0);
  const referenceSize = safeLimit || Math.max(clampedAttempts.length, 1);
  const windowSize = Math.max(1, Math.floor(referenceSize * 0.05));

  if (completed === 0 || referenceSize === 0) {
    return {
      completed: 0,
      remaining: Math.max(safeLimit, 0),
      etaSeconds: null,
      averageDuration: null,
      stability: 'collecting',
      variation: null,
      windowSize: safeLimit === 0 ? 0 : windowSize,
      samplesCollected: 0,
      samplesNeeded: safeLimit === 0 ? 0 : windowSize,
    };
  }

  const durations: number[] = [];
  let lastTime = 0;
  for (let i = 0; i < completed; i++) {
    const current = Math.max(0, clampedAttempts[i].time);
    const delta = Math.max(0, current - lastTime);
    durations.push(delta);
    lastTime = current;
  }

  const samplesCollected = durations.length;
  const baselineWindow = Math.min(windowSize, durations.length);

  const baselineDurations = durations.slice(0, Math.max(baselineWindow, 1));
  const baselineSum = baselineDurations.reduce((total, value) => total + value, 0);
  const baselineAverage =
    baselineDurations.length > 0 ? baselineSum / baselineDurations.length : 0;

  let movingAverage = baselineAverage;

  if (durations.length > baselineWindow && baselineWindow > 0) {
    let currentAverage = movingAverage;
    for (let i = baselineWindow; i < durations.length; i++) {
      currentAverage += (durations[i] - currentAverage) / baselineWindow;
    }
    movingAverage = currentAverage;
  }

  if (movingAverage <= 0) {
    const total = durations.reduce((total, value) => total + value, 0);
    movingAverage = durations.length > 0 ? total / durations.length : 0;
  }

  const activeDurations = durations.slice(-windowSize);
  const activeMean =
    activeDurations.length > 0
      ? activeDurations.reduce((total, value) => total + value, 0) /
        activeDurations.length
      : 0;
  const activeVariance =
    activeDurations.length > 0
      ? activeDurations.reduce(
          (total, value) => total + Math.pow(value - activeMean, 2),
          0
        ) / activeDurations.length
      : 0;
  const activeStdDev = Math.sqrt(activeVariance);
  const variation = activeMean > 0 ? activeStdDev / activeMean : null;

  let stability: EtaStability = 'collecting';
  if (variation != null && durations.length >= windowSize) {
    if (variation < 0.1) {
      stability = 'high';
    } else if (variation < 0.2) {
      stability = 'medium';
    } else {
      stability = 'low';
    }
  }

  const etaSeconds = movingAverage > 0 ? movingAverage * remaining : null;

  return {
    completed,
    remaining,
    etaSeconds,
    averageDuration: movingAverage > 0 ? movingAverage : null,
    stability,
    variation,
    windowSize,
    samplesCollected,
    samplesNeeded: Math.max(windowSize - samplesCollected, 0),
  };
};

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '—';
  }
  if (seconds === 0) {
    return '0s';
  }
  const rounded = Math.max(0, seconds);
  if (rounded < 60) {
    return `${rounded.toFixed(1)}s`;
  }
  const totalSeconds = Math.round(rounded);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

interface ProgressProps {
  attempts: ProgressAttempt[];
  totalAttempts: number;
  lockoutThreshold: number;
}

const stabilityMeta: Record<
  EtaStability,
  { label: string; color: string; helper?: string }
> = {
  collecting: {
    label: 'Collecting baseline…',
    color: 'bg-yellow-400',
    helper: 'Waiting for early attempts to stabilise the average pace.',
  },
  low: {
    label: 'Low confidence',
    color: 'bg-red-500',
    helper: 'Large swings detected; expect the ETA to fluctuate.',
  },
  medium: {
    label: 'Moderate confidence',
    color: 'bg-orange-400',
    helper: 'Trend is forming, but more samples will improve accuracy.',
  },
  high: {
    label: 'High confidence',
    color: 'bg-green-500',
    helper: 'ETA steady. Pace has stabilised across the sample window.',
  },
};

const Progress: React.FC<ProgressProps> = ({
  attempts,
  totalAttempts,
  lockoutThreshold,
}) => {
  const limitCandidates = [totalAttempts, lockoutThreshold].filter(
    (value) => typeof value === 'number' && value > 0
  );
  const limit = limitCandidates.length > 0 ? Math.min(...limitCandidates) : 0;

  const metrics = useMemo(
    () => computeEtaMetrics(attempts, limit),
    [attempts, limit]
  );

  const stability = stabilityMeta[metrics.stability];
  const etaLabel =
    metrics.etaSeconds != null ? `≈ ${formatDuration(metrics.etaSeconds)}` : 'Collecting data…';

  return (
    <section
      className="mt-4 rounded-md border border-gray-700 bg-gray-800 p-4 text-sm text-gray-100"
      aria-live="polite"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-gray-400">Estimated time left</span>
        <span className="font-mono text-lg text-green-300">{etaLabel}</span>
      </div>
      <div className="mt-2 grid gap-1 text-xs text-gray-300 sm:grid-cols-2">
        <span>
          Completed {metrics.completed} / {limit || metrics.completed || '—'} attempts
        </span>
        <span>
          Pace window ({metrics.windowSize || 1} attempts):{' '}
          {metrics.averageDuration != null
            ? `${metrics.averageDuration.toFixed(2)}s`
            : 'collecting'}
        </span>
        <span>
          Remaining attempts:{' '}
          {limit ? Math.max(limit - metrics.completed, 0) : '—'}
        </span>
        <span>
          Samples collected: {metrics.samplesCollected}
          {metrics.samplesNeeded > 0 && ` / ${metrics.samplesCollected + metrics.samplesNeeded}`}
        </span>
      </div>
      <div className="mt-3 flex items-center text-xs text-gray-200">
        <span
          className={`mr-2 inline-flex h-2 w-2 rounded-full ${stability.color}`}
          aria-hidden="true"
        />
        <span className="font-medium">{stability.label}</span>
        {metrics.variation != null && (
          <span className="ml-2 text-gray-400">
            ±{(metrics.variation * 100).toFixed(1)}% variation
          </span>
        )}
      </div>
      {metrics.samplesNeeded > 0 && metrics.stability === 'collecting' && (
        <p className="mt-2 text-[11px] text-gray-400">
          Need {metrics.samplesNeeded} more attempt
          {metrics.samplesNeeded > 1 ? 's' : ''} to build a stable baseline.
        </p>
      )}
      {stability.helper && metrics.stability !== 'collecting' && (
        <p className="mt-2 text-[11px] text-gray-400">{stability.helper}</p>
      )}
    </section>
  );
};

export default Progress;
