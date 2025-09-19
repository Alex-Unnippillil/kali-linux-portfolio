'use client';

import React, { useMemo } from 'react';
import { HistoryEntry } from './history';
import { computeSloSummaries, formatMetric } from './slo';

interface Props {
  entries: HistoryEntry[];
}

const indicatorColor = (breached: boolean) =>
  breached ? 'text-red-200' : 'text-green-200';

const tileStyles = (breached: boolean) =>
  breached
    ? 'border-red-500 bg-red-950 text-red-100'
    : 'border-gray-700 bg-[var(--kali-panel)] text-white';

const metadataColor = (breached: boolean) => (breached ? 'text-red-200' : 'text-gray-300');

export default function SloDashboard({ entries }: Props) {
  const results = useMemo(() => computeSloSummaries(entries), [entries]);

  if (results.length === 0) {
    return null;
  }

  return (
    <section className="mt-4" aria-label="Service level objectives">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">SLO Dashboard</h2>
      <p className="mt-1 text-xs text-gray-400">
        24-hour rollup from simulated fetch metrics.
      </p>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {results.map((result) => {
          const tileClass = tileStyles(result.breached);
          const accent = indicatorColor(result.breached);
          const meta = metadataColor(result.breached);
          const direction = result.config.direction === 'gte' ? '≥' : '≤';

          return (
            <article
              key={result.config.id}
              data-testid={`slo-tile-${result.config.id}`}
              className={`rounded border p-3 shadow-sm transition-colors ${tileClass}`}
              aria-live="polite"
            >
              <header className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold leading-5">{result.config.title}</h3>
                  <p className={`text-xs leading-4 ${meta}`}>{result.config.description}</p>
                </div>
                <span className={`text-base font-bold ${accent}`}>
                  {formatMetric(result.value, result.config)}
                </span>
              </header>
              <p className={`mt-2 text-xs ${meta}`}>
                Target {direction} {formatMetric(result.config.target, result.config)}
              </p>
              <p className={`mt-1 text-xs ${meta}`}>Sample size {result.sampleSize}</p>
              {result.notes.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs list-disc list-inside">
                  {result.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
              {result.value == null && (
                <p className="mt-2 text-xs italic text-gray-400">
                  No requests recorded in the last 24 hours.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
