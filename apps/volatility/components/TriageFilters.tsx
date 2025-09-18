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
    <div className="p-4 bg-gray-900 text-white rounded-md space-y-3">
      <h2 className="text-sm font-semibold">Suspicious Markers</h2>
      <div className="flex space-x-4 text-xs">
        {severities.map((sev) => (
          <label key={sev} className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={activeFilters.includes(sev)}
              onChange={() => toggleFilter(sev)}
              style={{ accentColor: 'var(--color-control-accent)' }}
            />
            <span className="capitalize">{sev}</span>
          </label>
        ))}
      </div>
      <ul className="text-xs list-disc pl-5 space-y-1">
        {filteredMarkers.map((marker) => (
          <li key={marker.id} className="flex items-center justify-between">
            <span>{marker.description}</span>
            <span
              className={
                marker.severity === 'malicious'
                  ? 'text-red-400'
                  : marker.severity === 'suspicious'
                  ? 'text-yellow-400'
                  : 'text-blue-400'
              }
            >
              {marker.severity}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TriageFilters;

