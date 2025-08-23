import React, { useState } from 'react';

const HibpCheck: React.FC = () => {
  const [password, setPassword] = useState('');
  const [prefix, setPrefix] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState('');

  const check = async () => {
    setError('');
    setCount(null);
    setPrefix('');
    try {
      const res = await fetch('/api/hibp-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Request failed');
        return;
      }
      setPrefix(data.prefix);
      setCount(data.count);
    } catch (e) {
      setError('Request failed');
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white p-4 space-y-4">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="p-2 rounded text-black"
        placeholder="Enter password"
      />
      <button onClick={check} className="px-4 py-2 bg-blue-600 rounded">
        Check
      </button>
      {prefix && <div>Prefix: {prefix}</div>}
      {count !== null && <div>Matches: {count}</div>}
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
};

export default HibpCheck;

export const displayHibpCheck = () => <HibpCheck />;
