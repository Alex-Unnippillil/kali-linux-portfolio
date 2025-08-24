import React, { useState } from 'react';

type Result = {
  altSvc: string | null;
  alpn: string | null;
  h3Probe?: { ok: boolean; output: string };
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const Http3Probe: React.FC = () => {
  const [url, setUrl] = useState('');
  const [probe, setProbe] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWithRetry = async (attempt = 0): Promise<void> => {
    try {
      const res = await fetch(
        `/api/http3-probe?url=${encodeURIComponent(url)}${probe ? '&probe=1' : ''}`,
      );
      if (!res.ok) throw new Error('Request failed');
      setResult(await res.json());
      setError(null);
    } catch (e: any) {
      if (attempt < 2) {
        await delay(500 * 2 ** attempt);
        return fetchWithRetry(attempt + 1);
      }
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const onCheck = () => {
    if (!url) return;
    setLoading(true);
    setResult(null);
    fetchWithRetry();
  };

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
  };

  const renderExplanation = () => {
    if (!result) return null;
    const lines: string[] = [];
    if (result.altSvc && /h3/i.test(result.altSvc)) {
      lines.push('Alt-Svc advertises HTTP/3.');
    } else {
      lines.push('No Alt-Svc HTTP/3 hint detected.');
    }
    if (result.alpn) {
      lines.push(`ALPN negotiated: ${result.alpn}.`);
    } else {
      lines.push('ALPN negotiation not determined.');
    }
    if (result.h3Probe) {
      lines.push(result.h3Probe.ok ? 'curl --http3 succeeded.' : 'curl --http3 failed.');
    }
    return lines.map((l, i) => (
      <div key={i}>{l}</div>
    ));
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white space-y-4 overflow-auto">
      <div className="flex space-x-2 items-center">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="px-2 py-1 text-black flex-1"
        />
        <label className="text-xs flex items-center space-x-1">
          <input
            type="checkbox"
            checked={probe}
            onChange={(e) => setProbe(e.target.checked)}
          />
          <span>Probe</span>
        </label>
        <button
          onClick={onCheck}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Check'}
        </button>
      </div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {result && (
        <div className="text-sm space-y-2">
          <div>Alt-Svc: {result.altSvc || 'None'}</div>
          <div>ALPN: {result.alpn || 'Unknown'}</div>
          {result.h3Probe && (
            <div>curl --http3: {result.h3Probe.ok ? 'success' : 'failed'}</div>
          )}
          <div>{renderExplanation()}</div>
          <button
            type="button"
            onClick={copy}
            className="px-2 py-0.5 bg-green-600 rounded text-xs"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
};

export default Http3Probe;
export const displayHttp3Probe = () => <Http3Probe />;
