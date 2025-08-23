import React, { useState } from 'react';

interface BlockedItem {
  directive: string;
  url: string;
  host: string;
}

const CspBuilder: React.FC = () => {
  const [url, setUrl] = useState('');
  const [csp, setCsp] = useState("default-src 'self';");
  const [blocked, setBlocked] = useState<BlockedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testCsp = async () => {
    setLoading(true);
    setError('');
    setBlocked([]);
    try {
      const res = await fetch('/api/csp-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, csp }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setBlocked(data.blocked || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div>
        <label htmlFor="url" className="block">Target URL</label>
        <input
          id="url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full text-black px-2 py-1"
        />
      </div>
      <div>
        <label htmlFor="csp" className="block">CSP</label>
        <input
          id="csp"
          type="text"
          value={csp}
          onChange={(e) => setCsp(e.target.value)}
          className="w-full text-black px-2 py-1"
        />
      </div>
      <button
        type="button"
        onClick={testCsp}
        className="px-4 py-2 bg-blue-600 rounded self-start"
      >
        Test
      </button>
      {loading && <div>Testing...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && blocked.length === 0 && <div>No violations found.</div>}
      {blocked.length > 0 && (
        <div>
          <h2 className="text-lg mb-2">Blocked Resources</h2>
          <ul className="list-disc list-inside space-y-1">
            {blocked.map((b, idx) => (
              <li key={idx}>
                {b.directive} blocked {b.url}. Suggest adding <code>{b.host}</code> to {b.directive}.
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CspBuilder;
