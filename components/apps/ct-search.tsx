import React, { useEffect, useRef, useState } from 'react';

type Result = {
  certId: number;
  sans: string[];
  issuer: string;
  notBefore: string;
  notAfter: string;
};

const CtSearch: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [excludeExpired, setExcludeExpired] = useState(true);
  const [uniqueOnly, setUniqueOnly] = useState(true);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, Result[]>>(new Map());
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!domain) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const key = `${domain}|${excludeExpired}|${uniqueOnly}`;
      if (cacheRef.current.has(key)) {
        setResults(cacheRef.current.get(key)!);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/ct-search?domain=${encodeURIComponent(domain)}&excludeExpired=${excludeExpired}&unique=${uniqueOnly}`
        );
        if (res.status === 429) {
          setError('Rate limit exceeded');
          setResults([]);
        } else {
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || 'Request failed');
            setResults([]);
          } else {
            setResults(data);
            cacheRef.current.set(key, data);
          }
        }
      } catch (e: any) {
        setError(e.message || 'Request failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [domain, excludeExpired, uniqueOnly]);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4 overflow-hidden">
      <div className="flex flex-col gap-2">
        <input
          type="text"
          className="px-2 py-1 rounded bg-gray-800 text-white"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={excludeExpired}
              onChange={(e) => setExcludeExpired(e.target.checked)}
            />
            Exclude expired
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={uniqueOnly}
              onChange={(e) => setUniqueOnly(e.target.checked)}
            />
            Unique subdomains
          </label>
        </div>
      </div>
      {loading && <div className="text-sm text-gray-400">Searching...</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <div className="overflow-auto h-full space-y-2 pr-1">
        {results.map((r) => (
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
            <a
              href={`https://crt.sh/?id=${r.certId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 underline"
            >
              View certificate
            </a>
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
