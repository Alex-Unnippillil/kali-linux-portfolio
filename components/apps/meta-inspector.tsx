import React, { useState } from 'react';

interface MetaData {
  canonical: string | null;
  og: Record<string, string>;
  twitter: Record<string, string>;
}

const MetaInspector: React.FC = () => {
  const [url, setUrl] = useState('');
  const [data, setData] = useState<MetaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inspect = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/meta-inspector?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to fetch metadata');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 text-white bg-gray-900 h-full overflow-auto">
      <div className="flex space-x-2">
        <input
          type="text"
          className="flex-1 p-1 text-black"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="button"
          onClick={inspect}
          className="px-4 py-1 bg-blue-600 rounded"
          disabled={loading}
        >
          Inspect
        </button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {data && (
        <div className="space-y-2">
          {data.canonical && (
            <div>
              <span className="font-bold">Canonical:</span> {data.canonical}
            </div>
          )}
          {Object.keys(data.og).length > 0 && (
            <div>
              <div className="font-bold">Open Graph</div>
              <ul className="list-disc list-inside text-sm">
                {Object.entries(data.og).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Object.keys(data.twitter).length > 0 && (
            <div>
              <div className="font-bold">Twitter</div>
              <ul className="list-disc list-inside text-sm">
                {Object.entries(data.twitter).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MetaInspector;
