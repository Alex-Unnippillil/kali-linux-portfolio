import React, { useState } from 'react';

const NiktoApp = () => {
  const [target, setTarget] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const runScan = async () => {
    if (!target) return;
    setLoading(true);
    setResult('');
    try {
      const res = await fetch(`/api/nikto?target=${encodeURIComponent(target)}`);
      const text = await res.text();
      setResult(text);
    } catch (err) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 overflow-auto">
      <h1 className="text-lg mb-4 font-bold">Nikto Scanner</h1>
      <div className="flex mb-4">
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="http://example.com"
          className="flex-1 p-2 rounded-l text-black"
        />
        <button
          type="button"
          onClick={runScan}
          className="px-4 bg-ubt-blue rounded-r"
        >
          Scan
        </button>
      </div>
      {loading ? (
        <p>Running scan...</p>
      ) : (
        <pre className="whitespace-pre-wrap flex-1 overflow-auto">{result}</pre>
      )}
    </div>
  );
};

export default NiktoApp;

export const displayNikto = () => <NiktoApp />;

