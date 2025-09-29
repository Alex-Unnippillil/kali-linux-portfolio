"use client";

import { forwardRef, useState, useMemo, useEffect } from 'react';

const chartPalette = [
  'var(--chart-series-1)',
  'var(--chart-series-2)',
  'var(--chart-series-3)',
  'var(--chart-series-4)',
  'var(--chart-series-5)',
];

const tabButtonBase =
  'px-2 py-1 rounded border text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent transition-colors';

const tabButtonStyle = (active: boolean) => ({
  backgroundColor: active
    ? 'var(--theme-color-accent)'
    : 'var(--theme-color-surface)',
  color: active ? 'var(--theme-color-on-accent)' : 'var(--theme-color-text)',
  borderColor: 'var(--theme-border-subtle)',
});

const controlStyle = {
  backgroundColor: 'var(--theme-control-background)',
  color: 'var(--theme-control-text)',
  borderColor: 'var(--theme-border-subtle)',
};

const surfaceStyle = {
  backgroundColor: 'var(--theme-color-surface)',
  color: 'var(--theme-color-text)',
};

interface ViewerProps {
  data: any[];
}

const ResultViewer = forwardRef<HTMLDivElement, ViewerProps>(function ResultViewer(
  { data }: ViewerProps,
  ref,
) {
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
    <div
      ref={ref}
      className="text-xs"
      aria-label="result viewer"
      style={{ color: 'var(--theme-color-text)' }}
    >
      <div role="tablist" className="mb-2 flex gap-2">
        <button
          role="tab"
          aria-selected={tab === 'raw'}
          onClick={() => setTab('raw')}
          className={`${tabButtonBase}`}
          style={tabButtonStyle(tab === 'raw')}
        >
          Raw
        </button>
        <button
          role="tab"
          aria-selected={tab === 'parsed'}
          onClick={() => setTab('parsed')}
          className={tabButtonBase}
          style={tabButtonStyle(tab === 'parsed')}
        >
          Parsed
        </button>
        <button
          role="tab"
          aria-selected={tab === 'chart'}
          onClick={() => setTab('chart')}
          className={tabButtonBase}
          style={tabButtonStyle(tab === 'chart')}
        >
          Chart
        </button>
      </div>
      {tab === 'raw' && (
        <pre
          className="p-2 h-40 overflow-auto rounded"
          style={{
            ...surfaceStyle,
            backgroundColor: 'var(--chart-surface)',
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
      {tab === 'parsed' && (
        <div style={{ color: 'var(--theme-color-text)' }}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <label htmlFor="result-viewer-filter">Filter:</label>
            <input
              id="result-viewer-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="ml-1 rounded border px-2 py-1"
              style={controlStyle}
              aria-label="Filter results"
            />
            {keys.map((k) => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                className={`${tabButtonBase} ml-0`}
                style={tabButtonStyle(sortKey === k)}
              >
                {k}
              </button>
            ))}
            <button
              onClick={exportCsv}
              className={`${tabButtonBase} ml-0`}
              type="button"
              style={{
                ...tabButtonStyle(true),
                backgroundColor: 'var(--theme-color-accent)',
                color: 'var(--theme-color-on-accent)',
              }}
            >
              CSV
            </button>
          </div>
          <div className="overflow-auto max-h-60">
            <table
              className="w-full text-left border-collapse"
              style={{ color: 'var(--theme-color-text)' }}
            >
              <thead>
                <tr>
                  {keys.map((k) => (
                    <th
                      key={k}
                      className="px-2 py-1"
                      style={{
                        border: '1px solid var(--theme-border-subtle)',
                        backgroundColor: 'var(--theme-color-surface)',
                      }}
                    >
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor:
                        i % 2 === 0 ? 'transparent' : 'var(--table-row-alt)',
                    }}
                  >
                    {keys.map((k) => (
                      <td
                        key={k}
                        className="px-2 py-1"
                        style={{ border: '1px solid var(--theme-border-subtle)' }}
                      >
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
        <svg
          width="100%"
          height="100"
          role="img"
          aria-label="bar chart"
          style={{ backgroundColor: 'var(--chart-surface)' }}
        >
          {data.slice(0, keys.length).map((row, i) => (
            <rect
              key={i}
              x={i * 40}
              y={100 - Number(row[keys[0]])}
              width={30}
              height={Number(row[keys[0]])}
              fill={chartPalette[i % chartPalette.length]}
            />
          ))}
        </svg>
      )}
    </div>
  );
});

export default ResultViewer;

