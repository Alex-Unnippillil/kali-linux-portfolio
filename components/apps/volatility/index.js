import React, { useState } from 'react';

const VolatilityApp = () => {
  const [file, setFile] = useState(null);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setOutput('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/volatility', {
        method: 'POST',
        body: formData,
      });
      const text = await res.text();
      setOutput(text);
    } catch (err) {
      setOutput('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <div className="p-4 space-y-2">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full text-black"
        />
        <button
          onClick={analyze}
          disabled={!file || loading}
          className="px-4 py-2 bg-green-600 rounded disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <div className="progress-circle" />}
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 bg-black text-green-400 whitespace-pre-wrap flex items-center justify-center">
        {loading ? (
          <div className="progress-circle" />
        ) : (
          <pre className="w-full whitespace-pre-wrap">{output}</pre>
        )}
      </div>
    </div>
  );
};

export default VolatilityApp;

export const displayVolatility = () => {
  return <VolatilityApp />;
};

