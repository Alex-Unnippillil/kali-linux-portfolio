import React, { useState } from 'react';

type Result = {
  subdomain: string;
  first_seen: string;
  issuer: string;
};

const CtSearch: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!domain) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ct-search?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Request failed');
        setResults([]);
      } else {
        setResults(data);
      }
    } catch (e: any) {
      setError(e.message || 'Request failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

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
          type="button"
          onClick={search}
          disabled={loading}
          className="px-4 py-1 bg-blue-600 rounded disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <div className="overflow-auto h-full space-y-2 pr-1">
        {results.map((r) => (
          <div key={`${r.subdomain}-${r.first_seen}`} className="p-2 bg-gray-800 rounded">
            <div className="font-mono break-words">{r.subdomain}</div>
            <div className="text-xs text-gray-300 break-words">{r.issuer}</div>
            <div className="text-xs text-gray-500">{new Date(r.first_seen).toLocaleString()}</div>
          </div>
        ))}
        {!loading && results.length === 0 && !error && (
          <div className="text-sm text-gray-400">No results</div>
        )}
      </div>
    </div>
  );
};

export default CtSearch;

export const displayCtSearch = () => <CtSearch />;
