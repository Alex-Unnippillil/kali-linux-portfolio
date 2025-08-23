import React, { useState } from 'react';

interface AsnData {
  holder: string | null;
  prefixes: string[];
  peers: number[];
}

const AsnExplorer: React.FC = () => {
  const [asn, setAsn] = useState('');
  const [data, setData] = useState<AsnData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async () => {
    if (!asn) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/asn-explorer?asn=${encodeURIComponent(asn)}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || 'Lookup failed');
      } else {
        setData(json);
      }
    } catch (e) {
      setError('Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={asn}
          onChange={(e) => setAsn(e.target.value)}
          placeholder="AS13335"
          className="flex-1 px-2 py-1 text-black"
        />
        <button
          type="button"
          onClick={lookup}
          className="px-4 py-2 bg-blue-600 rounded"
        >
          Lookup
        </button>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {data && (
        <div className="overflow-auto space-y-4">
          <div>
            <span className="font-bold">Holder:</span> {data.holder || 'N/A'}
          </div>
          <div>
            <span className="font-bold">Prefixes:</span>
            <ul className="list-disc list-inside text-sm">
              {data.prefixes.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="font-bold">Peers:</span>
            <ul className="list-disc list-inside text-sm">
              {data.peers.map((p) => (
                <li key={p}>AS{p}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsnExplorer;

