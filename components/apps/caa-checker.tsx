import React, { useState } from 'react';

interface CaaRecord {
  flags: number;
  tag: string;
  value: string;
}

interface ApiResult {
  ok: boolean;
  records: CaaRecord[];
  issues: string[];
  policyDomain: string;
  recommendation?: string;
  notes: string[];
}

const CaaChecker: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!domain) {
      setError('Domain is required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/caa-checker?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <form onSubmit={check} className="flex space-x-2 items-center">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="text-black px-2 py-1 flex-1"
        />
        <button type="submit" disabled={loading} className="px-3 py-1 bg-blue-600 rounded">
          {loading ? '...' : 'Check'}
        </button>
      </form>
      {error && <div className="text-red-500">{error}</div>}
      {result && (
        <>
          <div className="text-sm">
            Effective policy from <span className="font-mono">{result.policyDomain}</span>
          </div>
          {result.records.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Flags</th>
                  <th className="text-left">Tag</th>
                  <th className="text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                {result.records.map((r, i) => (
                  <tr key={i}>
                    <td>{r.flags}</td>
                    <td>{r.tag}</td>
                    <td>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {result.recommendation && (
            <div className="text-sm space-y-1">
              <div>Recommended CAA stanza:</div>
              <div className="relative">
                <pre className="bg-gray-800 p-2 overflow-x-auto" id="rec-block">
{result.recommendation}
                </pre>
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-blue-600 px-2 py-1 text-xs rounded"
                  onClick={() => navigator.clipboard.writeText(result.recommendation || '')}
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {result && result.issues.length > 0 && (
        <div className="text-yellow-400 text-sm space-y-1">
          {result.issues.map((iss, i) => (
            <div key={i}>{iss}</div>
          ))}
        </div>
      )}
      {result && result.notes.length > 0 && (
        <div className="text-xs text-gray-300 space-y-1">
          {result.notes.map((n, i) => (
            <div key={i}>{n}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CaaChecker;
export const displayCaaChecker = () => <CaaChecker />;

