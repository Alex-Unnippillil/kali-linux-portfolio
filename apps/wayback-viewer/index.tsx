import React, { useState } from 'react';

interface Snapshot {
  timestamp: string;
  original: string;
  statuscode: string;
  mimetype: string;
  robotflags?: string | null;
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
  const [statusFilter, setStatusFilter] = useState('');
  const [mimeFilter, setMimeFilter] = useState('');
  const [excludeRobots, setExcludeRobots] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(0);
  const limit = 50;

  const fetchSnapshots = async (pageNum = 0) => {
    setLoading(true);
    setSnapshots([]);
    setSelected([]);
    setDiff(null);
    setError(null);
    try {
      const params = new URLSearchParams({
        url,
        page: String(pageNum),
        limit: String(limit),
      });
      if (statusFilter) params.append('status', statusFilter);
      if (mimeFilter) params.append('mime', mimeFilter);
      if (excludeRobots) params.append('noRobot', '1');
      const res = await fetch(`/api/wayback-viewer?${params.toString()}`);
      const json: ApiResponse = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setSnapshots(json.snapshots);
        setScrubIndex(0);
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

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const renderHeatmap = () => {
    if (snapshots.length === 0) return null;
    const counts = Array.from({ length: 12 }, () => Array(31).fill(0));
    snapshots.forEach((s) => {
      const d = parseTimestamp(s.timestamp);
      const m = d.getUTCMonth();
      const day = d.getUTCDate() - 1;
      if (m >= 0 && m < 12 && day >= 0 && day < 31) counts[m][day] += 1;
    });
    const max = Math.max(...counts.flat());
    return (
      <div className="overflow-auto">
        <div className="grid grid-cols-12 gap-1">
          {months.map((m, mi) => (
            <div key={m} className="flex flex-col gap-1">
              {Array.from({ length: 31 }).map((_, di) => {
                const count = counts[mi][di];
                const opacity = max ? count / max : 0;
                return (
                  <div
                    key={di}
                    className="w-4 h-4"
                    style={{
                      backgroundColor: '#3b82f6',
                      opacity: count ? 0.2 + 0.8 * opacity : 0.1,
                    }}
                    title={`${m} ${di + 1}: ${count}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-gray-900 text-white p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          className="flex-1 text-black px-2 py-1"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="w-24 text-black px-2 py-1"
          placeholder="status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <input
          className="w-32 text-black px-2 py-1"
          placeholder="mime"
          value={mimeFilter}
          onChange={(e) => setMimeFilter(e.target.value)}
        />
        <label className="flex items-center space-x-1">
          <input
            type="checkbox"
            checked={excludeRobots}
            onChange={(e) => setExcludeRobots(e.target.checked)}
          />
          <span className="text-sm">no robots</span>
        </label>
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
          <div className="flex items-center space-x-2">
            <input
              type="range"
              min={0}
              max={snapshots.length - 1}
              value={scrubIndex}
              onChange={(e) => setScrubIndex(Number(e.target.value))}
              className="flex-1"
            />
            {snapshots[scrubIndex] && (
              <a
                href={`https://web.archive.org/web/${snapshots[scrubIndex].timestamp}/${url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline text-sm"
              >
                {snapshots[scrubIndex].timestamp}
              </a>
            )}
          </div>
          {renderHeatmap()}
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
                <span className="text-xs">{s.statuscode}</span>
                <span className="text-xs">{s.mimetype}</span>
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

export const displayWaybackViewer = () => <WaybackViewer />;
