'use client';

import React from 'react';
import { type Severity, severities } from '../types';

const colors: Record<Severity, string> = {
  Critical: 'bg-red-700',
  High: 'bg-orange-600',
  Medium: 'bg-yellow-600',
  Low: 'bg-green-600',
  Info: 'bg-gray-600',
};

interface Props {
  summary: Record<Severity, number>;
  trend: number[];
}

export default function SummaryDashboard({ summary, trend }: Props) {
  const max = Math.max(1, ...trend);
  const width = 100;
  const height = 24;
  const step = trend.length > 1 ? width / (trend.length - 1) : width;
  const d = trend
    .map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * height;
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2">
        {severities.map((sev) => (
          <div key={sev} className={`p-2 rounded ${colors[sev]}`}>
            <div className="text-xs">{sev}</div>
            <div className="text-lg font-bold">{summary[sev]}</div>
          </div>
        ))}
      </div>
      {trend.length > 0 && (
        <svg width={width} height={height} className="bg-gray-800 rounded">
          <path d={d} fill="none" stroke="#3b82f6" strokeWidth={2} />
        </svg>
      )}
    </div>
  );
}
