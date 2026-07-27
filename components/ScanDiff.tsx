'use client';

import React, { useState, useMemo } from 'react';
import { diffScans, normalizeServiceName, type PortService } from '../utils/scanDiff';

export default function ScanDiff() {
  const [left, setLeft] = useState<PortService[]>([]);
  const [right, setRight] = useState<PortService[]>([]);
  const [ignoreEphemeral, setIgnoreEphemeral] = useState(true);
  const [normalize, setNormalize] = useState(true);

  const loadFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (data: PortService[]) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const json = JSON.parse(text);
        setter(Array.isArray(json) ? json : []);
      } catch {
        setter([]);
      }
    };
    reader.readAsText(file);
  };

  const diff = useMemo(
    () =>
      diffScans(left, right, {
        ignoreEphemeral,
        normalizeService: normalize ? normalizeServiceName : undefined,
      }),
    [left, right, ignoreEphemeral, normalize],
  );

  const changedPorts = new Set(diff.changed.map((c) => c.port));
  const addedPorts = new Set(diff.added.map((c) => c.port));
  const removedPorts = new Set(diff.removed.map((c) => c.port));

  const format = (p: PortService) => `${p.port}/${p.service}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 text-sm">
          <label htmlFor="scan-a" className="block mb-1">
            Scan A
          </label>
          <input
            id="scan-a"
            type="file"
            aria-label="Scan A file"
            accept="application/json"
            onChange={(e) => loadFile(e, setLeft)}
            className="block w-full text-black"
          />
        </div>
        <div className="flex-1 text-sm">
          <label htmlFor="scan-b" className="block mb-1">
            Scan B
          </label>
          <input
            id="scan-b"
            type="file"
            aria-label="Scan B file"
            accept="application/json"
            onChange={(e) => loadFile(e, setRight)}
            className="block w-full text-black"
          />
        </div>
      </div>
      <fieldset className="text-sm space-y-1">
        <legend className="font-semibold">Options</legend>
        <div>
          <input
            id="opt-ephemeral"
            type="checkbox"
            checked={ignoreEphemeral}
            onChange={(e) => setIgnoreEphemeral(e.target.checked)}
            className="mr-1"
            aria-label="Ignore ephemeral ports"
          />
          <label htmlFor="opt-ephemeral">Ignore ephemeral ports</label>
        </div>
        <div>
          <input
            id="opt-normalize"
            type="checkbox"
            checked={normalize}
            onChange={(e) => setNormalize(e.target.checked)}
            className="mr-1"
            aria-label="Normalize service names"
          />
          <label htmlFor="opt-normalize">Normalize service names</label>
        </div>
      </fieldset>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h3 className="font-bold mb-2">Scan A</h3>
          <ul className="space-y-1">
            {left.map((p) => (
              <li
                key={p.port}
                className={`p-2 rounded ${
                  removedPorts.has(p.port)
                    ? 'bg-red-800'
                    : changedPorts.has(p.port)
                    ? 'bg-yellow-800'
                    : 'bg-gray-800'
                }`}
              >
                {format(p)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-2">Scan B</h3>
          <ul className="space-y-1">
            {right.map((p) => (
              <li
                key={p.port}
                className={`p-2 rounded ${
                  addedPorts.has(p.port)
                    ? 'bg-green-800'
                    : changedPorts.has(p.port)
                    ? 'bg-yellow-800'
                    : 'bg-gray-800'
                }`}
              >
                {format(p)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

