import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'jwks-fetcher-settings';

const JwksFetcher: React.FC = () => {
  const [jwksUrl, setJwksUrl] = useState('');
  const [issuer, setIssuer] = useState('');
  const [keys, setKeys] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [jwt, setJwt] = useState('');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [collisions, setCollisions] = useState<string[]>([]);
  const [rotations, setRotations] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setJwksUrl(parsed.jwksUrl || '');
        setIssuer(parsed.issuer || '');
        setJwt(parsed.jwt || '');
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const data = { jwksUrl, issuer, jwt };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [jwksUrl, issuer, jwt]);

  const fetchKeys = async () => {
    if (!jwksUrl && !issuer) return;
    setLoading(true);
    setError(null);
    setVerifyResult(null);
    setKeys([]);
    setCollisions([]);
    setRotations([]);
    try {
      const res = await fetch('/api/jwks-fetcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwksUrl, issuer, jwt }),
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
        setCollisions(data.collisions || []);
        setRotations(data.rotations || []);
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

  const downloadJson = (key: any, kid: string) => {
    const blob = new Blob([JSON.stringify(key, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${kid || 'key'}.json`;
    a.click();
  };

  const downloadPem = (pem: string, kid: string) => {
    const blob = new Blob([pem], { type: 'application/x-pem-file' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${kid || 'key'}.pem`;
    a.click();
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex flex-col space-y-2">
        <div className="flex space-x-2">
          <input
            type="text"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="Issuer (https://example.com)"
            className="flex-1 px-2 py-1 text-black"
          />
          <input
            type="text"
            value={jwksUrl}
            onChange={(e) => setJwksUrl(e.target.value)}
            placeholder="JWKS URL"
            className="flex-1 px-2 py-1 text-black"
          />
          <button
            type="button"
            onClick={fetchKeys}
            disabled={loading || (!jwksUrl && !issuer)}
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
      {collisions.length > 0 && (
        <div className="text-yellow-400 text-xs">
          Duplicate kids: {collisions.join(', ')}
        </div>
      )}
      {rotations.length > 0 && (
        <div className="text-yellow-400 text-xs">
          Key rotation detected for: {rotations.join(', ')}
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
                <button
                  type="button"
                  onClick={() => downloadJson(k, k.kid || `key-${idx + 1}`)}
                  className="px-2 py-1 bg-gray-700 rounded text-xs"
                >
                  Download JSON
                </button>
                {k.pem && (
                  <>
                    <button
                      type="button"
                      onClick={() => copyPem(k.pem)}
                      className="px-2 py-1 bg-gray-700 rounded text-xs"
                    >
                      Copy PEM
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadPem(k.pem, k.kid || `key-${idx + 1}`)}
                      className="px-2 py-1 bg-gray-700 rounded text-xs"
                    >
                      Download PEM
                    </button>
                  </>
                )}
              </div>
            </div>
            <pre className="text-xs overflow-auto">{JSON.stringify(k, null, 2)}</pre>
            {k.jwkThumbprint && (
              <div className="text-xs mt-1">
                thumbprint: {k.jwkThumbprint}
              </div>
            )}
            {k.rotatedAt && (
              <div className="text-xs">rotated: {new Date(k.rotatedAt).toLocaleString()}</div>
            )}
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

