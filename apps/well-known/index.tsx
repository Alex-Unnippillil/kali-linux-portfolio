import React, { useState } from 'react';

interface Result {
  path: string;
  present: boolean;
  status: number;
  contacts?: string[];
}

const WellKnown: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/well-known?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      setResults(data.results);
    } catch (e) {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 px-2 text-black"
        />
        <button
          type="button"
          onClick={check}
          className="px-3 py-1 bg-blue-600 rounded"
        >
          Check
        </button>
      </div>
      {loading && <div>Loading...</div>}
      {results && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={r.path} className="flex items-center space-x-2">
              <span className="w-48 truncate">/.well-known/{r.path}</span>
              <span>{r.present ? '✅' : '❌'}</span>
              <span className="text-sm text-gray-400">({r.status})</span>
              {r.contacts && r.contacts.length > 0 && (
                <span className="text-sm">{r.contacts.join(', ')}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default WellKnown;

