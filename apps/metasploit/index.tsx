'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import modulesData from '../../components/apps/metasploit/modules.json';
import MetasploitApp from '../../components/apps/metasploit';
import Toast from '../../components/ui/Toast';

export interface Module {
  name: string;
  description: string;
  type: string;
  severity: string;
  rank: string;
  platform: string[];
  disclosure: string;
  reference: string[];
  tags?: string[];
  cve?: string[];
  doc?: string;
  disclosure_date?: string;
  teaches?: string;
  transcript?: string;
  [key: string]: any;
}

export interface FilterState {
  query: string;
  tag: string;
  ranks: string[];
  platforms: string[];
  startDate: string;
  endDate: string;
}

interface TreeNode {
  [key: string]: TreeNode | Module[] | undefined;
  __modules?: Module[];
}

interface TrieNode {
  children: Map<string, TrieNode>;
  indices: Set<number>;
}

const typeColors: Record<string, string> = {
  auxiliary: 'bg-blue-500',
  exploit: 'bg-red-500',
  post: 'bg-green-600',
};

const RANK_ORDER = ['excellent', 'great', 'good', 'normal', 'manual'];

const rankIndex = (rank: string) => {
  const idx = RANK_ORDER.indexOf(rank);
  return idx === -1 ? RANK_ORDER.length : idx;
};

const rankSorter = (a: string, b: string) => {
  const diff = rankIndex(a) - rankIndex(b);
  if (diff !== 0) return diff;
  return a.localeCompare(b);
};

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const addTokens = (tokens: Set<string>, value?: string | string[]) => {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((entry) => addTokens(tokens, entry));
    return;
  }
  tokenize(value).forEach((token) => tokens.add(token));
};

export const normalizeModules = (mods: Module[]): Module[] =>
  mods.map((module) => {
    const platform = Array.isArray(module.platform)
      ? module.platform.filter(Boolean)
      : typeof module.platform === 'string'
      ? module.platform
          .split(/[\\/,]/)
          .map((entry) => entry.trim())
          .filter(Boolean)
      : [];

    const referenceSource: Array<string | undefined> = Array.isArray(module.reference)
      ? (module.reference as string[])
      : module.reference
      ? [module.reference]
      : [];

    const references = Array.from(
      new Set(
        [
          ...referenceSource,
          ...(Array.isArray(module.cve) ? module.cve : []),
          module.doc,
        ]
          .filter((entry): entry is string => Boolean(entry))
          .map((entry) => entry.trim())
          .filter(Boolean),
      ),
    );

    const disclosure = module.disclosure || module.disclosure_date || '';
    const rank = module.rank || 'normal';

    return {
      ...module,
      rank,
      platform,
      disclosure,
      reference: references,
    };
  });

const createTrieNode = (): TrieNode => ({
  children: new Map<string, TrieNode>(),
  indices: new Set<number>(),
});

const collectTokens = (module: Module): string[] => {
  const tokens = new Set<string>();
  addTokens(tokens, module.name);
  addTokens(tokens, module.description);
  addTokens(tokens, module.type);
  addTokens(tokens, module.severity);
  addTokens(tokens, module.rank);
  addTokens(tokens, module.disclosure);
  addTokens(tokens, module.doc);
  addTokens(tokens, module.teaches);
  addTokens(tokens, module.tags);
  addTokens(tokens, module.platform);
  addTokens(tokens, module.reference);
  addTokens(tokens, module.cve);
  return Array.from(tokens);
};

export const buildModuleTrie = (mods: Module[]): TrieNode => {
  const root = createTrieNode();
  mods.forEach((module, index) => {
    root.indices.add(index);
    collectTokens(module).forEach((token) => {
      let node = root;
      for (const char of token) {
        if (!node.children.has(char)) {
          node.children.set(char, createTrieNode());
        }
        node = node.children.get(char)!;
        node.indices.add(index);
      }
    });
  });
  return root;
};

