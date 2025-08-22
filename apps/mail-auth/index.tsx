import React, { useState } from 'react';

type Result = {
  pass: boolean;
  record?: string;
  message?: string;
  recommendation?: string;
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
    const color = r.pass ? 'bg-green-600' : 'bg-red-600';
    return (
      <div key={label} className={`p-4 rounded text-white ${color}`}>
        <h3 className="font-bold uppercase">{label}</h3>
        {r.record && <p className="mt-2 break-words text-xs">{r.record}</p>}
        {r.message && <p className="mt-2 text-xs">{r.message}</p>}
        {r.recommendation && <p className="mt-1 text-xs italic">{r.recommendation}</p>}
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
        <div className="grid gap-4 sm:grid-cols-3">
          {renderCard('SPF', results.spf)}
          {renderCard('DKIM', results.dkim)}
          {renderCard('DMARC', results.dmarc)}
        </div>
      )}
      {results?.error && <div className="text-red-400">{results.error}</div>}
    </div>
  );
};

export default MailAuth;
