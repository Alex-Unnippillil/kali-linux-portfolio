'use client';

import React from 'react';
import { Severity, severities } from '../types';

const colors: Record<Severity, { bg: string; text: string; accent: string }> = {
  Critical: {
    bg: 'bg-gradient-to-br from-red-600/80 via-red-700/60 to-red-900/80',
    text: 'text-red-100',
    accent: 'border-red-400/60',
  },
  High: {
    bg: 'bg-gradient-to-br from-orange-500/80 via-orange-600/60 to-amber-700/80',
    text: 'text-orange-50',
    accent: 'border-orange-300/60',
  },
  Medium: {
    bg: 'bg-gradient-to-br from-amber-400/80 via-amber-500/60 to-yellow-600/80',
    text: 'text-amber-50',
    accent: 'border-amber-200/60',
  },
  Low: {
    bg: 'bg-gradient-to-br from-emerald-400/80 via-emerald-500/60 to-emerald-700/80',
    text: 'text-emerald-50',
    accent: 'border-emerald-200/60',
  },
  Info: {
    bg: 'bg-gradient-to-br from-slate-500/80 via-slate-600/60 to-slate-700/80',
    text: 'text-slate-100',
    accent: 'border-slate-300/50',
  },
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
            className={`flex flex-col rounded-xl border ${colors[sev].accent} ${colors[sev].bg} p-4 shadow-lg shadow-black/20`}
          >
            <span className={`text-xs font-semibold uppercase tracking-wide opacity-80 ${colors[sev].text}`}>
              {sev}
            </span>
            <span className={`mt-2 text-3xl font-bold leading-none ${colors[sev].text}`}>
              {summary[sev]}
            </span>
            <span className={`mt-3 text-[11px] font-medium uppercase tracking-wider ${colors[sev].text}`}>
              {summary[sev] === 1 ? 'Issue' : 'Issues'}
            </span>
          </article>
        ))}
      </div>
      {trend.length > 0 && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
            <span>Finding Volume Trend</span>
            <span>{trend[trend.length - 1]} findings</span>
          </div>
          <svg width={width} height={height} className="w-full rounded-lg bg-slate-950/60">
            <defs>
              <linearGradient id="nessus-summary-line" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
              </linearGradient>
            </defs>
            <path d={d} fill="none" stroke="url(#nessus-summary-line)" strokeWidth={2.5} />
          </svg>
        </div>
      )}
    </section>
  );
}
