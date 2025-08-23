import React, { useState } from 'react';

const JwksFetcher: React.FC = () => {
  const [jwksUrl, setJwksUrl] = useState('');
  const [keys, setKeys] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchKeys = async () => {
    if (!jwksUrl) return;
    setLoading(true);
    setError(null);
    setKeys([]);
    try {
      const res = await fetch(`/api/jwks-fetcher?jwksUrl=${encodeURIComponent(jwksUrl)}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError('Failed to fetch keys');
      } else {
        setKeys(data.keys || []);
      }
    } catch {
      setError('Failed to fetch keys');
    } finally {
      setLoading(false);
    }
  };

  const copy = (key: any) => {
    navigator.clipboard.writeText(JSON.stringify(key, null, 2));
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={jwksUrl}
          onChange={(e) => setJwksUrl(e.target.value)}
          placeholder="https://example.com/.well-known/jwks.json"
          className="flex-1 px-2 py-1 text-black"
        />
        <button
          type="button"
          onClick={fetchKeys}
          disabled={loading || !jwksUrl}
          className="px-4 py-1 bg-blue-600 rounded disabled:opacity-50"
        >
          {loading ? 'Fetching...' : 'Fetch'}
        </button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      <div className="space-y-2 overflow-auto">
        {keys.map((k, idx) => (
          <div key={k.kid || idx} className="bg-gray-800 p-2 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="font-mono text-xs break-all">{k.kid || `Key ${idx + 1}`}</span>
              <button
                type="button"
                onClick={() => copy(k)}
                className="px-2 py-1 bg-gray-700 rounded text-xs"
              >
                Copy
              </button>
            </div>
            <pre className="text-xs overflow-auto">{JSON.stringify(k, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JwksFetcher;

export const displayJwksFetcher = () => {
  return <JwksFetcher />;
};

