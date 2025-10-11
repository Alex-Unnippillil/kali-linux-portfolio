'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export interface SampleFilter {
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

export const applyFilters = (text: string, packets: string[]) => {
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
      } else if (cmd === 'alert') {
        result = result.map((p) =>
          p.includes(rest.join(' ')) ? `${p} [ALERT]` : p,
        );
      }
    });
  return result;
};

interface FilterEditorProps {
  samples?: SampleFilter[];
  packets?: string[];
  disabled?: boolean;
  storageKey?: string;
}

const mergeSamples = (base: SampleFilter[], user: SampleFilter[]) => {
  const map = new Map<string, SampleFilter>();
  base.forEach((s) => map.set(s.name, s));
  user.forEach((s) => map.set(s.name, s));
  return Array.from(map.values());
};

export default function FilterEditor({
  samples = DEFAULT_SAMPLES,
  packets = EXAMPLE_PACKETS,
  disabled = false,
  storageKey = 'ettercap',
}: FilterEditorProps) {
  const sampleKey = useMemo(
    () => samples.map((sample) => sample.name).join('|'),
    [samples],
  );
  const [customSamples, setCustomSamples] = usePersistentState<SampleFilter[]>(
    `${storageKey}-custom-samples`,
    [],
  );
  const mergedSamples = useMemo(
    () => mergeSamples(samples, customSamples),
    [customSamples, samples],
  );
  const [filterSelection, setFilterSelection] = useState(0);
  const [filterText, setFilterText] = usePersistentState(
    `${storageKey}-filter-text`,
    mergedSamples[0]?.code ?? '',
  );
  useEffect(() => {
    setFilterSelection(0);
    setFilterText(samples[0]?.code ?? mergedSamples[0]?.code ?? '');
  }, [sampleKey, samples, mergedSamples, setFilterText]);
  useEffect(() => {
    if (filterSelection >= mergedSamples.length) {
      const nextIndex = mergedSamples.length > 0 ? mergedSamples.length - 1 : 0;
      setFilterSelection(nextIndex);
      setFilterText(mergedSamples[nextIndex]?.code ?? '');
    }
  }, [filterSelection, mergedSamples, setFilterText]);
  const output = useMemo(
    () => applyFilters(filterText, packets),
    [filterText, packets],
  );

  const loadSample = useCallback(
    (idx: number) => {
      setFilterSelection(idx);
      setFilterText(mergedSamples[idx]?.code || '');
    },
    [mergedSamples, setFilterText],
  );

  const saveSample = useCallback(() => {
    if (disabled) return;
    const name = window.prompt('Sample name');
    if (!name) return;
    const entry = { name, code: filterText };
    setCustomSamples((prev) => [...prev, entry]);
    setFilterSelection(mergedSamples.length);
  }, [disabled, filterText, mergedSamples.length, setCustomSamples]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="sampleSelect">Samples:</label>
        <select
          id="sampleSelect"
          className="border p-1"
          onChange={(e) => loadSample(Number(e.target.value))}
          value={filterSelection}
          disabled={disabled || mergedSamples.length === 0}
        >
          {mergedSamples.map((s, i) => (
            <option key={s.name} value={i}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="border px-2 py-1 disabled:opacity-50"
          onClick={saveSample}
          disabled={disabled}
        >
          Save
        </button>
      </div>
      <label
        htmlFor="ettercap-filter-text"
        className="sr-only"
        id="ettercap-filter-text-label"
      >
        Filter source
      </label>
      <textarea
        id="ettercap-filter-text"
        className="w-full h-32 border p-2 font-mono"
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        aria-labelledby="ettercap-filter-text-label"
        disabled={disabled}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-bold mb-2">Before</h3>
          <ul className="bg-gray-100 p-2 font-mono text-sm space-y-1">
            {packets.map((p, i) => (
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

