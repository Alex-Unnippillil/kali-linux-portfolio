'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import modulesData from '../../components/apps/metasploit/modules.json';
import MetasploitApp from '../../components/apps/metasploit';
import Toast from '../../components/ui/Toast';

interface Module {
  name: string;
  description: string;
  type: string;
  severity?: string;
  tags?: string[];
  [key: string]: any;
}

interface TreeNode {
  [key: string]: TreeNode | Module[] | undefined;
  __modules?: Module[];
}

const typeColors: Record<string, string> = {
  auxiliary: 'bg-sky-600',
  exploit: 'bg-rose-600',
  post: 'bg-emerald-600',
};

const severityColors: Record<string, string> = {
  critical: 'bg-rose-700 text-white',
  high: 'bg-orange-500 text-black',
  medium: 'bg-amber-300 text-black',
  low: 'bg-emerald-300 text-black',
};

function buildTree(mods: Module[]): TreeNode {
  const root: TreeNode = {};
  mods.forEach((mod) => {
    const parts = mod.name.split('/');
    let node: TreeNode = root;
    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        if (!node.__modules) node.__modules = [];
        node.__modules.push(mod);
      } else {
        node[part] = (node[part] as TreeNode) || {};
        node = node[part] as TreeNode;
      }
    });
  });
  return root;
}

const MetasploitPage: React.FC = () => {
  const [selected, setSelected] = useState<Module | null>(null);
  const [split, setSplit] = useState(60);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');

  const allTags = useMemo(
    () =>
      Array.from(
        new Set((modulesData as Module[]).flatMap((m) => m.tags || [])),
      ).sort(),
    [],
  );

  const filteredModules = useMemo(
    () =>
      (modulesData as Module[]).filter((m) => {
        if (tag && !(m.tags || []).includes(tag)) return false;
        if (query) {
          const q = query.toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [tag, query],
  );

  const tree = useMemo(() => buildTree(filteredModules), [filteredModules]);

  const selectedSeverity = selected?.severity?.toLowerCase() ?? '';
  const selectedTags = selected?.tags ?? [];

  useEffect(() => {
    setSelected(null);
  }, [query, tag]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      setSplit(Math.min(80, Math.max(20, pct)));
    };
    const stop = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stop);
    };
  }, []);

  const handleGenerate = () => setToast('Payload generated');

  const renderTree = (node: TreeNode) => (
    <ul className="ml-2 space-y-1 border-l border-slate-800/40 pl-2">
      {Object.entries(node)
        .filter(([k]) => k !== '__modules')
        .map(([key, child]) => (
          <li key={key}>
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-slate-200 hover:text-white">
                {key}
              </summary>
              {renderTree(child as TreeNode)}
            </details>
          </li>
        ))}
      {(node.__modules || []).map((mod) => {
        const isActive = selected?.name === mod.name;
        return (
          <li key={mod.name}>
            <button
              onClick={() => setSelected(mod)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                isActive
                  ? 'bg-slate-800/80 text-white shadow-inner'
                  : 'hover:bg-slate-800/40 text-slate-200'
              }`}
            >
              <span className="truncate pr-2" title={mod.name}>
                {mod.name.split('/').pop()}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white ${
                  typeColors[mod.type] || 'bg-slate-600'
                }`}
              >
                {mod.type}
              </span>
          </button>
        </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex h-full bg-slate-950/30">
      <div className="w-1/3 border-r border-slate-800/60 bg-slate-950/40 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Module Library
          </h2>
          {selected ? (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
              {selected.type}
            </span>
          ) : null}
        </div>
          <label htmlFor="metasploit-search" className="sr-only" id="metasploit-search-label">
            Search modules
          </label>
          <input
            id="metasploit-search"
            type="text"
            placeholder="Search modules"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-3 w-full rounded border border-slate-700 bg-slate-900/60 p-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            aria-labelledby="metasploit-search-label"
          />
        <div className="mb-3 flex flex-wrap gap-1">
          <button
            onClick={() => setTag('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              tag === ''
                ? 'bg-sky-600 text-white shadow'
                : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tag === t
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {renderTree(tree)}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-4">
          {selected ? (
            <div className="space-y-4 rounded-xl border border-slate-800/70 bg-slate-900/50 p-5 shadow-lg shadow-black/30">
              <div>
                <h2 className="flex flex-wrap items-center gap-3 text-lg font-semibold text-white">
                  <span className="truncate" title={selected.name}>
                    {selected.name}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ${
                      typeColors[selected.type] || 'bg-slate-600'
                    }`}
                  >
                    {selected.type}
                  </span>
                  {selected.severity ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        severityColors[selectedSeverity] ||
                        'bg-slate-200 text-slate-900'
                      }`}
                    >
                      {selected.severity}
                    </span>
                  ) : null}
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">
                  {selected.description}
                </p>
              </div>
              <dl className="grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
                  <dt className="text-[0.7rem] uppercase tracking-wide text-slate-400">
                    Module Path
                  </dt>
                  <dd className="mt-1 font-mono text-slate-100">{selected.name}</dd>
                </div>
                {selectedTags.length ? (
                  <div className="rounded-lg border border-slate-800/60 bg-slate-950/40 p-3">
                    <dt className="text-[0.7rem] uppercase tracking-wide text-slate-400">
                      Tags
                    </dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {selectedTags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-slate-800 px-2 py-0.5 text-[0.7rem] font-medium text-slate-200"
                        >
                          {t}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700/70 bg-slate-900/20 p-6 text-sm text-slate-400">
              Select a module from the library to review its transcript and run
              the demo session.
            </div>
          )}
        </div>
        <div ref={splitRef} className="flex h-96 flex-col border-t border-slate-800/60">
          <div
            style={{ height: `calc(${split}% - 2px)` }}
            className="overflow-hidden rounded-t-xl border border-slate-800/60 bg-slate-950 shadow-inner"
          >
            <div className="flex items-center justify-between border-b border-slate-800/60 px-4 py-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                Session Console
              </h3>
              {selected ? (
                <span className="text-xs text-slate-400">
                  Using {selected.name}
                </span>
              ) : (
                <span className="text-xs text-slate-500">No module loaded</span>
              )}
            </div>
            <div className="h-full overflow-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-2">
              <div className="h-full overflow-auto rounded-lg border border-slate-800/60 bg-black/80 p-2 text-green-300">
                <MetasploitApp />
              </div>
            </div>
          </div>
          <div
            className="h-1 bg-gray-400 cursor-row-resize"
            onMouseDown={() => (dragging.current = true)}
          />
          <div
            style={{ height: `calc(${100 - split}% - 2px)` }}
            className="overflow-auto rounded-b-xl border border-slate-800/60 bg-slate-950/60 p-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                  Session Summary
                </h3>
                {selected ? (
                  <span className="text-xs text-slate-400">
                    Active: {selected.name.split('/').pop()}
                  </span>
                ) : null}
              </div>
              <label
                htmlFor="metasploit-payload-options"
                className="sr-only"
                id="metasploit-payload-options-label"
              >
                Payload options
              </label>
              <input
                id="metasploit-payload-options"
                type="text"
                placeholder="Payload options..."
                className="w-full rounded border border-slate-700 bg-slate-900/60 p-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                aria-labelledby="metasploit-payload-options-label"
              />
              <button
                onClick={handleGenerate}
                className="inline-flex items-center justify-center rounded bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-sky-500"
              >
                Generate Payload
              </button>
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default MetasploitPage;

