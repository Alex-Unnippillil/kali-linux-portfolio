import React, { useState } from 'react';

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'NS'];

const DnsToolkit: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [type, setType] = useState('A');
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);
    if (!domain) {
      setError('Domain is required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dns?domain=${encodeURIComponent(domain)}&type=${type}`
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Request failed');
      }
      const data = await res.json();
      if (data.error) setError(data.error);
      else if (data.Answer) setResults(data.Answer);
      else setError('No records found');
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="text-yellow-400 text-sm">Only test domains you own</div>
      <form onSubmit={lookup} className="flex space-x-2 items-center">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="text-black px-2 py-1 flex-1"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-black px-2 py-1"
        >
          {RECORD_TYPES.map((rt) => (
            <option key={rt} value={rt}>
              {rt}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-1 bg-blue-600 rounded"
        >
          {loading ? 'Looking up...' : 'Lookup'}
        </button>
      </form>
      {error && <div className="text-red-500">{error}</div>}
      {results.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Name</th>
              <th className="text-left">Type</th>
              <th className="text-left">TTL</th>
              <th className="text-left">Data</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i}>
                <td>{r.name}</td>
                <td>{r.type}</td>
                <td>{r.TTL}</td>
                <td>{r.data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DnsToolkit;

