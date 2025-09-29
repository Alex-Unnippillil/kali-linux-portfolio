'use client';

import React, { useCallback, useMemo } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';
import { DEFAULT_SAMPLES, SampleFilter } from '../constants';
import { useEttercapFilterState } from './FilterStateProvider';

const lineHeight = '1.5rem';

const buildLineWarnings = (messages: { line: number; message: string }[]) => {
  const map = new Map<number, string[]>();
  messages.forEach((message) => {
    const lineMessages = map.get(message.line) ?? [];
    lineMessages.push(message.message);
    map.set(message.line, lineMessages);
  });
  return map;
};

export default function FilterEditor() {
  const { filterText, setFilterText, lintMessages, isLinting } =
    useEttercapFilterState();
  const [samples, setSamples] = usePersistentState<SampleFilter[]>(
    'ettercap-samples',
    DEFAULT_SAMPLES,
  );

  const lineWarnings = useMemo(
    () => buildLineWarnings(lintMessages),
    [lintMessages],
  );

  const loadSample = useCallback(
    (idx: number) => {
      const selected = samples[idx];
      if (!selected) return;
      setFilterText(selected.code);
    },
    [samples, setFilterText],
  );

  const saveSample = () => {
    const name = window.prompt('Sample name');
    if (!name) return;
    setSamples((s) => [...s, { name, code: filterText }]);
  };

  const lines = useMemo(() => filterText.split('\n'), [filterText]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor="sampleSelect">Samples:</label>
        <select
          id="sampleSelect"
          className="border p-1"
          onChange={(e) => loadSample(Number(e.target.value))}
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

      <div className="flex flex-col gap-2">
        <label htmlFor="filterTextarea" className="font-semibold">
          Filter script
        </label>
        <div className="grid grid-cols-[3rem_1fr] overflow-hidden rounded border bg-gray-900 text-gray-200">
          <div className="bg-gray-800 text-right text-xs">
            {lines.map((_, idx) => {
              const lineNumber = idx + 1;
              const hasWarning = lineWarnings.has(lineNumber);
              return (
                <div
                  key={lineNumber}
                  className="flex items-center justify-end gap-1 px-2"
                  style={{ lineHeight }}
                >
                  <span>{lineNumber}</span>
                  {hasWarning && (
                    <span
                      aria-label={`Warning on line ${lineNumber}`}
                      className="text-red-400"
                    >
                      ⚠
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <textarea
            id="filterTextarea"
            className="w-full resize-y bg-gray-950 p-2 font-mono text-sm text-white focus:outline-none"
            style={{ lineHeight }}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            aria-describedby="ettercap-lint-messages"
          />
        </div>
      </div>

      <div
        id="ettercap-lint-messages"
        aria-live="polite"
        className="space-y-1 rounded border border-gray-800 bg-gray-900 p-3 text-sm"
      >
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
          <span>Lint warnings</span>
          {isLinting && <span className="text-blue-300">Analyzing…</span>}
        </div>
        {lintMessages.length === 0 ? (
          <p className="text-green-300">No lint warnings detected.</p>
        ) : (
          <ul className="space-y-1">
            {lintMessages.map((message, idx) => (
              <li key={`${message.line}-${idx}`} className="text-red-300">
                <span className="font-semibold">Line {message.line}:</span> {message.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
