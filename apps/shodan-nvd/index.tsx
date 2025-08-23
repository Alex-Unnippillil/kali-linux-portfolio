import React, { useState } from 'react';

interface NvdInfo {
  id: string;
  description: string;
}

interface ShodanMatch {
  ip_str: string;
  port: number;
  hostnames?: string[];
  data?: string;
  nvd: NvdInfo[];
}

const ShodanNvd: React.FC = () => {
  const [key, setKey] = useState('');
  const [query, setQuery] = useState('');
  const [agree, setAgree] = useState(false);
  const [results, setResults] = useState<ShodanMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = async () => {
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const res = await fetch('/api/shodan-nvd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, query, agree }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Error');
      } else {
        setResults(json.matches || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4 overflow-auto">
      <div className="flex space-x-2">
        <input
          className="flex-1 text-black px-2 py-1"
          placeholder="Shodan API Key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <input
          className="flex-1 text-black px-2 py-1"
          placeholder="Search query or IP"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          onClick={search}
          disabled={loading || !agree}
          className="px-4 py-1 bg-blue-600 rounded"
        >
          Search
        </button>
      </div>
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        <span className="text-sm">I agree to the terms of service</span>
      </label>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid gap-4">
        {results.map((m, i) => (
          <div key={`${m.ip_str}-${m.port}-${i}`} className="bg-gray-800 p-4 rounded">
            <h3 className="font-bold mb-1">
              {m.ip_str}:{m.port}
            </h3>
            {m.hostnames && m.hostnames.length > 0 && (
              <div className="text-sm mb-1">
                Hostnames: {m.hostnames.join(', ')}
              </div>
            )}
            {m.nvd && m.nvd.length > 0 && (
              <div className="mt-2">
                <h4 className="font-semibold">Vulnerabilities</h4>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {m.nvd.map((n) => (
                    <li key={n.id}>
                      <span className="font-mono">{n.id}</span>: {n.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShodanNvd;

