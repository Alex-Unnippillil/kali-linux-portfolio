import React, { useState } from 'react';

interface Hop {
  url: string;
  status: number;
  location?: string;
  setCookie?: string;
  hsts?: string;
  altSvc?: string;
  protocol: string;
  crossSite: boolean;
  insecure: boolean;
  time: number;
}

interface ApiResponse {
  ok: boolean;
  chain: Hop[];
  mixedContent?: boolean;
}

function statusColor(status: number) {
  if (status >= 200 && status < 300) return 'text-green-500';
  if ((status >= 300 && status < 400) || status === 0) return 'text-yellow-500';
  if (status >= 400) return 'text-red-500';
  return '';
}

const RedirectVisualizer: React.FC = () => {
  const [url, setUrl] = useState('');
  const [data, setData] = useState<Hop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mixed, setMixed] = useState(false);

  const trace = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    setData([]);
    setMixed(false);
    try {
      const res = await fetch('/api/redirect-visualizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method: 'HEAD' }),
      });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok || !json.ok) {
        setError('Trace failed');
      }
      setData(json.chain);
      setMixed(!!json.mixedContent);
    } catch (e) {
      setError('Trace failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2">
        <input
          className="flex-1 text-black px-2 py-1"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          type="button"
          onClick={trace}
          className="px-4 py-1 bg-blue-600 rounded"
          disabled={loading}
        >
          Trace
        </button>
      </div>
      <p className="text-sm text-gray-400">
        Cross-origin redirects are opaque to browser JavaScript because of CORS.
        This tool resolves the chain on the server so you can inspect each hop.
      </p>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {data.length > 0 && (
        <div className="space-y-2 overflow-auto">
          {data.map((hop, i) => (
            <div
              key={i}
              className={`border p-2 rounded ${
                hop.insecure ? 'border-red-700' : hop.crossSite ? 'border-yellow-700' : 'border-gray-700'
              }`}
            >
              <div className="flex justify-between">
                <span className="break-all">{hop.url}</span>
                <span className={statusColor(hop.status)}>{hop.status}</span>
              </div>
              <div className="text-sm">Protocol: {hop.protocol}</div>
              {hop.location && (
                <div className="break-all text-sm">Location: {hop.location}</div>
              )}
              {hop.status === 0 && !hop.location && (
                <div className="break-all text-sm">Location: (opaque)</div>
              )}
              {hop.setCookie && (
                <div className="break-all text-sm">Set-Cookie: {hop.setCookie}</div>
              )}
              {hop.hsts && (
                <div className="break-all text-sm">HSTS: {hop.hsts}</div>
              )}
              {hop.altSvc && (
                <div className="break-all text-sm">Alt-Svc: {hop.altSvc}</div>
              )}
              {hop.crossSite && (
                <div className="text-sm text-yellow-400">Cross-site redirect</div>
              )}
              {hop.insecure && (
                <div className="text-sm text-red-400">Insecure hop</div>
              )}
              <div className="text-sm">Time: {hop.time} ms</div>
              <button
                type="button"
                className="text-blue-400 text-sm underline"
                onClick={() => navigator.clipboard.writeText(`curl -I ${hop.url}`)}
              >
                Copy curl -I
              </button>
            </div>
          ))}
          {mixed && (
            <div className="text-red-400">Mixed content detected on landing page</div>
          )}
        </div>
      )}
    </div>
  );
};

export default RedirectVisualizer;

