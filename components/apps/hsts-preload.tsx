import React, { useState } from 'react';

interface HeaderCheck {
  hasHeader: boolean;
  maxAge: boolean;
  includeSubDomains: boolean;
  preload: boolean;
}

interface ApiResponse {
  ok: boolean;
  status: string;
  reasons: string[];
  headerCheck: HeaderCheck;
  error?: string;
}

const HstsPreload: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!domain) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/hsts-preload?domain=${encodeURIComponent(domain)}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ ok: false, status: 'error', reasons: [], headerCheck: { hasHeader: false, maxAge: false, includeSubDomains: false, preload: false }, error: 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white space-y-4 overflow-auto">
      <div className="flex gap-2">
        <input
          className="px-2 py-1 rounded bg-gray-800 text-white flex-1"
          placeholder="example.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <button
          onClick={check}
          disabled={loading}
          className="px-4 py-1 bg-blue-600 rounded disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check'}
        </button>
      </div>
      {result && result.error && (
        <div className="text-red-400">{result.error}</div>
      )}
      {result && !result.error && (
        <div className="space-y-2">
          <p>
            Preload status: <span className="font-mono">{result.status}</span>
          </p>
          <p>Header OK: {result.ok ? 'Yes' : 'No'}</p>
          {!result.ok && result.reasons.length > 0 && (
            <ul className="list-disc list-inside text-sm text-red-400">
              {result.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          <div>
            <h3 className="font-bold mt-2">Header Check</h3>
            <ul className="list-disc list-inside text-sm">
              <li>Has header: {String(result.headerCheck.hasHeader)}</li>
              <li>max-age ≥ 31536000: {String(result.headerCheck.maxAge)}</li>
              <li>includeSubDomains: {String(result.headerCheck.includeSubDomains)}</li>
              <li>preload: {String(result.headerCheck.preload)}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default HstsPreload;
export const displayHstsPreload = () => <HstsPreload />;
