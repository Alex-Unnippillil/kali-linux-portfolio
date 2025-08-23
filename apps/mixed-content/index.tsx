import React, { useState } from 'react';

const MixedContent: React.FC = () => {
  const [url, setUrl] = useState('');
  const [items, setItems] = useState<Record<string, string[]> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    setItems(null);
    try {
      const res = await fetch(`/api/mixed-content?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to check');
      } else {
        setItems(data.items || {});
      }
    } catch (e) {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <input
        type="text"
        className="p-2 text-black"
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button
        type="button"
        onClick={check}
        disabled={loading || !url}
        className="bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Checking...' : 'Check'}
      </button>
      {error && <div className="text-red-400">{error}</div>}
      {items && (
        <div className="overflow-auto text-sm flex-1">
          {Object.keys(items).length === 0 ? (
            <div>No mixed content found.</div>
          ) : (
            Object.entries(items).map(([tag, urls]) => (
              <div key={tag} className="mb-2">
                <h3 className="font-bold">{tag}</h3>
                <ul className="list-disc list-inside">
                  {urls.map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MixedContent;
