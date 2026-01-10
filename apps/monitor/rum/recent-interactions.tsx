import React from 'react';
import type { RumSample } from '../../../src/rum';
import { METRIC_LABELS } from '../../../src/rum';

function formatMs(value: number): string {
  return `${Math.round(value)} ms`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

type RecentInteractionsProps = {
  interactions: RumSample[];
};

export default function RecentInteractions({ interactions }: RecentInteractionsProps) {
  return (
    <section className="rounded border border-gray-700 bg-[var(--kali-panel)] p-3">
      <header className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
          Recent Interactions
        </h2>
        <span className="text-[11px] text-gray-400">
          Showing last {interactions.length} samples
        </span>
      </header>
      {interactions.length === 0 ? (
        <p className="text-xs text-gray-400">
          No metrics captured yet. Click, tap, or type within the desktop to record measurements.
        </p>
      ) : (
        <ul className="divide-y divide-gray-800 text-xs">
          {interactions.map((sample) => (
            <li key={`${sample.name}-${sample.id}`} className="py-2">
              <div className="flex items-center gap-2">
                <span className="rounded bg-black/30 px-2 py-0.5 text-[11px] font-semibold text-gray-200">
                  {sample.name}
                </span>
                <span className="font-medium text-white">{formatMs(sample.value)}</span>
                <span className="text-[11px] text-gray-400">
                  {METRIC_LABELS[sample.name]} · {formatTime(sample.timestamp)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-gray-400">
                {sample.attribution?.eventType && <span>Event: {sample.attribution.eventType}</span>}
                {sample.attribution?.target && <span>Target: {sample.attribution.target}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
