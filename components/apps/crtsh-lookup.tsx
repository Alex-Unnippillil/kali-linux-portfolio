import React, { useEffect, useState } from 'react';

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
  const [issuer, setIssuer] = useState('');
  const [notAfter, setNotAfter] = useState('');
  const [filter, setFilter] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  const loadCache = () => {
    if (typeof window === 'undefined') return;
    const req = indexedDB.open('crtsh-cache', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('store');
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('store', 'readonly');
      const store = tx.objectStore('store');
      const getReq = store.get('last');
      getReq.onsuccess = () => {
        const data = getReq.result as any;
        if (data) {
          setDomain(data.domain || '');
          setIncludeSubdomains(data.includeSubdomains ?? true);
          setIssuer(data.issuer || '');
          setNotAfter(data.notAfter || '');
          setResults(data.results || []);
          setPage(data.page || 1);
          setTotal(data.total || 0);
        }
      };
    };
  };

  const saveCache = (data: any) => {
    if (typeof window === 'undefined') return;
    const req = indexedDB.open('crtsh-cache', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('store');
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('store', 'readwrite');
      tx.objectStore('store').put(data, 'last');
    };
  };

  useEffect(() => {
    loadCache();
  }, []);

  const search = async (p = 1) => {
    if (!domain) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        domain,
        subdomains: String(includeSubdomains),
        page: String(p),
        perPage: String(perPage),
      });
      if (issuer) params.append('issuer', issuer);
      if (notAfter) params.append('notAfter', notAfter);
      const res = await fetch(`/api/crtsh?${params.toString()}`);
      if (res.status === 429) {
        const retry = res.headers.get('Retry-After');
        setError(
          retry ? `Rate limit exceeded. Retry after ${retry}s` : 'Rate limit exceeded'
        );
        setResults([]);
        setTotal(0);
      } else if (!res.ok) {
        const data = await res.json();
        setError((data as any).error || 'Request failed');
        setResults([]);
        setTotal(0);
      } else {
        const data: { results: Result[]; total: number } = await res.json();
        setResults(data.results);
        setTotal(data.total);
        setPage(p);
        saveCache({
          domain,
          includeSubdomains,
          issuer,
          notAfter,
          page: p,
          total: data.total,
          results: data.results,
        });
      }
    } catch (e: any) {
      setError(e.message || 'Request failed');
      setResults([]);
      setTotal(0);
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
    const header = 'sans,issuer,not_before,not_after\n';
    const rows = filtered
      .map((r) => {
        const sans = r.sans.join(';');
        return `"${sans.replace(/"/g, '""')}","${r.issuer.replace(/"/g, '""')}",${r.notBefore},${r.notAfter}`;
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
          placeholder="example.com or *.example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <button
          onClick={() => search(1)}
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
          placeholder="Issuer CN"
          value={issuer}
          onChange={(e) => setIssuer(e.target.value)}
        />
        <input
          type="date"
          className="px-2 py-1 rounded bg-gray-800 text-white"
          value={notAfter}
          onChange={(e) => setNotAfter(e.target.value)}
        />
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
      <div className="overflow-auto h-full pr-1">
        {filtered.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">SANs</th>
                <th className="px-2 py-1 text-left">Issuer</th>
                <th className="px-2 py-1 text-left">Not Before</th>
                <th className="px-2 py-1 text-left">Not After</th>
                <th className="px-2 py-1 text-left">Link</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.certId} className="border-t border-gray-700 align-top">
                  <td className="px-2 py-1 font-mono break-words">
                    {r.sans.map((s) => (
                      <div key={s}>{s}</div>
                    ))}
                  </td>
                  <td className="px-2 py-1 break-words">{r.issuer}</td>
                  <td className="px-2 py-1">{new Date(r.notBefore).toLocaleString()}</td>
                  <td className="px-2 py-1">{new Date(r.notAfter).toLocaleString()}</td>
                  <td className="px-2 py-1">
                    <a
                      href={`https://crt.sh/?id=${r.certId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && !error && (
          <div className="text-sm text-gray-400">No results</div>
        )}
      </div>
      {total > perPage && (
        <div className="flex gap-4 items-center text-sm">
          <button
            onClick={() => search(page - 1)}
            disabled={page <= 1 || loading}
            className="px-2 py-1 bg-gray-800 rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {page} / {Math.max(1, Math.ceil(total / perPage))}
          </span>
          <button
            onClick={() => search(page + 1)}
            disabled={page >= Math.ceil(total / perPage) || loading}
            className="px-2 py-1 bg-gray-800 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default CrtshLookup;

export const displayCrtshLookup = () => <CrtshLookup />;

