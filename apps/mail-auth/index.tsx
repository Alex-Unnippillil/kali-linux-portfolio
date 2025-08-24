import React, { useState } from 'react';

type Result = {
  pass: boolean;
  record?: string;
  policy?: string;
  aspf?: string;
  adkim?: string;
  bits?: number;
  message?: string;
  recommendation?: string;
  example?: string;
  spec: string;
};

type Response = {
  dkim: Result;
  dmarc: Result;
  mtaSts: Result;
  tlsRpt: Result;
  bimi: Result;
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

  const renderRow = (label: string, r: Result) => (
    <tr key={label} className="border-t border-gray-700">
      <td className="py-2 font-semibold">{label}</td>
      <td className="py-2">
        <span
          className={`px-2 py-0.5 rounded text-white text-xs ${
            r.pass ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {r.pass ? 'PASS' : 'FAIL'}
        </span>
      </td>
      <td className="py-2 text-xs">
        {r.policy
          ? `Policy: ${r.policy}`
          : r.bits
          ? `Key: ${r.bits}-bit`
          : r.record || r.message || ''}
      </td>
      <td className="py-2 text-xs">{r.recommendation || ''}</td>
      <td className="py-2 text-xs">
        <a
          href={r.spec}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400"
        >
          Spec
        </a>
      </td>
    </tr>
  );

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
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="pb-2">Check</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Details</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Spec</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['DKIM', results.dkim],
                  ['DMARC', results.dmarc],
                  ['MTA-STS', results.mtaSts],
                  ['TLS-RPT', results.tlsRpt],
                  ['BIMI', results.bimi],
                ] as [string, Result][]
              ).map(([label, r]) => renderRow(label, r))}
            </tbody>
          </table>
        </div>
      )}
      {results?.error && <div className="text-red-400">{results.error}</div>}
    </div>
  );
};

export default MailAuth;
