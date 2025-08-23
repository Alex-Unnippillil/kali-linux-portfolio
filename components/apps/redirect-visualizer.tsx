import React, { useState } from 'react';

interface ChainItem {
  url: string;
  status: number;
  location?: string;
}

const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];

const RedirectVisualizer: React.FC = () => {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [chain, setChain] = useState<ChainItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setLoading(true);
    setError('');
    setChain([]);
    try {
      const res = await fetch('/api/redirect-visualizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method }),
      });
      const json = await res.json();
      if (json.ok) {
        setChain(json.chain || []);
      } else {
        setChain(json.chain || []);
        setError('Failed to follow redirects');
      }
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  };

  const finalUrl = chain.length > 0 ? chain[chain.length - 1].url : '';

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2">
        <input
          className="flex-1 text-black px-2 py-1"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <select
          className="text-black px-2 py-1"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleRun}
          className="px-4 py-1 bg-blue-600 rounded"
          disabled={loading}
        >
          Go
        </button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {chain.length > 0 && (
        <div className="overflow-auto flex-1">
          <ol className="space-y-1">
            {chain.map((item, idx) => (
              <li key={idx} className="break-all">
                {idx + 1}. {item.url} — {item.status}
                {item.location ? ` → ${item.location}` : ''}
              </li>
            ))}
          </ol>
          <div className="mt-4 font-bold break-all">Final URL: {finalUrl}</div>
        </div>
      )}
    </div>
  );
};

export default RedirectVisualizer;

