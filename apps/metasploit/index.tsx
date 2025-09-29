'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import modulesData from '../../components/apps/metasploit/modules.json';
import MetasploitApp from '../../components/apps/metasploit';
import Toast from '../../components/ui/Toast';
import type { Module } from './types';
import { calculateRevision, ensureModuleCache } from './cache';
import { buildSearchIndex, computeFacets, filterModules } from './search';

interface TreeNode {
  [key: string]: TreeNode | Module[] | undefined;
  __modules?: Module[];
}

const seedModules = modulesData as Module[];
const cacheRevision = calculateRevision(seedModules);

const typeColors: Record<string, string> = {
  auxiliary: 'bg-blue-500',
  exploit: 'bg-red-500',
  post: 'bg-green-600',
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
  const [typeFilter, setTypeFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [modules, setModules] = useState<Module[]>(seedModules);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await ensureModuleCache(seedModules, cacheRevision);
      if (!cancelled) {
        setModules(result.modules);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const facets = useMemo(() => computeFacets(modules), [modules]);

  useEffect(() => {
    if (tag && !facets.tags.includes(tag)) {
      setTag('');
    }
  }, [tag, facets.tags]);

  useEffect(() => {
    if (typeFilter && !facets.types.includes(typeFilter)) {
      setTypeFilter('');
    }
  }, [typeFilter, facets.types]);

  useEffect(() => {
    if (platformFilter && !facets.platforms.includes(platformFilter)) {
      setPlatformFilter('');
    }
  }, [platformFilter, facets.platforms]);

  const searchIndex = useMemo(() => buildSearchIndex(modules), [modules]);

  const filteredModules = useMemo(
    () =>
      filterModules(searchIndex, {
        query,
        tag,
        type: typeFilter,
        platform: platformFilter,
      }),
    [searchIndex, query, tag, typeFilter, platformFilter],
  );

  const tree = useMemo(() => buildTree(filteredModules), [filteredModules]);

  useEffect(() => {
    setSelected(null);
  }, [query, tag, typeFilter, platformFilter]);

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
    <ul className="ml-2">
      {Object.entries(node)
        .filter(([k]) => k !== '__modules')
        .map(([key, child]) => (
          <li key={key}>
            <details>
              <summary className="cursor-pointer">{key}</summary>
              {renderTree(child as TreeNode)}
            </details>
          </li>
        ))}
      {(node.__modules || []).map((mod) => (
        <li key={mod.name}>
          <button
            onClick={() => setSelected(mod)}
            className="flex justify-between w-full text-left px-1 py-0.5 hover:bg-gray-100"
          >
            <span>{mod.name.split('/').pop()}</span>
            <span
              className={`ml-2 text-xs text-white px-1 rounded ${typeColors[mod.type] || 'bg-gray-500'}`}
            >
              {mod.type}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r overflow-auto p-2">
        <div className="mb-2">
          <input
            id="metasploit-search-input"
            type="text"
            placeholder="Search modules"
            aria-label="Search modules"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-1 border rounded"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 mb-2 text-sm">
          <label className="flex flex-col gap-1" htmlFor="metasploit-type-filter">
            Type
            <select
              id="metasploit-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full p-1 border rounded"
            >
              <option value="">All types</option>
              {facets.types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1" htmlFor="metasploit-platform-filter">
            Platform
            <select
              id="metasploit-platform-filter"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full p-1 border rounded"
            >
              <option value="">All platforms</option>
              {facets.platforms.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          <button
            onClick={() => setTag('')}
            className={`px-2 py-0.5 text-xs rounded ${
              tag === '' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            All
          </button>
          {facets.tags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`px-2 py-0.5 text-xs rounded ${
                tag === t ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {filteredModules.length === 0 ? (
          <p className="text-sm text-gray-500">No modules match your filters.</p>
        ) : (
          renderTree(tree)
        )}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-4">
          {selected ? (
            <div>
              <h2 className="font-bold mb-2 flex items-center">
                {selected.name}
                <span
                  className={`ml-2 text-xs text-white px-2 py-0.5 rounded ${typeColors[selected.type] || 'bg-gray-500'}`}
                >
                  {selected.type}
                </span>
              </h2>
              <p className="whitespace-pre-wrap">{selected.description}</p>
            </div>
          ) : (
            <p>Select a module to view details</p>
          )}
        </div>
        <div ref={splitRef} className="h-96 border-t flex flex-col">
          <div style={{ height: `calc(${split}% - 2px)` }} className="overflow-auto">
            <MetasploitApp />
          </div>
          <div
            className="h-1 bg-gray-400 cursor-row-resize"
            onMouseDown={() => (dragging.current = true)}
          />
          <div
            style={{ height: `calc(${100 - split}% - 2px)` }}
            className="overflow-auto p-2 space-y-2"
          >
            <h3 className="font-semibold">Generate Payload</h3>
            <input
              id="metasploit-payload-options"
              type="text"
              placeholder="Payload options..."
              aria-label="Payload options"
              className="border p-1 w-full"
            />
            <button
              onClick={handleGenerate}
              className="px-2 py-1 bg-blue-500 text-white rounded"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default MetasploitPage;

