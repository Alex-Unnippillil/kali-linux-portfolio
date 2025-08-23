import React, { useState } from 'react';

interface Result {
  ip?: string;
  traceIp?: string;
  resolver?: Record<string, string>;
  error?: string;
}

const IpDnsLeak = () => {
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ip-dns-leak');
      if (!res.ok) {
        let errorMsg = `Error ${res.status}: ${res.statusText}`;
        try {
          const errorData = await res.json();
          if (errorData && errorData.error) {
            errorMsg += ` - ${errorData.error}`;
          }
        } catch {
          // Ignore JSON parse errors, use status only
        }
        setResult({ error: errorMsg });
        return;
      }
      const data: Result = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e?.message ? `Fetch error: ${e.message}` : 'Failed to fetch' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white p-4 overflow-auto">
      <button
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        onClick={runCheck}
        disabled={loading}
      >
        {loading ? 'Running...' : 'Run'}
      </button>
      {result && (
        <pre className="mt-4 text-sm whitespace-pre-wrap break-all w-full max-w-lg">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default IpDnsLeak;
export const displayIpDnsLeak = () => <IpDnsLeak />;
