import React from 'react';
import type { RumMetricName, RumSample } from '../../../src/rum';

type MetricCardProps = {
  summary: {
    name: RumMetricName;
    label: string;
    target: number;
    p75: number | null;
    samples: number;
    rating: 'good' | 'needs-improvement' | 'poor' | 'no-data';
    latest?: RumSample;
  };
  rollingWindow: number;
};

const ratingClasses: Record<MetricCardProps['summary']['rating'], string> = {
  good: 'text-green-400',
  'needs-improvement': 'text-yellow-300',
  poor: 'text-red-400',
  'no-data': 'text-gray-400',
};

function formatMs(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Math.round(value)} ms`;
}

export default function MetricCard({ summary, rollingWindow }: MetricCardProps) {
  const { label, target, p75, samples, rating, latest } = summary;
  const statusLabel =
    rating === 'no-data'
      ? 'Awaiting samples'
      : rating === 'good'
      ? 'On target'
      : rating === 'needs-improvement'
      ? 'Needs improvement'
      : 'Off target';

  return (
    <article className="rounded border border-gray-700 bg-[var(--kali-panel)] p-3 shadow-lg">
      <header className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
          {label}
        </h2>
        <span className={`text-xs font-medium ${ratingClasses[rating]}`}>{statusLabel}</span>
      </header>
      <dl className="space-y-1 text-xs text-gray-300">
        <div className="flex items-center">
          <dt className="w-24 text-gray-400">Rolling p75</dt>
          <dd className={`font-semibold ${ratingClasses[rating]}`}>{formatMs(p75)}</dd>
        </div>
        <div className="flex items-center">
          <dt className="w-24 text-gray-400">Target ≤</dt>
          <dd className="font-semibold text-green-300">{formatMs(target)}</dd>
        </div>
        <div className="flex items-center">
          <dt className="w-24 text-gray-400">Samples</dt>
          <dd>{samples}</dd>
        </div>
        <div className="flex items-center">
          <dt className="w-24 text-gray-400">Window</dt>
          <dd>Last {rollingWindow} interactions</dd>
        </div>
      </dl>
      <footer className="mt-3 rounded border border-gray-700 bg-black/30 p-2 text-[11px] leading-relaxed text-gray-300">
        {latest ? (
          <>
            <div>
              Latest sample:{' '}
              <span className="font-semibold text-white">{formatMs(latest.value)}</span>
              {latest.attribution?.eventType && (
                <span className="text-gray-400"> · {latest.attribution.eventType}</span>
              )}
            </div>
            {latest.attribution?.target && (
              <div className="truncate text-gray-400">Target: {latest.attribution.target}</div>
            )}
          </>
        ) : (
          <div>Interact with the desktop to gather data.</div>
        )}
      </footer>
    </article>
  );
}