const intersectSets = (a: Set<number>, b: Set<number>): Set<number> => {
  if (a.size > b.size) return intersectSets(b, a);
  const result = new Set<number>();
  a.forEach((value) => {
    if (b.has(value)) result.add(value);
  });
  return result;
};

const queryTrie = (trie: TrieNode, token: string): Set<number> => {
  let node: TrieNode | undefined = trie;
  for (const char of token) {
    node = node.children.get(char);
    if (!node) break;
  }
  return node ? new Set(node.indices) : new Set<number>();
};

export const searchModulesByTokens = (
  trie: TrieNode,
  moduleCount: number,
  query: string,
): number[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return Array.from({ length: moduleCount }, (_, idx) => idx);
  }
  const tokens = Array.from(new Set(normalized.split(/\s+/).filter(Boolean)));
  if (tokens.length === 0) {
    return Array.from({ length: moduleCount }, (_, idx) => idx);
  }

  let result: Set<number> | null = null;
  tokens.forEach((token) => {
    const matches = queryTrie(trie, token);
    if (result === null) {
      result = matches;
    } else {
      result = intersectSets(result, matches);
    }
  });

  return result ? Array.from(result) : [];
};

export const filterModuleList = (
  modules: Module[],
  indices: number[],
  filters: FilterState,
): Module[] => {
  const { tag, ranks, platforms, startDate, endDate } = filters;
  return indices
    .map((idx) => modules[idx])
    .filter((module) => {
      if (tag && !(module.tags || []).includes(tag)) return false;
      if (ranks.length && !ranks.includes(module.rank)) return false;
      if (platforms.length) {
        const modulePlatforms = module.platform || [];
        if (!modulePlatforms.some((platform) => platforms.includes(platform))) return false;
      }
      if (startDate) {
        if (!module.disclosure || module.disclosure < startDate) return false;
      }
      if (endDate) {
        if (!module.disclosure || module.disclosure > endDate) return false;
      }
      return true;
    });
};

const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
};

const buildTree = (mods: Module[]): TreeNode => {
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
};

