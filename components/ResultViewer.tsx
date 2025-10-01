"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import preheater from '../utils/preheat';

interface ViewerProps {
  data: any[];
}

export default function ResultViewer({ data }: ViewerProps) {
  const [tab, setTab] = useState<'raw' | 'parsed' | 'chart'>('raw');
  const [sortKey, setSortKey] = useState('');
  const [filter, setFilter] = useState('');
  const cachesRef = useRef({
    raw: '',
    searchIndex: [] as string[],
    sortedIndices: new Map<string, number[]>(),
    stats: { hits: 0, misses: 0 },
  });
  const needsSyncRef = useRef(false);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 });

  useEffect(() => {
    try {
      const sk = localStorage.getItem('rv-sort');
      if (sk) setSortKey(sk);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('rv-sort', sortKey);
    } catch {
      /* ignore */
    }
  }, [sortKey]);

  useEffect(() => {
    if (needsSyncRef.current) {
      needsSyncRef.current = false;
      setCacheStats({ ...cachesRef.current.stats });
    }
  });

  const recordHit = () => {
    cachesRef.current.stats.hits += 1;
    needsSyncRef.current = true;
  };

  const recordMiss = () => {
    cachesRef.current.stats.misses += 1;
    needsSyncRef.current = true;
  };

  const keys = useMemo(() => (data[0] ? Object.keys(data[0]) : []), [data]);
  const keySignature = useMemo(() => keys.join('|'), [keys]);

  useEffect(() => {
    const caches = cachesRef.current;
    caches.raw = '';
    caches.searchIndex = [];
    caches.sortedIndices = new Map();
    caches.stats = { hits: 0, misses: 0 };
    needsSyncRef.current = true;

    if (!data.length) return undefined;

    const tasks: Array<() => void> = [
      () => {
        caches.raw = JSON.stringify(data, null, 2);
      },
      () => {
        caches.searchIndex = data.map((row) => JSON.stringify(row).toLowerCase());
      },
    ];

    keys.forEach((key) => {
      tasks.push(() => {
        const indices = data.map((_, idx) => idx);
        indices.sort((a, b) => {
          const aValue = data[a]?.[key];
          const bValue = data[b]?.[key];
          if (aValue === bValue) return 0;
          return aValue > bValue ? 1 : -1;
        });
        caches.sortedIndices.set(key, indices);
      });
    });

    const cancellations = tasks.map((task, index) =>
      preheater.schedule(task, {
        id: `result-viewer-${index}`,
        priority: index === 0 ? 'high' : 'normal',
        budget: 6,
      }),
    );

    return () => {
      cancellations.forEach((cancelTask) => cancelTask());
    };
  }, [data, keySignature]);

  const rawContent = useMemo(() => {
    const caches = cachesRef.current;
    if (caches.raw) {
      recordHit();
      return caches.raw;
    }
    recordMiss();
    const computed = JSON.stringify(data, null, 2);
    caches.raw = computed;
    return computed;
  }, [data]);

  const matchingIndices = useMemo(() => {
    if (!filter) return null;
    const caches = cachesRef.current;
    const lower = filter.toLowerCase();
    if (caches.searchIndex.length === data.length && caches.searchIndex.length > 0) {
      recordHit();
      return caches.searchIndex.reduce<number[]>((acc, entry, idx) => {
        if (entry.includes(lower)) acc.push(idx);
        return acc;
      }, []);
    }
    recordMiss();
    return data.reduce<number[]>((acc, row, idx) => {
      const serialized = JSON.stringify(row).toLowerCase();
      if (serialized.includes(lower)) acc.push(idx);
      return acc;
    }, []);
  }, [data, filter]);

  const matchingSet = useMemo(() => (matchingIndices ? new Set(matchingIndices) : null), [matchingIndices]);

  const sortedRows = useMemo(() => {
    if (!sortKey) {
      if (!matchingIndices) return data;
      return matchingIndices.map((idx) => data[idx]);
    }
    const caches = cachesRef.current;
    const cachedIndices = caches.sortedIndices.get(sortKey);
    let baseIndices: number[];
    if (cachedIndices) {
      recordHit();
      baseIndices = cachedIndices;
    } else {
      recordMiss();
      baseIndices = data.map((_, idx) => idx);
      baseIndices.sort((a, b) => {
        const aValue = data[a]?.[sortKey];
        const bValue = data[b]?.[sortKey];
        if (aValue === bValue) return 0;
        return aValue > bValue ? 1 : -1;
      });
      caches.sortedIndices.set(sortKey, baseIndices);
    }
    const source = matchingSet ? baseIndices.filter((idx) => matchingSet.has(idx)) : baseIndices;
    return source.map((idx) => data[idx]);
  }, [data, sortKey, matchingIndices, matchingSet]);

  const exportCsv = () => {
    const csv = [keys.join(','), ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInteraction = useCallback(() => {
    preheater.notifyInteraction();
  }, []);

  return (
    <div
      className="text-xs"
      aria-label="result viewer"
      onPointerDown={handleInteraction}
      onTouchStart={handleInteraction}
      onKeyDownCapture={handleInteraction}
      onFocusCapture={handleInteraction}
      data-cache-hits={cacheStats.hits}
      data-cache-misses={cacheStats.misses}
    >
      <div role="tablist" className="mb-2 flex flex-wrap gap-2">
        <button role="tab" aria-selected={tab === 'raw'} onClick={() => setTab('raw')} className="rounded bg-ub-cool-grey px-2 py-1 text-white" type="button">
          Raw
        </button>
        <button role="tab" aria-selected={tab === 'parsed'} onClick={() => setTab('parsed')} className="rounded bg-ub-cool-grey px-2 py-1 text-white" type="button">
          Parsed
        </button>
        <button role="tab" aria-selected={tab === 'chart'} onClick={() => setTab('chart')} className="rounded bg-ub-cool-grey px-2 py-1 text-white" type="button">
          Chart
        </button>
      </div>
      {tab === 'raw' && <pre className="bg-black text-white p-1 h-40 overflow-auto">{rawContent}</pre>}
      {tab === 'parsed' && (
        <div>
          <details className="mb-2 space-y-2 rounded border border-black/30 bg-black/10 p-2">
            <summary className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wide text-white">
              Advanced controls
            </summary>
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-[11px] sm:flex-row sm:items-center sm:gap-2">
                <span>Filter</span>
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full flex-1 rounded border border-black/40 bg-white p-1 text-black"
                  aria-label="Filter rows"
                />
              </label>
              {keys.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keys.map((k) => (
                    <button
                      key={k}
                      onClick={() => setSortKey(k)}
                      className={`rounded px-2 py-1 ${sortKey === k ? 'bg-ub-yellow text-black' : 'bg-ub-cool-grey text-white'}`}
                      type="button"
                    >
                      Sort by {k}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={exportCsv} className="self-start rounded bg-ub-green px-2 py-1 text-black" type="button">
                Export CSV
              </button>
            </div>
          </details>
          <div className="overflow-auto max-h-60">
            <table className="w-full text-left">
              <thead>
                <tr>
                  {keys.map((k) => (
                    <th key={k} className="border px-1">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, i) => (
                  <tr key={i}>
                    {keys.map((k) => (
                      <td key={k} className="border px-1">
                        {String(row[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'chart' && (
        <svg width="100%" height="100" role="img" aria-label="bar chart">
          {data.slice(0, keys.length).map((row, i) => (
            <rect
              key={i}
              x={i * 40}
              y={100 - Number(row[keys[0]])}
              width={30}
              height={Number(row[keys[0]])}
              fill={['#377eb8', '#4daf4a', '#e41a1c', '#984ea3', '#ff7f00'][i % 5]}
            />
          ))}
        </svg>
      )}
    </div>
  );
}

