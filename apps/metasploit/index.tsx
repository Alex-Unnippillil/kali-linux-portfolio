'use client';

import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import MetasploitApp from '../../components/apps/metasploit';
import Toast from '../../components/ui/Toast';
import modules from './moduleData';
import type { NormalizedModule } from './moduleData';
import {
  createFilterCacheKey,
  filterModules,
  type ModuleFilters,
} from './filterModules';

interface TreeNode {
  [key: string]: TreeNode | NormalizedModule[] | undefined;
  __modules?: NormalizedModule[];
}

const typeColors: Record<string, string> = {
  auxiliary: 'bg-blue-500',
  exploit: 'bg-red-500',
  post: 'bg-green-600',
};

const formatLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

function buildTree(mods: NormalizedModule[]): TreeNode {
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
  const [selected, setSelected] = useState<NormalizedModule | null>(null);
  const [split, setSplit] = useState(60);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [platform, setPlatform] = useState('');
  const [rank, setRank] = useState('');
  const [filteredModules, setFilteredModules] = useState<
    NormalizedModule[]
  >(modules);

  const workerRef = useRef<Worker | null>(null);
  const filterStateRef = useRef<ModuleFilters>({
    query: '',
    tag: '',
    platform: '',
    rank: '',
  });
  const filterKeyRef = useRef<string>(
    createFilterCacheKey(filterStateRef.current),
  );
  const modulesRef = useRef(modules);

  const allTags = useMemo(
    () =>
      Array.from(new Set(modules.flatMap((m) => m.tags || []))).sort(),
    [],
  );

  const allPlatforms = useMemo(
    () =>
      Array.from(
        new Set(
          modules
            .map((m) => m.platform)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [],
  );

  const allRanks = useMemo(
    () => Array.from(new Set(modules.map((m) => m.rank))).sort(),
    [],
  );

  const sendFilters = useCallback(
    (filters: ModuleFilters) => {
      filterStateRef.current = filters;
      const key = createFilterCacheKey(filters);
      filterKeyRef.current = key;
      const worker = workerRef.current;
      if (worker) {
        worker.postMessage({ type: 'filter', payload: { filters, key } });
      } else {
        setFilteredModules(filterModules(modulesRef.current, filters));
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      setFilteredModules(filterModules(modulesRef.current, filterStateRef.current));
      return;
    }

    const worker = new Worker(new URL('./filter.worker.ts', import.meta.url));
    workerRef.current = worker;

    const handleMessage = (
      event: MessageEvent<{
        type: string;
        payload: { modules: NormalizedModule[]; key: string };
      }>,
    ) => {
      const { data } = event;
      if (!data || data.type !== 'result') return;
      if (data.payload.key !== filterKeyRef.current) return;
      setFilteredModules(data.payload.modules);
    };

    worker.addEventListener('message', handleMessage);
    worker.postMessage({
      type: 'filter',
      payload: { filters: filterStateRef.current, key: filterKeyRef.current },
    });

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    sendFilters({ query, tag, platform, rank });
  }, [query, tag, platform, rank, sendFilters]);

  const tree = useMemo(() => buildTree(filteredModules), [filteredModules]);

  useEffect(() => {
    setSelected(null);
  }, [query, tag, platform, rank]);

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
        <input
          type="text"
          placeholder="Search modules"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search modules"
          className="w-full p-1 mb-2 border rounded"
        />
        <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-gray-700">
          <label className="flex items-center gap-1">
            <span className="uppercase tracking-wide text-[10px] text-gray-500">
              Platform
            </span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="">All</option>
              {allPlatforms.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <span className="uppercase tracking-wide text-[10px] text-gray-500">
              Rank
            </span>
            <select
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="">All</option>
              {allRanks.map((value) => (
                <option key={value} value={value}>
                  {formatLabel(value)}
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
          {allTags.map((t) => (
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
        {renderTree(tree)}
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
              <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-2">
                <span>
                  <span className="font-semibold">Platform:</span>{' '}
                  {selected.platform || 'Unknown'}
                </span>
                <span>
                  <span className="font-semibold">Rank:</span>{' '}
                  {formatLabel(selected.rank)}
                </span>
              </div>
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

