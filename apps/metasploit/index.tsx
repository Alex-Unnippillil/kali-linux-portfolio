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

const typeStyles: Record<string, string> = {
  auxiliary:
    'border border-[color:color-mix(in_srgb,var(--color-info)_48%,transparent_52%)] bg-[color:color-mix(in_srgb,var(--color-info)_18%,transparent_82%)] text-[color:var(--color-info)]',
  exploit:
    'border border-[color:color-mix(in_srgb,var(--color-severity-high)_52%,transparent_48%)] bg-[color:color-mix(in_srgb,var(--color-severity-high)_20%,transparent_80%)] text-[color:var(--color-severity-high)]',
  post:
    'border border-[color:color-mix(in_srgb,var(--color-severity-low)_50%,transparent_50%)] bg-[color:color-mix(in_srgb,var(--color-severity-low)_18%,transparent_82%)] text-[color:var(--color-severity-low)]',
};

const severityTokens: Record<string, string> = {
  critical: 'bg-kali-severity-critical text-[color:var(--kali-terminal-text)]',
  high: 'bg-kali-severity-high text-[color:var(--kali-terminal-text)]',
  medium: 'bg-kali-severity-medium text-[color:var(--color-dark)]',
  low: 'bg-kali-severity-low text-[color:var(--color-dark)]',
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
    <ul className="ml-2 space-y-1 border-l border-[color:color-mix(in_srgb,var(--kali-border)_70%,transparent_30%)] pl-2">
      {Object.entries(node)
        .filter(([k]) => k !== '__modules')
        .map(([key, child]) => (
          <li key={key}>
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-[color:color-mix(in_srgb,var(--kali-terminal-text)_78%,transparent_22%)] transition-colors hover:text-[color:var(--kali-terminal-text)]">
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
              className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[color:var(--color-control-accent)] ${
                isActive
                  ? 'bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent_8%)] text-[color:var(--kali-terminal-text)] shadow-inner'
                  : 'text-[color:color-mix(in_srgb,var(--kali-terminal-text)_72%,transparent_28%)] hover:bg-[color:var(--kali-panel-highlight)] hover:text-[color:var(--kali-terminal-text)]'
              }`}
            >
              <span className="truncate pr-2" title={mod.name}>
                {mod.name.split('/').pop()}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                  typeStyles[mod.type] ||
                  'border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent_8%)] text-[color:var(--kali-terminal-text)]'
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
    <div className="flex h-full bg-[color:color-mix(in_srgb,var(--kali-panel)_85%,transparent_15%)]">
      <div className="w-1/3 border-r border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_96%,transparent_4%)] p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-terminal-text)_85%,transparent_15%)]">
            Module Library
          </h2>
          {selected ? (
            <span className="rounded-full border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-2 py-0.5 text-xs text-[color:color-mix(in_srgb,var(--kali-terminal-text)_80%,transparent_20%)]">
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
            className="mb-3 w-full rounded border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_86%,transparent_14%)] p-2 text-sm text-[color:color-mix(in_srgb,var(--kali-terminal-text)_92%,transparent_8%)] placeholder:text-[color:color-mix(in_srgb,var(--kali-terminal-text)_55%,transparent_45%)] focus:border-[color:var(--color-control-accent)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-control-accent)_45%,transparent_55%)]"
            aria-labelledby="metasploit-search-label"
          />
        <div className="mb-3 flex flex-wrap gap-1">
          <button
            onClick={() => setTag('')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              tag === ''
                ? 'border border-[color:color-mix(in_srgb,var(--color-control-accent)_55%,transparent_45%)] bg-[color:var(--color-control-accent)] text-[color:var(--kali-terminal-text)] shadow-[0_0_12px_color-mix(in_srgb,var(--color-control-accent)_35%,transparent_65%)]'
                : 'border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent_10%)] text-[color:color-mix(in_srgb,var(--kali-terminal-text)_75%,transparent_25%)] hover:bg-[color:var(--kali-panel-highlight)] hover:text-[color:var(--kali-terminal-text)]'
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
                  ? 'border border-[color:color-mix(in_srgb,var(--color-control-accent)_55%,transparent_45%)] bg-[color:var(--color-control-accent)] text-[color:var(--kali-terminal-text)] shadow-[0_0_12px_color-mix(in_srgb,var(--color-control-accent)_35%,transparent_65%)]'
                  : 'border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent_10%)] text-[color:color-mix(in_srgb,var(--kali-terminal-text)_75%,transparent_25%)] hover:bg-[color:var(--kali-panel-highlight)] hover:text-[color:var(--kali-terminal-text)]'
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
            <div className="space-y-4 rounded-xl border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent_8%)] p-5 shadow-lg shadow-black/30">
              <div>
                <h2 className="flex flex-wrap items-center gap-3 text-lg font-semibold text-[color:var(--kali-terminal-text)]">
                  <span className="truncate" title={selected.name}>
                    {selected.name}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                      typeStyles[selected.type] ||
                      'border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent_8%)] text-[color:var(--kali-terminal-text)]'
                    }`}
                  >
                    {selected.type}
                  </span>
                  {selected.severity ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        severityTokens[selectedSeverity] ||
                        'border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] text-[color:var(--kali-terminal-text)]'
                      }`}
                    >
                      {selected.severity}
                    </span>
                  ) : null}
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-[color:color-mix(in_srgb,var(--kali-terminal-text)_90%,transparent_10%)]">
                  {selected.description}
                </p>
              </div>
              <dl className="grid gap-3 text-xs text-[color:color-mix(in_srgb,var(--kali-terminal-text)_78%,transparent_22%)] sm:grid-cols-2">
                <div className="rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_95%,transparent_5%)] p-3">
                  <dt className="text-[0.7rem] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-terminal-text)_65%,transparent_35%)]">
                    Module Path
                  </dt>
                  <dd className="mt-1 font-mono text-[color:var(--kali-terminal-text)]">{selected.name}</dd>
                </div>
                {selectedTags.length ? (
                  <div className="rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_95%,transparent_5%)] p-3">
                    <dt className="text-[0.7rem] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-terminal-text)_65%,transparent_35%)]">
                      Tags
                    </dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {selectedTags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-2 py-0.5 text-[0.7rem] font-medium text-[color:color-mix(in_srgb,var(--kali-terminal-text)_85%,transparent_15%)]"
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
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[color:color-mix(in_srgb,var(--kali-border)_70%,transparent_30%)] bg-[color:color-mix(in_srgb,var(--kali-panel)_80%,transparent_20%)] p-6 text-sm text-[color:color-mix(in_srgb,var(--kali-terminal-text)_65%,transparent_35%)]">
              Select a module from the library to review its transcript and run
              the demo session.
            </div>
          )}
        </div>
        <div ref={splitRef} className="flex h-96 flex-col border-t border-[color:var(--kali-border)]">
          <div
            style={{ height: `calc(${split}% - 2px)` }}
            className="overflow-hidden rounded-t-xl border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_96%,transparent_4%)] shadow-inner"
          >
            <div className="flex items-center justify-between border-b border-[color:color-mix(in_srgb,var(--kali-border)_80%,transparent_20%)] px-4 py-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-terminal-text)_82%,transparent_18%)]">
                Session Console
              </h3>
              {selected ? (
                <span className="text-xs text-[color:color-mix(in_srgb,var(--kali-terminal-text)_68%,transparent_32%)]">
                  Using {selected.name}
                </span>
              ) : (
                <span className="text-xs text-[color:color-mix(in_srgb,var(--kali-terminal-text)_55%,transparent_45%)]">
                  No module loaded
                </span>
              )}
            </div>
            <div
              className="h-full overflow-auto p-2"
              style={{
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--kali-panel) 96%, transparent) 0%, color-mix(in srgb, var(--kali-panel) 88%, transparent) 50%, color-mix(in srgb, var(--kali-panel) 96%, transparent) 100%)',
              }}
            >
              <div className="h-full overflow-auto rounded-lg border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,#000000_82%,var(--kali-panel))] p-2 text-[color:var(--kali-terminal,var(--color-terminal))]">
                <MetasploitApp />
              </div>
            </div>
          </div>
          <div
            className="h-1 cursor-row-resize bg-[color:color-mix(in_srgb,var(--kali-border)_80%,transparent_20%)]"
            onMouseDown={() => (dragging.current = true)}
          />
          <div
            style={{ height: `calc(${100 - split}% - 2px)` }}
            className="overflow-auto rounded-b-xl border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent_8%)] p-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-terminal-text)_82%,transparent_18%)]">
                  Session Summary
                </h3>
                {selected ? (
                  <span className="text-xs text-[color:color-mix(in_srgb,var(--kali-terminal-text)_68%,transparent_32%)]">
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
                className="w-full rounded border border-[color:var(--kali-border)] bg-[color:color-mix(in_srgb,var(--kali-panel)_86%,transparent_14%)] p-2 text-sm text-[color:color-mix(in_srgb,var(--kali-terminal-text)_92%,transparent_8%)] placeholder:text-[color:color-mix(in_srgb,var(--kali-terminal-text)_55%,transparent_45%)] focus:border-[color:var(--color-control-accent)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_srgb,var(--color-control-accent)_45%,transparent_55%)]"
                aria-labelledby="metasploit-payload-options-label"
              />
              <button
                onClick={handleGenerate}
                className="inline-flex items-center justify-center rounded border border-[color:color-mix(in_srgb,var(--color-control-accent)_55%,transparent_45%)] bg-[color:var(--color-control-accent)] px-4 py-2 text-sm font-semibold text-[color:var(--kali-terminal-text)] shadow transition-colors hover:bg-[color:color-mix(in_srgb,var(--color-control-accent)_85%,transparent_15%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-control-accent)]"
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

