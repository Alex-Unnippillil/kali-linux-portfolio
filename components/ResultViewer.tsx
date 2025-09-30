"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';

interface ViewerProps {
  data: any[];
}

export default function ResultViewer({ data }: ViewerProps) {
  const [tab, setTab] = useState<'raw' | 'parsed' | 'chart'>('raw');
  const [sortKey, setSortKey] = useState('');
  const [filter, setFilter] = useState('');
  const [isWrapped, setIsWrapped] = useState(true);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

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

  const rawJson = useMemo(() => JSON.stringify(data, null, 2), [data]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(rawJson);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [rawJson]);

  const toggleWrap = useCallback(() => {
    setIsWrapped((prev) => !prev);
  }, []);

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
      {tab === 'raw' && (
        <div>
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={toggleWrap}
              aria-pressed={!isWrapped}
              className="px-2 py-1 bg-ub-cool-grey text-white"
            >
              {isWrapped ? 'Enable horizontal scroll' : 'Enable soft wrap'}
            </button>
          </div>
          <pre
            className={`bg-black text-white p-1 h-40 ${
              isWrapped
                ? 'whitespace-pre-wrap break-words overflow-y-auto'
                : 'whitespace-pre overflow-auto'
            }`}
          >
            {rawJson}
          </pre>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-2 py-1 bg-ub-green text-black"
            >
              Copy JSON
            </button>
            {copyState === 'copied' && <span className="text-ub-green">Copied!</span>}
            {copyState === 'error' && <span className="text-red-400">Copy failed</span>}
          </div>
        </div>
      )}
      {tab === 'parsed' && (
        <div>
          <div className="mb-2">
            <label>
              Filter:
              <input value={filter} onChange={(e) => setFilter(e.target.value)} className="border p-1 text-black ml-1" />
            </label>
            {keys.map((k) => (
              <button key={k} onClick={() => setSortKey(k)} className="px-2 py-1 bg-ub-cool-grey text-white ml-2">
                {k}
              </button>
            ))}
            <button onClick={exportCsv} className="px-2 py-1 bg-ub-green text-black ml-2" type="button">
              CSV
            </button>
          </div>
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

