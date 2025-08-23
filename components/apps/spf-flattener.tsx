import React, { useState } from 'react';

type Node = {
  domain: string;
  record?: string;
  ttl?: number;
  includes: Node[];
  ips: string[];
};

type ApiResponse = {
  chain: Node;
  ips: string[];
  ttl: number;
  length: number;
  error?: string;
};

const SpfFlattener: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async () => {
    if (!domain) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/spf-flattener?domain=${encodeURIComponent(domain)}`);
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'Request failed');
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const renderNode = (node: Node, depth = 0): React.ReactElement => {
    return (
      <div key={node.domain + depth} style={{ marginLeft: depth * 20 }} className="mb-2">
        <div className="font-semibold">
          {node.domain}
          {typeof node.ttl === 'number' && node.ttl > 0 && ` (TTL ${node.ttl})`}
        </div>
        {node.record && <div className="text-xs break-words">{node.record}</div>}
        {node.ips.length > 0 && (
          <div className="text-xs">IPs: {node.ips.join(', ')}</div>
        )}
        {node.includes.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 space-y-4 overflow-auto">
      <div className="flex space-x-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="px-2 py-1 text-black flex-1"
        />
        <button
          onClick={lookup}
          disabled={loading}
          className="px-4 py-1 bg-blue-600 rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Lookup'}
        </button>
      </div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {data && !error && (
        <div className="text-sm">
          {renderNode(data.chain)}
          <div className="mt-4">Flattened length: {data.length}</div>
          {data.ttl > 0 && <div>Minimum TTL: {data.ttl}</div>}
        </div>
      )}
    </div>
  );
};

export default SpfFlattener;

export const displaySpfFlattener = () => <SpfFlattener />;

