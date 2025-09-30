"use client";

import { useState, useMemo, useEffect } from 'react';

interface ViewerProps {
  data: any[];
}

export default function ResultViewer({ data }: ViewerProps) {
  const [tab, setTab] = useState<'raw' | 'parsed' | 'chart'>('raw');
  const [sortKey, setSortKey] = useState('');
  const [filter, setFilter] = useState('');

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

  const keys = data[0] ? Object.keys(data[0]) : [];
  const filtered = useMemo(() => {
    const lower = filter.toLowerCase();
    return data.filter((row) => JSON.stringify(row).toLowerCase().includes(lower));
  }, [data, filter]);
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => (a[sortKey] > b[sortKey] ? 1 : -1));
  }, [filtered, sortKey]);

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

  return (
    <div className="text-xs" aria-label="result viewer">
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
      {tab === 'raw' && <pre className="bg-black text-white p-1 h-40 overflow-auto">{JSON.stringify(data, null, 2)}</pre>}
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
                {sorted.map((row, i) => (
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

