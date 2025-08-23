import React, { useState } from 'react';

interface Result {
  url: string;
  origin: string | null;
  methods: string[];
  credentials: boolean | null;
  error?: string;
}

interface Breakdown {
  origins: Record<string, number>;
  methods: Record<string, number>;
  credentials: { true: number; false: number; null: number };
}

const CorsChecker: React.FC = () => {
  const [urlsText, setUrlsText] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = async () => {
    const urls = urlsText
      .split(/\n|,/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (!urls.length) return;
    setLoading(true);
    try {
      const res = await fetch('/api/cors-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setBreakdown(data.breakdown || null);
    } catch (e) {
      setResults([]);
      setBreakdown(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <textarea
        className="flex-1 p-2 text-black"
        placeholder="Enter URLs (one per line)"
        value={urlsText}
        onChange={(e) => setUrlsText(e.target.value)}
      />
      <button
        type="button"
        onClick={runCheck}
        disabled={loading}
        className="bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Checking...' : 'Check CORS'}
      </button>
      {results.length > 0 && (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="border px-2">URL</th>
                <th className="border px-2">Allowed Origin</th>
                <th className="border px-2">Methods</th>
                <th className="border px-2">Credentials</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.url}>
                  <td className="border px-2">{r.url}</td>
                  <td className="border px-2">{r.error ? 'Error' : r.origin || 'None'}</td>
                  <td className="border px-2">{r.methods.join(', ')}</td>
                  <td className="border px-2">
                    {r.credentials === null ? 'N/A' : r.credentials ? 'true' : 'false'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {breakdown && (
        <div className="text-sm space-y-1">
          <div>Origins: {Object.entries(breakdown.origins).map(([o, c]) => `${o} (${c})`).join(', ') || 'None'}</div>
          <div>Methods: {Object.entries(breakdown.methods).map(([m, c]) => `${m} (${c})`).join(', ') || 'None'}</div>
          <div>
            Credentials: true ({breakdown.credentials.true}), false ({breakdown.credentials.false}), none ({breakdown.credentials.null})
          </div>
        </div>
      )}
    </div>
  );
};

export default CorsChecker;

