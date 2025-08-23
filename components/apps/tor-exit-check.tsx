import React, { useState } from 'react';

type Result = {
  ip: string;
  isExit: boolean;
  fetchedAt: string;
  error?: string;
};

const TorExitCheck: React.FC = () => {
  const [ip, setIp] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!ip) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tor-exit-check?ip=${encodeURIComponent(ip)}`);
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="px-2 py-1 rounded bg-gray-800 text-white flex-1"
          placeholder="IP address"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
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
      {result && !result.error && (
        <div>
          <p>
            {result.ip} {result.isExit ? 'is' : 'is not'} a Tor exit node.
          </p>
          <p className="text-xs text-gray-400">
            List fetched at {new Date(result.fetchedAt).toLocaleString()}
          </p>
        </div>
      )}
      {result?.error && <div className="text-red-400">{result.error}</div>}
    </div>
  );
};

export default TorExitCheck;
