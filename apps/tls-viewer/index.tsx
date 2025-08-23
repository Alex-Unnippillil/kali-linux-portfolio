import React, { useState } from 'react';

interface CertInfo {
  subject: Record<string, string>;
  issuer: Record<string, string>;
  san: string[];
  validFrom: string;
  validTo: string;
  daysRemaining: number;
}

interface ApiResponse {
  host: string;
  port: number;
  ocspStapled: boolean;
  chain: CertInfo[];
  explanations: Record<string, string>;
}

const TLSViewer: React.FC = () => {
  const [host, setHost] = useState('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!host) return;
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await fetch(`/api/tls-chain?host=${encodeURIComponent(host)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4 overflow-auto">
      <div className="flex space-x-2">
        <input
          type="text"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="example.com"
          className="flex-1 px-2 text-black"
        />
        <button
          type="button"
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 rounded"
        >
          Fetch
        </button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {data && (
        <div className="space-y-4">
          <div>
            <strong>OCSP Stapling:</strong> {data.ocspStapled ? 'Present' : 'Not Provided'}
            <div className="text-sm text-gray-400">{data.explanations.ocspStapled}</div>
          </div>
          <ul className="space-y-4">
            {data.chain.map((cert, idx) => (
              <li key={idx} className="border-l-2 border-gray-500 pl-4">
                <div>
                  <strong>Subject:</strong> {cert.subject.CN || ''}
                  <div className="text-sm text-gray-400">{data.explanations.subject}</div>
                </div>
                <div>
                  <strong>Issuer:</strong> {cert.issuer.CN || ''}
                  <div className="text-sm text-gray-400">{data.explanations.issuer}</div>
                </div>
                {cert.san.length > 0 && (
                  <div>
                    <strong>SANs:</strong> {cert.san.join(', ')}
                    <div className="text-sm text-gray-400">{data.explanations.san}</div>
                  </div>
                )}
                <div>
                  <strong>Valid From:</strong> {new Date(cert.validFrom).toLocaleString()}
                  <div className="text-sm text-gray-400">{data.explanations.validFrom}</div>
                </div>
                <div>
                  <strong>Valid To:</strong>{' '}
                  <span className={cert.daysRemaining <= 30 ? 'text-yellow-400' : ''}>
                    {new Date(cert.validTo).toLocaleString()}
                  </span>
                  <div className="text-sm text-gray-400">{data.explanations.validTo}</div>
                </div>
                <div>
                  <strong>Days Remaining:</strong>{' '}
                  <span className={cert.daysRemaining <= 30 ? 'text-red-500' : ''}>
                    {cert.daysRemaining}
                  </span>
                  <div className="text-sm text-gray-400">{data.explanations.daysRemaining}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TLSViewer;

