import React, { useState } from 'react';

// Simple John the Ripper interface that sends hash input to an API
// route which in turn runs the `john` binary using Node's child_process.

const JohnApp = () => {
  const [hash, setHash] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hash) {
      setError('Hash is required');
      return;
    }
    setError('');
    setLoading(true);
    setOutput('');
    try {
      const res = await fetch('/api/john', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      }
      setOutput(data.output || data.error || 'No output');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-2">
        <label htmlFor="john-hash" className="text-sm">
          Hash
        </label>
        <div className="flex gap-2">
          <input
            id="john-hash"
            type="text"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="Enter hash"
            className="flex-1 px-2 py-1 bg-gray-800 text-white rounded"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'john-error' : undefined}
          />
          <button
            type="submit"
            className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded"
            disabled={loading}
          >
            {loading ? 'Running...' : 'Crack'}
          </button>
        </div>
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

