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
      const results: Result[] = await Promise.all(
        urls.map(async (url) => {
          try {
            const response = await fetch(url, {
              method: 'HEAD',
              redirect: 'follow',
            });
            const origin = response.headers.get(
              'access-control-allow-origin'
            );
            const methodsHeader = response.headers.get(
              'access-control-allow-methods'
            );
            const credentialsHeader = response.headers.get(
              'access-control-allow-credentials'
            );
            const methods = methodsHeader
              ? methodsHeader.split(/\s*,\s*/).filter(Boolean)
              : [];
            const credentials =
              credentialsHeader === null
                ? null
                : credentialsHeader.toLowerCase() === 'true';
            return { url, origin, methods, credentials };
          } catch (e) {
            return {
              url,
              origin: null,
              methods: [],
              credentials: null,
              error: (e as Error).message,
            };
          }
        })
      );
      setResults(results);

      const originBreakdown: Record<string, number> = {};
      const methodBreakdown: Record<string, number> = {};
      const credentialsBreakdown = { true: 0, false: 0, null: 0 };

      results.forEach((r) => {
        if (r.origin)
          originBreakdown[r.origin] = (originBreakdown[r.origin] || 0) + 1;
        r.methods.forEach((m) => {
          methodBreakdown[m] = (methodBreakdown[m] || 0) + 1;
        });
        if (r.credentials === true) credentialsBreakdown.true += 1;
        else if (r.credentials === false) credentialsBreakdown.false += 1;
        else credentialsBreakdown.null += 1;
      });

      setBreakdown({
        origins: originBreakdown,
        methods: methodBreakdown,
        credentials: credentialsBreakdown,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <p className="text-sm text-gray-400">
        Requests are made with the browser Fetch API. Redirect and CORS
        restrictions apply; some responses may be unavailable.
      </p>
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

