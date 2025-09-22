'use client';

import React, { useCallback } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

interface SampleFilter {
  name: string;
  code: string;
}

const DEFAULT_SAMPLES: SampleFilter[] = [
  { name: 'Drop DNS', code: 'drop DNS' },
  { name: 'Replace example.com', code: 'replace example.com test.com' },
];

const EXAMPLE_PACKETS = [
  'DNS query example.com',
  'HTTP GET /index.html',
  'SSH handshake from 10.0.0.1',
];

const applyFilters = (text: string, packets: string[]) => {
  let result = packets;
  text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [cmd, ...rest] = line.split(/\s+/);
      if (cmd === 'drop') {
        const pattern = rest.join(' ');
        result = result.filter((p) => !p.includes(pattern));
      } else if (cmd === 'replace') {
        const [pattern, replacement] = rest;
        if (pattern && replacement !== undefined) {
          result = result.map((p) => p.split(pattern).join(replacement));
        }
      }
    });
  return result;
};

export default function FilterEditor() {
  const [samples, setSamples] = usePersistentState<SampleFilter[]>(
    'ettercap-samples',
    DEFAULT_SAMPLES,
  );
  const [filterText, setFilterText] = usePersistentState(
    'ettercap-filter-text',
    DEFAULT_SAMPLES[0].code,
  );
  const output = applyFilters(filterText, EXAMPLE_PACKETS);

  const loadSample = useCallback(
    (idx: number) => setFilterText(samples[idx]?.code || ''),
    [samples, setFilterText],
  );

  const saveSample = () => {
    const name = window.prompt('Sample name');
    if (!name) return;
    setSamples((s) => [...s, { name, code: filterText }]);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="sampleSelect">Samples:</label>
        <select
          id="sampleSelect"
          className="border p-1"
          onChange={(e) => loadSample(Number(e.target.value))}
          aria-label="Load sample filter"
        >
          {samples.map((s, i) => (
            <option key={s.name} value={i}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="border px-2 py-1"
          onClick={saveSample}
        >
          Save
        </button>
      </div>
        <textarea
          className="w-full h-32 border p-2 font-mono"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          aria-label="Filter definition"
        />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-bold mb-2">Before</h3>
          <ul className="bg-gray-100 p-2 font-mono text-sm space-y-1">
            {EXAMPLE_PACKETS.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-2">After</h3>
          <ul className="bg-gray-100 p-2 font-mono text-sm space-y-1">
            {output.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

