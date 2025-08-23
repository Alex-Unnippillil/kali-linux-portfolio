import React, { useState } from 'react';

interface ProbeResult {
  ok: boolean;
  altSvc: string | null;
  alpnHints: string[];
}

const Http3Probe: React.FC = () => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const probe = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/http3-probe?url=${encodeURIComponent(url)}`);
      const data = (await res.json()) as ProbeResult;
      setResult(data);
    } catch {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 text-sm text-gray-900 dark:text-gray-100">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com"
          className="border px-2 py-1 flex-grow"
        />
        <button onClick={probe} className="px-2 py-1 border" disabled={loading}>
          Probe
        </button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {result && (
        <div>
          <div className="font-bold mb-1">
            {result.ok ? 'HTTP/3 advertised' : 'No HTTP/3 hint'}
          </div>
          {result.altSvc && (
            <div className="break-all">Alt-Svc: {result.altSvc}</div>
          )}
          {!result.ok && (
            <div className="mt-1">Fallback to HTTP/1.1/2</div>
          )}
          {result.ok && result.alpnHints.length > 0 && (
            <div className="mt-1">Protocols: {result.alpnHints.join(', ')}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Http3Probe;
