import React, { useState } from 'react';

interface Result {
  src: string;
  status: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  computedIntegrity: string;
  providedIntegrity: string | null;
  recommendation?: string;
}

const SriAudit: React.FC = () => {
  const [url, setUrl] = useState('');
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runAudit = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const res = await fetch(`/api/sri-audit?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResults(data.results);
    } catch (e: any) {
      setError(e.message || 'Failed to audit');
    } finally {
      setLoading(false);
    }
  };

  const color = (sev: Result['severity']) => {
    if (sev === 'error') return 'text-red-500';
    if (sev === 'warning') return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 px-2 py-1 text-black"
        />
        <button
          type="button"
          onClick={runAudit}
          disabled={loading}
          className="px-4 py-1 bg-blue-600 rounded"
        >
          Audit
        </button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {loading && <div>Loading...</div>}
      {results && (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Script</th>
              <th className="text-left">Status</th>
              <th className="text-left">Fix</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.src} className={color(r.severity)}>
                <td className="pr-2 break-all">{r.src}</td>
                <td className="pr-2">{r.message}</td>
                <td className="break-all">{r.recommendation || 'None'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default SriAudit;

