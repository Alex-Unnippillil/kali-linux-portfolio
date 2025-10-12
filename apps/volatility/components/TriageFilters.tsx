'use client';

import React from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

// Static dataset illustrating possible suspicious markers
const markers = [
  { id: 1, description: 'Unsigned DLL loaded in system process', severity: 'suspicious' },
  { id: 2, description: 'Process hollowing detected', severity: 'malicious' },
  { id: 3, description: 'Hidden network listener', severity: 'suspicious' },
  { id: 4, description: 'Execution from writable memory region', severity: 'malicious' },
  { id: 5, description: 'Unusual parent-child process relationship', severity: 'informational' },
];

const severities = ['informational', 'suspicious', 'malicious'] as const;

const severityStyles: Record<Severity, string> = {
  informational: 'border-sky-500/50 bg-sky-950/40 text-sky-100',
  suspicious: 'border-amber-500/70 bg-amber-950/40 text-amber-100 shadow-md shadow-amber-900/30',
  malicious: 'border-rose-500/80 bg-rose-950/50 text-rose-100 shadow-lg shadow-rose-900/30',
};

type Severity = typeof severities[number];

type Marker = {
  id: number;
  description: string;
  severity: Severity;
};

const TriageFilters: React.FC = () => {
  const [activeFilters, setActiveFilters] = usePersistentState<Severity[]>(
    'volatility-triage-filters',
    [...severities]
  );

  const toggleFilter = (sev: Severity) => {
    setActiveFilters((prev: Severity[]) =>
      prev.includes(sev)
        ? prev.filter((s) => s !== sev)
        : [...prev, sev]
    );
  };

  const filteredMarkers = (markers as Marker[]).filter((m) =>
    activeFilters.includes(m.severity)
  );

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-950/80 p-4 text-white shadow-inner space-y-4">
      <header className="space-y-1">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-gray-200">
          Suspicious markers
        </h2>
        <p className="text-[11px] text-gray-400">
          Toggle severity bands to focus on the riskiest memory artifacts flagged during the demo run.
        </p>
      </header>
      <div className="flex flex-wrap gap-3 text-[11px]">
        {severities.map((sev) => (
          <label
            key={sev}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 capitalize transition focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-amber-500 focus-within:ring-offset-gray-950 ${
              activeFilters.includes(sev)
                ? severityStyles[sev]
                : 'border-gray-700 bg-gray-900 text-gray-300'
            }`}
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-amber-400"
              checked={activeFilters.includes(sev)}
              aria-label={`Toggle ${sev} severity`}
              onChange={() => toggleFilter(sev)}
            />
            {sev}
          </label>
        ))}
      </div>
      <ul className="space-y-3 text-[11px]">
        {filteredMarkers.map((marker) => (
          <li
            key={marker.id}
            className={`rounded-lg border-l-4 px-3 py-2 transition ${severityStyles[marker.severity]}`}
          >
            <p className="text-xs font-semibold">{marker.description}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-300">
              {marker.severity}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default TriageFilters;

