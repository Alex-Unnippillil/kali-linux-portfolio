'use client';

import React from 'react';
import { Severity, severities } from '../types';

const severityStyles: Record<Severity, React.CSSProperties> = {
  Critical: { '--severity-color': 'var(--color-severity-critical)' },
  High: { '--severity-color': 'var(--color-severity-high)' },
  Medium: { '--severity-color': 'var(--color-severity-medium)' },
  Low: { '--severity-color': 'var(--color-severity-low)' },
  Info: { '--severity-color': 'color-mix(in srgb, var(--color-text) 35%, transparent)' },
};

interface Props {
  summary: Record<Severity, number>;
  trend: number[];
}

export default function SummaryDashboard({ summary, trend }: Props) {
  const max = Math.max(1, ...trend);
  const width = 280;
  const height = 48;
  const step = trend.length > 1 ? width / (trend.length - 1) : width;
  const d = trend
    .map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * height;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {severities.map((sev) => (
          <article
            key={sev}
            style={severityStyles[sev]}
            className="flex flex-col rounded-xl border border-[color:color-mix(in_srgb,var(--severity-color)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_82%,var(--severity-color)_18%)] p-4 text-[color:color-mix(in_srgb,var(--color-text)_92%,transparent)] shadow-lg shadow-black/20"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--severity-color)_60%,var(--color-text)_40%)]">
              {sev}
            </span>
            <span className="mt-2 text-3xl font-bold leading-none text-[color:color-mix(in_srgb,var(--severity-color)_55%,var(--color-text)_45%)]">
              {summary[sev]}
            </span>
            <span className="mt-3 text-[11px] font-medium uppercase tracking-wider text-[color:color-mix(in_srgb,var(--severity-color)_45%,var(--color-text)_55%)]">
              {summary[sev] === 1 ? 'Issue' : 'Issues'}
            </span>
          </article>
        ))}
      </div>
      {trend.length > 0 && (
        <div className="rounded-xl border border-[color:var(--kali-panel-border)] bg-[var(--kali-panel)] p-4">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
            <span>Finding Volume Trend</span>
            <span className="text-[color:color-mix(in_srgb,var(--color-text)_90%,transparent)]">{trend[trend.length - 1]} findings</span>
          </div>
          <svg width={width} height={height} className="w-full rounded-lg bg-[color:color-mix(in_srgb,var(--kali-panel)_80%,transparent)]">
            <defs>
              <linearGradient id="nessus-summary-line" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.65" />
                <stop offset="100%" stopColor="color-mix(in srgb, var(--color-accent) 85%, transparent)" stopOpacity="1" />
              </linearGradient>
            </defs>
            <path d={d} fill="none" stroke="url(#nessus-summary-line)" strokeWidth={2.5} />
          </svg>
        </div>
      )}
    </section>
  );
}
