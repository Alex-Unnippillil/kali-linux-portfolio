import React, { useState } from 'react';

const RDAPLookup: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!domain) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/rdap?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lookup failed');
      } else {
        setResult(data);
      }
    } catch (e) {
      setError('Lookup failed');
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
          className="flex-1 px-2 py-1 text-black"
        />
        <button
          type="button"
          onClick={lookup}
          className="px-4 py-2 bg-blue-600 rounded"
        >
          Lookup
        </button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {result && (
        <pre className="flex-1 overflow-auto bg-gray-800 p-2 rounded text-sm">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default RDAPLookup;

