import React, { useState, useMemo } from 'react';

interface AuditorData {
  disallows: string[];
  urls: string[];
  error?: string;
}

const RobotsAuditor: React.FC = () => {
  const [origin, setOrigin] = useState('');
  const [data, setData] = useState<AuditorData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/robots-auditor?origin=${encodeURIComponent(origin)}`);
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch (e) {
      setError('Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  const violations = useMemo(() => {
    if (!data) return [] as string[];
    return data.urls.filter((u) => {
      try {
        const path = new URL(u).pathname;
        return data.disallows.some((rule) =>
          rule === '/' ? true : path.startsWith(rule)
        );
      } catch {
        return false;
      }
    });
  }, [data]);

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 px-2 text-black"
        />
        <button
          onClick={load}
          disabled={loading || !origin}
          className="px-4 py-1 bg-blue-600 rounded disabled:opacity-50"
        >
          Audit
        </button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {data && (
        <div className="space-y-4 overflow-auto">
          <div>
            <h2 className="font-bold mb-1">Disallow Rules</h2>
            {data.disallows.length ? (
              <ul className="list-disc ml-5">
                {data.disallows.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            ) : (
              <div>No disallow rules</div>
            )}
          </div>
          <div>
            <h2 className="font-bold mb-1">Sitemap URLs</h2>
            {data.urls.length ? (
              <ul className="list-disc ml-5 break-all">
                {data.urls.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            ) : (
              <div>No sitemap URLs</div>
            )}
          </div>
          {violations.length > 0 && (
            <div>
              <h2 className="font-bold mb-1">Disallowed URLs in Sitemap</h2>
              <ul className="list-disc ml-5 break-all text-red-400">
                {violations.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RobotsAuditor;

export const displayRobotsAuditor = () => <RobotsAuditor />;
