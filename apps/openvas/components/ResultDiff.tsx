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

  const removedStyle: React.CSSProperties = {
    background: 'color-mix(in srgb, var(--color-severity-high) 35%, var(--kali-panel))',
    border: '1px solid color-mix(in srgb, var(--color-severity-high) 55%, transparent)',
  };
  const addedStyle: React.CSSProperties = {
    background: 'color-mix(in srgb, var(--kali-terminal-green) 30%, var(--kali-panel))',
    border: '1px solid color-mix(in srgb, var(--kali-terminal-green) 55%, transparent)',
  };
  const neutralStyle: React.CSSProperties = {
    background: 'color-mix(in srgb, var(--kali-panel-highlight) 45%, transparent)',
    border: '1px solid color-mix(in srgb, var(--kali-panel-border) 80%, transparent)',
  };

  return (
    <div className="space-y-4 text-slate-200">
      <div className="flex flex-col gap-3 text-sm sm:flex-row">
        <div className="flex-1">
          <label className="mb-1 block" htmlFor="openvas-report-a">
            Report A
          </label>
          <input
            id="openvas-report-a"
            type="file"
            accept="application/json"
            onChange={(e) => loadFile(e, setLeft)}
            className="block w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] px-3 py-2 text-[color:var(--kali-terminal-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-blue)]"
            aria-label="Upload report A"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block" htmlFor="openvas-report-b">
            Report B
          </label>
          <input
            id="openvas-report-b"
            type="file"
            accept="application/json"
            onChange={(e) => loadFile(e, setRight)}
            className="block w-full rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)] px-3 py-2 text-[color:var(--kali-terminal-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-blue)]"
            aria-label="Upload report B"
          />
        </div>
      </div>
      <div className="text-sm">
        <label htmlFor="openvas-diff-filter" className="mr-2">
          Filter:
        </label>
        <input
          id="openvas-diff-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)]/40 px-2 py-1 text-[color:var(--kali-terminal-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-blue)]"
          aria-label="Filter findings"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
        <div className="rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)]/80 p-4 shadow">
          <h3 className="mb-2 font-bold text-slate-100">Report A</h3>
          <ul className="space-y-2">
            {left.filter(filterFn).map((f) => {
              const style = diff.removed.includes(f.id) ? removedStyle : neutralStyle;
              return (
                <li key={f.id} className="rounded-lg px-3 py-2" style={style}>
                  {f.name}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)]/80 p-4 shadow">
          <h3 className="mb-2 font-bold text-slate-100">Report B</h3>
          <ul className="space-y-2">
            {right.filter(filterFn).map((f) => {
              const style = diff.added.includes(f.id) ? addedStyle : neutralStyle;
              return (
                <li key={f.id} className="rounded-lg px-3 py-2" style={style}>
                  {f.name}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

