import React, { useState } from 'react';

const JwksFetcher: React.FC = () => {
  const [jwksUrl, setJwksUrl] = useState('');
  const [keys, setKeys] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [jwt, setJwt] = useState('');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const fetchKeys = async () => {
    if (!jwksUrl) return;
    setLoading(true);
    setError(null);
    setVerifyResult(null);
    setKeys([]);
    try {
      const res = await fetch('/api/jwks-fetcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwksUrl, jwt }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        let msg = data.error || 'Failed to fetch keys';
        if (data.error === 'unsupported_alg') msg = 'Unsupported alg';
        if (data.error === 'missing_kid') msg = 'Missing kid';
        if (data.error === 'kid_not_found') msg = 'kid not found';
        setError(msg);
      } else {
        setKeys(data.keys || []);
        if (data.payload) {
          setVerifyResult(
            JSON.stringify({ payload: data.payload, header: data.header }, null, 2)
          );
        }
      }
    } catch {
      setError('Failed to fetch keys');
    } finally {
      setLoading(false);
    }
  };

  const copyJson = (key: any) => {
    navigator.clipboard.writeText(JSON.stringify(key, null, 2));
  };

  const copyPem = (pem: string) => {
    navigator.clipboard.writeText(pem);
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex space-x-2">
          <input
            type="text"
            value={jwksUrl}
            onChange={(e) => setJwksUrl(e.target.value)}
            placeholder="https://example.com/.well-known/jwks.json"
            className="flex-1 px-2 py-1 text-black"
          />
          <button
            type="button"
            onClick={fetchKeys}
            disabled={loading || !jwksUrl}
            className="px-4 py-1 bg-blue-600 rounded disabled:opacity-50"
          >
            {loading ? 'Fetching...' : 'Fetch'}
          </button>
        </div>
        <textarea
          className="w-full h-24 p-2 text-black"
          placeholder="Paste JWT here (optional)"
          value={jwt}
          onChange={(e) => setJwt(e.target.value)}
        />
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {verifyResult && (
        <div>
          <h3 className="font-bold mb-1">Verification Result</h3>
          <pre className="text-xs overflow-auto bg-gray-800 p-2 rounded">{verifyResult}</pre>
        </div>
      )}
      <div className="space-y-2 overflow-auto">
        {keys.map((k, idx) => (
          <div key={k.kid || idx} className="bg-gray-800 p-2 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="font-mono text-xs break-all">{k.kid || `Key ${idx + 1}`}</span>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => copyJson(k)}
                  className="px-2 py-1 bg-gray-700 rounded text-xs"
                >
                  Copy JSON
                </button>
                {k.pem && (
                  <button
                    type="button"
                    onClick={() => copyPem(k.pem)}
                    className="px-2 py-1 bg-gray-700 rounded text-xs"
                  >
                    Copy PEM
                  </button>
                )}
              </div>
            </div>
            <pre className="text-xs overflow-auto">{JSON.stringify(k, null, 2)}</pre>
            {k.x5t !== undefined && (
              <div className="text-xs mt-1">x5t valid: {String(k.x5tValid)}</div>
            )}
            {k['x5t#S256'] !== undefined && (
              <div className="text-xs">x5t#S256 valid: {String(k.x5tS256Valid)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default JwksFetcher;

export const displayJwksFetcher = () => {
  return <JwksFetcher />;
};

