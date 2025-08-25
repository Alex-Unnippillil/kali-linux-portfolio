import React, { useState } from 'react';

const OpenVASApp = () => {
  const [target, setTarget] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const runScan = async () => {
    if (!target) return;
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch(`/api/openvas?target=${encodeURIComponent(target)}`);
      if (!res.ok) throw new Error(`Request failed with ${res.status}`);
      const data = await res.text();
      setOutput(data);
    } catch (e) {
      setOutput(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <h2 className="text-lg mb-2">OpenVAS Scanner</h2>
      <div className="flex mb-4 space-x-2">
        <input
          className="flex-1 p-2 rounded text-black"
          placeholder="Target (e.g. 192.168.1.1)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <button
          type="button"
          onClick={runScan}
          disabled={loading}
          className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          {loading ? 'Scanning...' : 'Scan'}
        </button>
      </div>
      {output && (
        <pre className="bg-black text-green-400 p-2 rounded whitespace-pre-wrap">
          {output}
        </pre>
      )}
    </div>
  );
};

export default OpenVASApp;

export const displayOpenVAS = () => <OpenVASApp />;

