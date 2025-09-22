import { useState } from 'react';

export default function AdminMessages() {
  const [key, setKey] = useState('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    setError(null);
    setData(null);
    try {
      const res = await fetch('/api/admin/messages', {
        headers: {
          'x-admin-key': key,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Request failed');
      }
      setData(json);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="border p-2 flex-grow"
            placeholder="Admin key"
            aria-label="Admin access key"
          />
        <button onClick={fetchMessages} className="border px-4 py-2">
          Load
        </button>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      {data && (
        <pre className="whitespace-pre-wrap break-all text-xs border p-2">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
