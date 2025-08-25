import React, { useState } from 'react';

const TheHarvester = () => {
  const [domain, setDomain] = useState('');
  const [engine, setEngine] = useState('google');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const runHarvester = async () => {
    if (!domain) return;
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/theharvester', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, engine }),
      });
      const data = await res.json();
      setOutput(data.output || data.error || 'No output');
    } catch (e) {
      setOutput('Failed to run theHarvester');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <div className="mb-4">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="w-full p-2 mb-2 rounded text-black"
          placeholder="Domain"
        />
        <select
          value={engine}
          onChange={(e) => setEngine(e.target.value)}
          className="w-full p-2 mb-2 rounded text-black"
        >
          <option value="google">Google</option>
          <option value="bing">Bing</option>
          <option value="duckduckgo">DuckDuckGo</option>
        </select>
        <button
          onClick={runHarvester}
          className="px-4 py-2 bg-blue-600 rounded"
          disabled={loading}
        >
          {loading ? 'Running...' : 'Run'}
        </button>
      </div>
      {output && (
        <pre className="whitespace-pre-wrap text-sm bg-black p-2 rounded">{output}</pre>
      )}
    </div>
  );
};

export default TheHarvester;

export const displayTheHarvester = () => {
  return <TheHarvester />;
};

