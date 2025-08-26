import React, { useState } from 'react';
import usePersistentState from '../../usePersistentState';
import initialResults from './output.json';

const NiktoApp = () => {
  const [target, setTarget] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = usePersistentState('nikto-history', initialResults.scans || []);

  const runScan = async () => {
    if (!target) return;
    setLoading(true);
    setResult('');
    try {
      const res = await fetch(`/api/nikto?target=${encodeURIComponent(target)}`);
      const data = await res.json();
      const formatted = JSON.stringify(data, null, 2);
      setResult(formatted);
      setHistory([...history, { id: Date.now(), target, output: data }]);
    } catch (err) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = (id) => {
    setHistory(history.filter((entry) => entry.id !== id));
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
      <div className="mt-4">
        <h2 className="text-md font-bold mb-2">Past Scans</h2>
        {history.length === 0 ? (
          <p>No past scans</p>
        ) : (
          <ul className="space-y-2">
            {history.map(({ id, target, output }) => (
              <li key={id} className="border border-gray-600 rounded p-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold mr-2">{target}</span>
                    <span className="text-xs">{new Date(id).toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => deleteEntry(id)}
                    className="bg-red-600 px-2 py-1 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
                <pre className="whitespace-pre-wrap mt-2">
                  {JSON.stringify(output, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NiktoApp;

export const displayNikto = () => <NiktoApp />;