const MetasploitPage: React.FC = () => {
  const normalizedModules = useMemo(
    () => normalizeModules(modulesData as Module[]),
    [],
  );

  const trie = useMemo(() => buildModuleTrie(normalizedModules), [normalizedModules]);

  const [filters, setFilters] = useState<FilterState>({
    query: '',
    tag: '',
    ranks: [],
    platforms: [],
    startDate: '',
    endDate: '',
  });

  const debouncedFilters = useDebouncedValue(filters, 120);

  const [selected, setSelected] = useState<Module | null>(null);
  const [split, setSplit] = useState(60);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [toast, setToast] = useState('');

  const searchMatches = useMemo(
    () =>
      searchModulesByTokens(
        trie,
        normalizedModules.length,
        debouncedFilters.query,
      ),
    [trie, normalizedModules.length, debouncedFilters.query],
  );

  const filteredModules = useMemo(
    () => filterModuleList(normalizedModules, searchMatches, debouncedFilters),
    [normalizedModules, searchMatches, debouncedFilters],
  );

  const allTags = useMemo(
    () =>
      Array.from(new Set(normalizedModules.flatMap((m) => m.tags || []))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [normalizedModules],
  );

  const allRanks = useMemo(
    () =>
      Array.from(new Set(normalizedModules.map((m) => m.rank).filter(Boolean))).sort(
        rankSorter,
      ),
    [normalizedModules],
  );

  const allPlatforms = useMemo(() => {
    const values = new Set<string>();
    normalizedModules.forEach((module) => {
      (module.platform || []).forEach((platform) => values.add(platform));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [normalizedModules]);

  const tree = useMemo(() => buildTree(filteredModules), [filteredModules]);

  useEffect(() => {
    setSelected(null);
  }, [debouncedFilters]);

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

  const toggleRank = (value: string) => {
    setFilters((prev) => {
      const ranks = prev.ranks.includes(value)
        ? prev.ranks.filter((entry) => entry !== value)
        : [...prev.ranks, value];
      return { ...prev, ranks };
    });
  };

  const togglePlatform = (value: string) => {
    setFilters((prev) => {
      const platforms = prev.platforms.includes(value)
        ? prev.platforms.filter((entry) => entry !== value)
        : [...prev.platforms, value];
      return { ...prev, platforms };
    });
  };

  const handleGenerate = () => setToast('Payload generated');

  const renderTree = (node: TreeNode) => (
    <ul className="ml-2">
      {Object.entries(node)
        .filter(([key]) => key !== '__modules')
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
              className={`ml-2 text-xs text-white px-1 rounded ${
                typeColors[mod.type] || 'bg-gray-500'
              }`}
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
      <div className="w-1/3 border-r overflow-auto p-2 space-y-3">
        <input
          type="text"
          placeholder="Search modules"
          value={filters.query}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, query: event.target.value }))
          }
          className="w-full p-1 border rounded"
          aria-label="Search modules"
        />
        <div>
          <p className="text-xs uppercase text-gray-500">Tag</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, tag: '' }))}
              className={`px-2 py-0.5 text-xs rounded ${
                filters.tag === '' ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    tag: prev.tag === tag ? '' : tag,
                  }))
                }
                className={`px-2 py-0.5 text-xs rounded ${
                  filters.tag === tag ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Rank</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {allRanks.map((rank) => {
              const active = filters.ranks.includes(rank);
              return (
                <button
                  key={rank}
                  onClick={() => toggleRank(rank)}
                  className={`px-2 py-0.5 text-xs rounded ${
                    active ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  {rank}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Platform</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {allPlatforms.map((platform) => {
              const active = filters.platforms.includes(platform);
              return (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`px-2 py-0.5 text-xs rounded ${
                    active ? 'bg-blue-600 text-white' : 'bg-gray-200'
                  }`}
                >
                  {platform}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Disclosure Date</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="flex flex-col text-xs">
              <label
                htmlFor="metasploit-date-from"
                className="mb-1 uppercase text-gray-400"
              >
                From
              </label>
              <input
                id="metasploit-date-from"
                type="date"
                value={filters.startDate}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
                className="border rounded p-1"
                aria-label="Filter modules disclosed after this date"
              />
            </div>
            <div className="flex flex-col text-xs">
              <label htmlFor="metasploit-date-to" className="mb-1 uppercase text-gray-400">
                To
              </label>
              <input
                id="metasploit-date-to"
                type="date"
                value={filters.endDate}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    endDate: event.target.value,
                  }))
                }
                className="border rounded p-1"
                aria-label="Filter modules disclosed before this date"
              />
            </div>
          </div>
        </div>
        <div className="pt-2 border-t">
          {renderTree(tree)}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-4">
          {selected ? (
            <div>
              <h2 className="font-bold mb-2 flex items-center flex-wrap gap-2">
                <span>{selected.name}</span>
                <span
                  className={`text-xs text-white px-2 py-0.5 rounded ${
                    typeColors[selected.type] || 'bg-gray-500'
                  }`}
                >
                  {selected.type}
                </span>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                  Rank: {selected.rank}
                </span>
              </h2>
              <p className="whitespace-pre-wrap mb-3">{selected.description}</p>
              <div className="space-y-1 text-sm text-gray-700">
                {selected.platform.length > 0 && (
                  <div>
                    <span className="font-semibold">Platforms:</span>{' '}
                    {selected.platform.join(', ')}
                  </div>
                )}
                {selected.disclosure && (
                  <div>
                    <span className="font-semibold">Disclosed:</span>{' '}
                    {selected.disclosure}
                  </div>
                )}
                {selected.reference.length > 0 && (
                  <div>
                    <span className="font-semibold">References:</span>{' '}
                    {selected.reference.join(', ')}
                  </div>
                )}
                {selected.cve && selected.cve.length > 0 && (
                  <div>
                    <span className="font-semibold">CVE:</span>{' '}
                    {selected.cve.join(', ')}
                  </div>
                )}
              </div>
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
              className="border p-1 w-full"
              aria-label="Payload options"
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

