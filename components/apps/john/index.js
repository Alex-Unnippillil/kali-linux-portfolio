import React, { useState } from 'react';
import {
  parseRules,
  distributeTasks,
  identifyHashType,
} from './utils';

// Enhanced John the Ripper interface that supports rule uploads,
// basic hash analysis and mock distribution of cracking tasks.

const JohnApp = () => {
  const [hashes, setHashes] = useState('');
  const [hashTypes, setHashTypes] = useState([]);
  const [rules, setRules] = useState([]);
  const [endpoints, setEndpoints] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRuleUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result || '';
      setRules(parseRules(String(text)));
    };
    reader.readAsText(file);
  };

  const handleHashesChange = (e) => {
    const value = e.target.value;
    setHashes(value);
    const arr = value.split(/\r?\n/).filter(Boolean);
    setHashTypes(arr.map((h) => identifyHashType(h)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hashArr = hashes.split(/\r?\n/).filter(Boolean);
    if (!hashArr.length) {
      setError('At least one hash is required');
      return;
    }
    const endpointArr = endpoints
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    setError('');
    setLoading(true);
    setOutput('');
    try {
      const assignments = endpointArr.length
        ? distributeTasks(hashArr, endpointArr)
        : { local: hashArr };
      const results = [];
      for (const [endpoint, hs] of Object.entries(assignments)) {
        for (const h of hs) {
          const res = await fetch('/api/john', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash: h, rules }),
          });
          const data = await res.json();
          results.push(
            `${endpoint} (${identifyHashType(h)}): ${
              data.output || data.error || 'No output'
            }`
          );
        }
      }
      setOutput(results.join('\n'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-2">
        <label htmlFor="john-hashes" className="text-sm">
          Hashes (one per line)
        </label>
        <textarea
          id="john-hashes"
          value={hashes}
          onChange={handleHashesChange}
          placeholder="Enter hashes"
          className="flex-1 px-2 py-1 bg-gray-800 text-white rounded h-24"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'john-error' : undefined}
        />
        {hashTypes.length > 0 && (
          <ul className="text-xs text-gray-300">
            {hashTypes.map((t, i) => (
              <li key={i}>{`Hash ${i + 1}: ${t}`}</li>
            ))}
          </ul>
        )}
        <label htmlFor="john-rule" className="text-sm">
          Rule file
        </label>
        <input
          id="john-rule"
          type="file"
          accept=".rule,.rules,.txt"
          onChange={handleRuleUpload}
          className="text-sm"
        />
        <label htmlFor="john-endpoints" className="text-sm">
          Endpoints (comma separated)
        </label>
        <input
          id="john-endpoints"
          type="text"
          value={endpoints}
          onChange={(e) => setEndpoints(e.target.value)}
          placeholder="endpoint1, endpoint2"
          className="px-2 py-1 bg-gray-800 text-white rounded"
        />
        <button
          type="submit"
          className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded self-start"
          disabled={loading}
        >
          {loading ? 'Running...' : 'Crack'}
        </button>
        {error && (
          <p id="john-error" role="alert" className="text-red-500 text-sm">
            {error}
          </p>
        )}
      </form>
      <pre className="flex-1 overflow-auto p-4 whitespace-pre-wrap">{output}</pre>
    </div>
  );
};

export default JohnApp;

export const displayJohn = (addFolder, openApp) => (
  <JohnApp addFolder={addFolder} openApp={openApp} />
);

