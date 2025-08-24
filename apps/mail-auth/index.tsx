import React, { useState } from 'react';

type Result = {
  pass: boolean;
  record?: string;
  policy?: string;
  aspf?: string;
  adkim?: string;
  message?: string;
  recommendation?: string;
  example?: string;
  spec: string;
};

type Response = {
  spf: Result;
  dkim: Result;
  dmarc: Result;
  error?: string;
};

const MailAuth: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [selector, setSelector] = useState('');
  const [results, setResults] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!domain) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ domain });
      if (selector) params.append('selector', selector);
      const res = await fetch(`/api/mail-auth?${params.toString()}`);
      const data = await res.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  const renderCard = (label: string, r: Result) => {
    const badgeColor = r.pass ? 'bg-green-600' : 'bg-red-600';
    return (
      <div key={label} className="p-4 rounded bg-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold uppercase">{label}</h3>
          <span className={`px-2 py-0.5 rounded text-xs text-white ${badgeColor}`}>
            {r.pass ? 'PASS' : 'FAIL'}
          </span>
        </div>
        {r.record && <p className="text-xs break-words">{r.record}</p>}
        {r.policy && <p className="text-xs">Policy: {r.policy}</p>}
        {r.adkim && <p className="text-xs">DKIM Align: {r.adkim}</p>}
        {r.aspf && <p className="text-xs">SPF Align: {r.aspf}</p>}
        {r.message && <p className="text-xs">{r.message}</p>}
        {r.recommendation && (
          <p className="text-xs italic">{r.recommendation}</p>
        )}
        {r.example && (
          <p className="text-xs">
            Example: <code>{r.example}</code>
          </p>
        )}
        <a
          href={r.spec}
          className="text-blue-400 text-xs"
          target="_blank"
          rel="noopener noreferrer"
        >
          Spec
        </a>
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="px-2 py-1 rounded bg-gray-800 text-white flex-1"
          placeholder="domain.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <input
          className="px-2 py-1 rounded bg-gray-800 text-white flex-1"
          placeholder="DKIM selector (optional)"
          value={selector}
          onChange={(e) => setSelector(e.target.value)}
        />
        <button
          type="button"
          onClick={check}
          disabled={loading}
          className="px-4 py-1 bg-blue-600 rounded disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check'}
        </button>
      </div>
      {results && !results.error && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {renderCard('SPF', results.spf)}
            {renderCard('DKIM', results.dkim)}
            {renderCard('DMARC', results.dmarc)}
          </div>
          <div className="overflow-auto">
            <h3 className="font-bold mt-4 mb-2">Explain</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-2">Check</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Details</th>
                  <th className="pb-2">Spec</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['SPF', results.spf],
                    ['DKIM', results.dkim],
                    ['DMARC', results.dmarc],
                  ] as [string, Result][]
                ).map(([label, r]) => (
                  <tr key={label} className="border-t border-gray-700">
                    <td className="py-2 font-semibold">{label}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-white text-xs ${
                          (r as Result).pass ? 'bg-green-600' : 'bg-red-600'
                        }`}
                      >
                        {(r as Result).pass ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="py-2 text-xs">
                      {(r as Result).policy
                        ? `Policy: ${(r as Result).policy}`
                        : (r as Result).message || ''}
                    </td>
                    <td className="py-2 text-xs">
                      <a
                        href={(r as Result).spec}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400"
                      >
                        RFC
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {results?.error && <div className="text-red-400">{results.error}</div>}
    </div>
  );
};

export default MailAuth;
