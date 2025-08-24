import React, { useState } from 'react';

interface Snapshot {
  timestamp: string;
  original: string;
}

interface ApiResponse {
  availability: any;
  snapshots: Snapshot[];
  hasMore?: boolean;
  error?: string;
}

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface DiffResult {
  bodyDiff: DiffPart[];
  headersDiff: DiffPart[];
}

function escapeHtml(str: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, (c) => map[c] || c);
}

function renderSideBySide(diff: DiffPart[]) {
  const left: string[] = [];
  const right: string[] = [];

  diff.forEach((part) => {
    const lines = part.value.split('\n');
    lines.forEach((line, i) => {
      if (i === lines.length - 1 && line === '') return;
      const escaped = escapeHtml(line);
      if (part.added) {
        left.push('<span class="block"></span>');
        right.push(`<span class="bg-green-500/30">${escaped}</span>`);
      } else if (part.removed) {
        left.push(`<span class="bg-red-500/30">${escaped}</span>`);
        right.push('<span class="block"></span>');
      } else {
        left.push(`<span>${escaped}</span>`);
        right.push(`<span>${escaped}</span>`);
      }
    });
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <pre
        className="bg-gray-800 text-white p-2 overflow-auto"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: left.join('\n') }}
      />
      <pre
        className="bg-gray-800 text-white p-2 overflow-auto"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: right.join('\n') }}
      />
    </div>
  );
}

function parseTimestamp(ts: string): Date {
  const y = Number(ts.slice(0, 4));
  const m = Number(ts.slice(4, 6)) - 1;
  const d = Number(ts.slice(6, 8));
  const h = Number(ts.slice(8, 10));
  const min = Number(ts.slice(10, 12));
  const s = Number(ts.slice(12, 14));
  return new Date(Date.UTC(y, m, d, h, min, s));
}

const WaybackViewer: React.FC = () => {
  const [url, setUrl] = useState('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  const limit = 50;

  const fetchSnapshots = async (pageNum = 0) => {
    setLoading(true);
    setSnapshots([]);
    setSelected([]);
    setDiff(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/wayback-viewer?url=${encodeURIComponent(url)}&page=${pageNum}&limit=${limit}`,
      );
      const json: ApiResponse = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setSnapshots(json.snapshots);
        setHasMore(Boolean(json.hasMore));
        setPage(pageNum);
        if (json.snapshots.length === 0) {
          setError('No snapshots available');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Error fetching snapshots');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (ts: string) => {
    setDiff(null);
    setSelected((curr) => {
      if (curr.includes(ts)) return curr.filter((t) => t !== ts);
      if (curr.length === 2) return [curr[1], ts];
      return [...curr, ts];
    });
  };

  const handleDiff = async () => {
    if (selected.length !== 2) return;
    setDiffLoading(true);
    setDiffError(null);
    try {
      const url1 = `https://web.archive.org/web/${selected[0]}/${url}`;
      const url2 = `https://web.archive.org/web/${selected[1]}/${url}`;
      const res = await fetch('/api/http-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url1, url2 }),
      });
      if (!res.ok) {
        throw new Error('Unable to diff snapshots');
      }
      const json = await res.json();
      setDiff(json);
    } catch (e: any) {
      setDiffError(e.message || 'Diff failed');
    } finally {
      setDiffLoading(false);
    }
  };

  const renderTimeline = () => {
    if (snapshots.length === 0) return null;
    const times = snapshots.map((s) => parseTimestamp(s.timestamp).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    const range = max - min || 1;
    return (
      <div className="relative w-full h-8 bg-gray-800 rounded overflow-hidden">
        {snapshots.map((s) => {
          const t = parseTimestamp(s.timestamp).getTime();
          const left = ((t - min) / range) * 100;
          const selectedCls = selected.includes(s.timestamp)
            ? 'bg-yellow-400'
            : 'bg-blue-400';
          return (
            <button
              type="button"
              key={s.timestamp}
              title={s.timestamp}
              className={`absolute top-0 h-full w-1 ${selectedCls}`}
              style={{ left: `${left}%` }}
              onClick={() => toggleSelect(s.timestamp)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 text-white p-4 space-y-4">
      <div className="flex space-x-2">
        <input
          className="flex-1 text-black px-2 py-1"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="button"
          onClick={() => fetchSnapshots(0)}
          className="px-4 py-1 bg-blue-600 rounded"
          disabled={loading}
        >
          Fetch
        </button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {snapshots.length > 0 && (
        <div className="flex flex-col flex-1 space-y-2">
          {renderTimeline()}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => fetchSnapshots(page - 1)}
              className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50"
              disabled={page === 0}
            >
              Prev
            </button>
            <span>Page {page + 1}</span>
            <button
              type="button"
              onClick={() => fetchSnapshots(page + 1)}
              className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50"
              disabled={!hasMore}
            >
              Next
            </button>
          </div>
          <ul className="space-y-1 overflow-auto flex-1">
            {snapshots.map((s) => (
              <li key={s.timestamp} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selected.includes(s.timestamp)}
                  onChange={() => toggleSelect(s.timestamp)}
                />
                <a
                  href={`https://web.archive.org/web/${s.timestamp}/${url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline"
                >
                  {s.timestamp}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {selected.length === 2 && (
        <button
          type="button"
          onClick={handleDiff}
          className="px-4 py-1 bg-green-600 rounded"
          disabled={diffLoading}
        >
          Diff Selected
        </button>
      )}
      {diffError && <div className="text-red-400">{diffError}</div>}
      {diffLoading && <div>Loading diff...</div>}
      {diff && (
        <div className="flex flex-col space-y-4 overflow-auto">
          <div>
            <h2 className="font-bold mb-1">Body Diff</h2>
            {renderSideBySide(diff.bodyDiff)}
          </div>
          <div>
            <h2 className="font-bold mb-1">Headers Diff</h2>
            {renderSideBySide(diff.headersDiff)}
          </div>
        </div>
      )}
    </div>
  );
};

export default WaybackViewer;
