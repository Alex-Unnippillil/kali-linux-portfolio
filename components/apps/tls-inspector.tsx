import React, { useState } from 'react';

interface CertInfo {
  subject: Record<string, string>;
  issuer: Record<string, string>;
  san: string[];
  validFrom: string;
  validTo: string;
  daysRemaining: number;
}

interface ApiResult {
  host: string;
  port: number;
  protocol?: string;
  cipher?: { name: string; version?: string };
  ocspStapled: boolean;
  authorizationError?: string;
  key?: { type?: string; name?: string; size?: number };
  chain?: CertInfo[];
  sslLabsUrl: string;
  testSites: { name: string; url: string }[];
  timeline: { event: string; at: number; message?: string }[];
  explanations: Record<string, string>;
}

const TLSInspector: React.FC = () => {
  const [host, setHost] = useState('');
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/tls-chain?host=${encodeURIComponent(host)}`);
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'Request failed');
        setResult(data);
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const copyReport = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <form onSubmit={fetchInfo} className="flex space-x-2 items-center">
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="example.com"
          className="text-black px-2 py-1 flex-1"
        />
        <button type="submit" disabled={loading} className="px-3 py-1 bg-blue-600 rounded">
          {loading ? '...' : 'Fetch'}
        </button>
      </form>
      {error && <div className="text-red-500">{error}</div>}
      {result && (
        <>
          <div className="text-sm space-y-1">
            <div><strong>Protocol:</strong> {result.protocol || 'Unknown'}</div>
            <div><strong>Cipher:</strong> {result.cipher?.name || 'Unknown'}</div>
            <div>
              <strong>OCSP Stapled:</strong>{' '}
              {result.ocspStapled !== undefined
                ? result.ocspStapled
                  ? 'Yes'
                  : 'No'
                : 'Unknown'}
            </div>
            <div><strong>Key:</strong> {result.key?.name || 'Unknown'}</div>
            {result.sslLabsUrl && (
              <div>
                <a
                  href={result.sslLabsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline"
                >
                  SSL Labs Report
                </a>
              </div>
            )}
            {result.testSites && (
              <div className="flex space-x-2 flex-wrap items-center">
                <span>Other Tests:</span>
                {result.testSites.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline"
                  >
                    {s.name}
                  </a>
                ))}
              </div>
            )}
            {result.authorizationError && (
              <div className="text-red-400">
                Certificate validation error: {result.authorizationError}. Ensure the server
                sends the full certificate chain and correct intermediates.
              </div>
            )}
          </div>
          {result.chain && (
            <div className="text-sm space-y-2 overflow-auto">
              {result.chain.map((c, i) => (
                <div key={i} className="border border-gray-700 p-2 rounded">
                  <div><strong>Subject:</strong> {c.subject.CN || JSON.stringify(c.subject)}</div>
                  <div><strong>Issuer:</strong> {c.issuer.CN || JSON.stringify(c.issuer)}</div>
                  <div><strong>SAN:</strong> {c.san.join(', ') || 'None'}</div>
                  <div><strong>Valid From:</strong> {new Date(c.validFrom).toUTCString()}</div>
                  <div><strong>Valid To:</strong> {new Date(c.validTo).toUTCString()}</div>
                  <div><strong>Days Remaining:</strong> {c.daysRemaining}</div>
                </div>
              ))}
            </div>
          )}
          {result.timeline && (
            <div className="text-sm space-y-1">
              <strong>Handshake Timeline (ms):</strong>
              <ul className="list-disc ml-4">
                {result.timeline.map((t, i) => (
                  <li key={i} className={t.event === 'error' ? 'text-red-400' : ''}>
                    {t.event}: {t.at}
                    {t.message ? ` - ${t.message}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={copyReport}
            className="self-start px-3 py-1 bg-blue-600 rounded text-sm"
          >
            Copy Report
          </button>
        </>
      )}
    </div>
  );
};

export default TLSInspector;
export const displayTlsInspector = () => <TLSInspector />;
