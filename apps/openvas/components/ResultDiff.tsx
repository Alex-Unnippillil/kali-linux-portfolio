'use client';

import React, { useState, useMemo } from 'react';

interface Finding {
  id: string;
  name: string;
  description?: string;
  [key: string]: any;
}

export default function ResultDiff() {
  const [left, setLeft] = useState<Finding[]>([]);
  const [right, setRight] = useState<Finding[]>([]);
  const [filter, setFilter] = useState('');

  const loadFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (data: Finding[]) => void
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

  const diff = useMemo(() => {
    const leftIds = new Set(left.map((f) => f.id));
    const rightIds = new Set(right.map((f) => f.id));
    return {
      added: right.filter((f) => !leftIds.has(f.id)).map((f) => f.id),
      removed: left.filter((f) => !rightIds.has(f.id)).map((f) => f.id),
    };
  }, [left, right]);

  const filterFn = (f: Finding) => {
    const term = filter.toLowerCase();
    return (
      !term ||
      f.name.toLowerCase().includes(term) ||
      f.description?.toLowerCase().includes(term)
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="flex-1 text-sm">
          <span className="block mb-1">Report A</span>
          <input
            type="file"
            accept="application/json"
            onChange={(e) => loadFile(e, setLeft)}
            className="block w-full text-black"
            aria-label="Import report A"
          />
        </label>
        <label className="flex-1 text-sm">
          <span className="block mb-1">Report B</span>
          <input
            type="file"
            accept="application/json"
            onChange={(e) => loadFile(e, setRight)}
            className="block w-full text-black"
            aria-label="Import report B"
          />
        </label>
      </div>
      <div className="text-sm">
        <label>
          Filter:
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="ml-2 p-1 rounded text-black"
            aria-label="Filter results"
          />
        </label>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h3 className="font-bold mb-2">Report A</h3>
          <ul className="space-y-1">
            {left.filter(filterFn).map((f) => (
              <li
                key={f.id}
                className={`p-2 rounded ${
                  diff.removed.includes(f.id) ? 'bg-red-800' : 'bg-gray-800'
                }`}
              >
                {f.name}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-2">Report B</h3>
          <ul className="space-y-1">
            {right.filter(filterFn).map((f) => (
              <li
                key={f.id}
                className={`p-2 rounded ${
                  diff.added.includes(f.id) ? 'bg-green-800' : 'bg-gray-800'
                }`}
              >
                {f.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

