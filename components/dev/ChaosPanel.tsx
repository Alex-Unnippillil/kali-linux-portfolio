"use client";

import { useMemo, useState } from 'react';
import useChaos from '../../hooks/useChaos';
import chaosState, { type ChaosFault } from '../../lib/dev/chaosState';

type Target = {
  id: string;
  label: string;
  description: string;
};

const TARGETS: Target[] = [
  {
    id: 'terminal',
    label: 'Terminal worker',
    description: 'Simulate command execution stalls and malformed chunks from the terminal worker.',
  },
  {
    id: 'nessus',
    label: 'Nessus parser',
    description: 'Stress the Nessus report parser by withholding, truncating, or corrupting findings.',
  },
  {
    id: 'scheduler',
    label: 'Scan scheduler',
    description: 'Exercise stored scan schedules with skipped intervals or suppressed callbacks.',
  },
];

const FAULT_COPY: Record<ChaosFault, { title: string; helper: string }> = {
  timeout: {
    title: 'Worker timeouts',
    helper: 'Drop worker replies or skip scheduler ticks until cleared.',
  },
  partialData: {
    title: 'Partial data',
    helper: 'Only deliver a portion of the payload to surface fallback UI.',
  },
  corruptChunk: {
    title: 'Corrupted chunks',
    helper: 'Simulate malformed data frames so error recovery paths execute.',
  },
};

const ChaosPanel = () => {
  const [target, setTarget] = useState<string>(TARGETS[0]?.id ?? 'terminal');
  const { faults, toggleFault, reset, isDev } = useChaos(target);

  const copy = useMemo(() => TARGETS.find((t) => t.id === target) ?? TARGETS[0], [target]);

  if (!isDev || !copy) {
    return null;
  }

  return (
    <aside
      className="pointer-events-auto fixed bottom-4 right-4 z-[1500] w-80 max-w-full rounded-lg border border-ub-orange/60 bg-black/90 p-4 text-xs text-white shadow-xl"
      aria-label="Chaos engineering controls"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ub-orange">Dev chaos panel</h2>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded border border-white/20 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-white/10"
        >
          Clear flags
        </button>
      </div>
      <label className="mb-2 block text-[11px] uppercase tracking-wide text-ub-gray">
        Target app
        <select
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          className="mt-1 w-full rounded border border-white/20 bg-black/60 px-2 py-1 text-xs text-white focus:border-ub-orange focus:outline-none"
        >
          {TARGETS.map((t) => (
            <option value={t.id} key={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <p className="mb-3 text-[11px] text-white/70">{copy.description}</p>
      <ul className="space-y-2">
        {(chaosState.faults as ChaosFault[]).map((fault) => (
          <li key={fault} className="rounded border border-white/10 bg-white/5 p-2">
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={faults[fault] ?? false}
                onChange={() => toggleFault(fault)}
                aria-label={FAULT_COPY[fault].title}
              />
              <span>
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-white">
                  {FAULT_COPY[fault].title}
                </span>
                <span className="block text-[11px] text-white/70">{FAULT_COPY[fault].helper}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[10px] text-ub-orange/70">
        Dev-mode only. Flags are ignored in production builds and reset on refresh.
      </p>
    </aside>
  );
};

export default ChaosPanel;
