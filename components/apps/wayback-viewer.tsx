import React, { useState } from 'react';

interface Snapshot {
  timestamp: string;
  original: string;
}

interface ApiResponse {
  availability: any;
  snapshots: Snapshot[];
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
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c as keyof Record<string, string>]);
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

const WaybackViewer: React.FC = () => {
  const [url, setUrl] = useState('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const fetchSnapshots = async () => {
    setLoading(true);
    setSnapshots([]);
    setSelected([]);
    setDiff(null);
    try {
      const res = await fetch(`/api/wayback-viewer?url=${encodeURIComponent(url)}`);
      const json: ApiResponse = await res.json();
      setSnapshots(json.snapshots);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
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
    try {
      const url1 = `https://web.archive.org/web/${selected[0]}/${url}`;
      const url2 = `https://web.archive.org/web/${selected[1]}/${url}`;
      const res = await fetch('/api/http-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url1, url2 }),
      });
      const json = await res.json();
      setDiff(json);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setDiffLoading(false);
    }
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
          onClick={fetchSnapshots}
          className="px-4 py-1 bg-blue-600 rounded"
          disabled={loading}
        >
          Fetch
        </button>
      </div>
      {loading && <div>Loading...</div>}
      {snapshots.length > 0 && (
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
