import React, { useState } from 'react';

interface Finding {
  pattern: string;
  explanation: string;
  remediation: string;
  docs: string;
}

const SwChecker: React.FC = () => {
  const [url, setUrl] = useState('');
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setError('');
    setFindings(null);
    if (!url) {
      setError('Please enter a URL');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/sw-check?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to check service worker');
      } else {
        setFindings(data.findings);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col space-y-4">
      <h1 className="text-2xl font-bold">Service Worker Checker</h1>
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 px-2 py-1 text-black"
        />
        <button
          type="button"
          onClick={check}
          className="px-4 py-1 bg-blue-600 rounded"
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Check'}
        </button>
      </div>
      {error && <div className="text-red-400">{error}</div>}
      {findings && (
        <div className="flex-1 overflow-auto">
          {findings.length === 0 && (
            <div>No risky patterns found in service-worker.js</div>
          )}
          {findings.length > 0 && (
            <ul className="space-y-4">
              {findings.map((f, idx) => (
                <li key={idx} className="border border-gray-700 p-3 rounded">
                  <div className="font-mono text-yellow-300">{f.pattern}</div>
                  <div className="mt-1">{f.explanation}</div>
                  <div className="mt-1 font-semibold">Remediation: {f.remediation}</div>
                  <a
                    href={f.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline mt-1 inline-block"
                  >
                    Learn more
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default SwChecker;

