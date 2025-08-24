import React, { useRef, useState } from 'react';

interface Result {
  certId: number;
  issuer: string;
  notBefore: string;
  notAfter: string;
  sans: string[];
}

const CrtshLookup: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [includeSubdomains, setIncludeSubdomains] = useState(true);
  const [filter, setFilter] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, Result[]>>(new Map());

  const search = async () => {
    if (!domain) return;
    const key = `${domain}|${includeSubdomains}`;
    if (cacheRef.current.has(key)) {
      setResults(cacheRef.current.get(key)!);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/crtsh?domain=${encodeURIComponent(domain)}&subdomains=${includeSubdomains}`
      );
      if (res.status === 429) {
        const retry = res.headers.get('Retry-After');
        setError(
          retry ? `Rate limit exceeded. Retry after ${retry}s` : 'Rate limit exceeded'
        );
        setResults([]);
      } else if (!res.ok) {
        const data = await res.json();
        setError((data as any).error || 'Request failed');
        setResults([]);
      } else {
        const data: { results: Result[] } = await res.json();
        setResults(data.results);
        cacheRef.current.set(key, data.results);
      }
    } catch (e: any) {
      setError(e.message || 'Request failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain || 'certs'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const header = 'issuer,not_before,not_after,sans\n';
    const rows = results
      .map((r) => {
        const sans = r.sans.join(';');
        return `"${r.issuer.replace(/"/g, '""')}",${r.notBefore},${r.notAfter},"${sans.replace(/"/g, '""')}"`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain || 'certs'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = results.filter((r) => {
    if (!filter) return true;
    const target = `${r.issuer} ${r.sans.join(' ')}`.toLowerCase();
    return target.includes(filter.toLowerCase());
  });

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4 overflow-hidden">
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 px-2 py-1 rounded bg-gray-800 text-white"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <button
          onClick={search}
          className="px-2 py-1 bg-blue-600 rounded text-white"
        >
          Search
        </button>
      </div>
      <div className="flex gap-4 text-sm items-center flex-wrap">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={includeSubdomains}
            onChange={(e) => setIncludeSubdomains(e.target.checked)}
          />
          Include subdomains
        </label>
        <input
          type="text"
          className="px-2 py-1 rounded bg-gray-800 text-white"
          placeholder="Filter results"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button
          onClick={exportJSON}
          className="px-2 py-1 bg-green-600 rounded text-white"
          disabled={results.length === 0}
        >
          JSON
        </button>
        <button
          onClick={exportCSV}
          className="px-2 py-1 bg-green-600 rounded text-white"
          disabled={results.length === 0}
        >
          CSV
        </button>
      </div>
      {loading && <div className="text-sm text-gray-400">Searching...</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <div className="overflow-auto h-full space-y-2 pr-1">
        {filtered.map((r) => (
          <div key={r.certId} className="p-2 bg-gray-800 rounded space-y-1">
            <div className="font-mono break-words text-sm">
              {r.sans.map((s) => (
                <div key={s}>{s}</div>
              ))}
            </div>
            <div className="text-xs text-gray-300 break-words">{r.issuer}</div>
            <div className="text-xs text-gray-400">
              {new Date(r.notBefore).toLocaleString()} -{' '}
              {new Date(r.notAfter).toLocaleString()}
            </div>
            <div className="flex gap-2 text-xs">
              <a
                href={`https://crt.sh/?id=${r.certId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                View
              </a>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && !error && (
          <div className="text-sm text-gray-400">No results</div>
        )}
      </div>
    </div>
  );
};

export default CrtshLookup;

export const displayCrtshLookup = () => <CrtshLookup />;

