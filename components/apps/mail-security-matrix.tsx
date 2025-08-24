import React, { useState } from 'react';

type CheckResult = {
  status: 'pass' | 'warn' | 'fail';
  error?: string;
  record?: string;
};

type ApiResponse = {
  spf: CheckResult;
  dkim: CheckResult;
  dmarc: CheckResult;
  mtaSts: CheckResult;
  tlsRpt: CheckResult;
  bimi: CheckResult;
};

const CONTROLS = [
  { key: 'spf', label: 'SPF', link: 'https://www.rfc-editor.org/rfc/rfc7208' },
  { key: 'dkim', label: 'DKIM', link: 'https://www.rfc-editor.org/rfc/rfc6376' },
  { key: 'dmarc', label: 'DMARC', link: 'https://www.rfc-editor.org/rfc/rfc7489' },
  { key: 'mtaSts', label: 'MTA-STS', link: 'https://www.rfc-editor.org/rfc/rfc8461' },
  { key: 'tlsRpt', label: 'TLS-RPT', link: 'https://www.rfc-editor.org/rfc/rfc8460' },
  { key: 'bimi', label: 'BIMI', link: 'https://bimigroup.org/bimi-implementation-guide/' },
] as const;

const COLORS = {
  pass: 'bg-green-600',
  warn: 'bg-yellow-600',
  fail: 'bg-red-600',
};

const SYMBOLS = {
  pass: '✔',
  warn: '⚠',
  fail: '✖',
};

const MailSecurityMatrix: React.FC = () => {
  const [domainsText, setDomainsText] = useState('');
  const [results, setResults] = useState<Record<string, ApiResponse>>({});
  const [loading, setLoading] = useState(false);

  const check = async () => {
    const domains = domainsText.split(/\s+/).filter(Boolean);
    if (domains.length === 0) return;
    setLoading(true);
    try {
      const entries = await Promise.all(
        domains.map(async (d) => {
          const res = await fetch(`/api/mail-security-matrix?domain=${d}`);
          const data = await res.json();
          return [d, data as ApiResponse];
        })
      );
      setResults(Object.fromEntries(entries));
    } catch (_) {
      // ignore errors
    } finally {
      setLoading(false);
    }
  };

  const hasResults = Object.keys(results).length > 0;

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <textarea
        className="w-full h-24 p-2 rounded bg-gray-800 text-white"
        placeholder="example.com\nexample.net"
        value={domainsText}
        onChange={(e) => setDomainsText(e.target.value)}
      />
      <button
        type="button"
        onClick={check}
        disabled={loading}
        className="px-4 py-1 bg-blue-600 rounded disabled:opacity-50"
      >
        {loading ? 'Checking...' : 'Check'}
      </button>

      {hasResults && (
        <div className="overflow-auto">
          <table className="w-full text-sm mt-4">
            <thead>
              <tr>
                <th className="text-left p-2">Domain</th>
                {CONTROLS.map((c) => (
                  <th key={c.key} className="text-left p-2">
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {c.label}
                    </a>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(results).map(([d, r]) => (
                <tr key={d} className="border-t border-gray-700">
                  <td className="p-2 font-semibold">{d}</td>
                  {CONTROLS.map((c) => {
                    const status = r[c.key as keyof ApiResponse].status;
                    const error = r[c.key as keyof ApiResponse].error;
                    return (
                      <td
                        key={c.key}
                        className={`p-2 text-center ${COLORS[status]}`}
                        title={error || ''}
                      >
                        {SYMBOLS[status]}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MailSecurityMatrix;

