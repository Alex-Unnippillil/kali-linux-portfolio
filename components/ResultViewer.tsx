"use client";

import { useState, useMemo, useEffect } from 'react';
import VirtualList from 'rc-virtual-list';

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
      <div role="tablist" className="mb-2 flex">
        <button role="tab" aria-selected={tab === 'raw'} onClick={() => setTab('raw')} className="px-2 py-1 bg-ub-cool-grey text-white mr-2">
          Raw
        </button>
        <button role="tab" aria-selected={tab === 'parsed'} onClick={() => setTab('parsed')} className="px-2 py-1 bg-ub-cool-grey text-white mr-2">
          Parsed
        </button>
        <button role="tab" aria-selected={tab === 'chart'} onClick={() => setTab('chart')} className="px-2 py-1 bg-ub-cool-grey text-white">
          Chart
        </button>
      </div>
      {tab === 'raw' && <pre className="bg-black text-white p-1 h-40 overflow-auto">{JSON.stringify(data, null, 2)}</pre>}
      {tab === 'parsed' && (
        <div>
            <div className="mb-2">
              <label htmlFor="rv-filter">Filter:</label>
              <input
                id="rv-filter"
                aria-label="Filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border p-1 text-black ml-1"
              />
              {keys.map((k) => (
                <button key={k} onClick={() => setSortKey(k)} className="px-2 py-1 bg-ub-cool-grey text-white ml-2">
                  {k}
                </button>
              ))}
              <button onClick={exportCsv} className="px-2 py-1 bg-ub-green text-black ml-2" type="button">
              CSV
            </button>
          </div>
          <div className="max-h-60">
            <div
              className="grid bg-gray-700"
              style={{ gridTemplateColumns: `repeat(${keys.length}, minmax(0,1fr))` }}
            >
              {keys.map((k) => (
                <div key={k} className="border px-1">
                  {k}
                </div>
              ))}
            </div>
            <VirtualList
              data={sorted}
              height={240}
              itemHeight={24}
              itemKey={(row, index) => index}
            >
              {(row, i) => (
                <div
                  key={i}
                  className="grid"
                  style={{ gridTemplateColumns: `repeat(${keys.length}, minmax(0,1fr))` }}
                >
                  {keys.map((k) => (
                    <div key={k} className="border px-1">
                      {String(row[k])}
                    </div>
                  ))}
                </div>
              )}
            </VirtualList>
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

