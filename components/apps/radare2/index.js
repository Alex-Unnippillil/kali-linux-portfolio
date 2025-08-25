import React, { useState } from 'react';

const Radare2 = () => {
  const [hex, setHex] = useState('');
  const [disasm, setDisasm] = useState('');
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDisasm = async () => {
    setError('');
    setDisasm('');
    if (!hex) return;
    setLoading(true);
    try {
      const res = await fetch('/api/radare2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disasm', hex }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setDisasm(data.result);
    } catch (err) {
      setError('Failed to reach backend');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    setError('');
    setAnalysis('');
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      setLoading(true);
      try {
        const res = await fetch('/api/radare2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'analyze', file: base64 }),
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else setAnalysis(data.result);
      } catch (err) {
        setError('Failed to reach backend');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white p-4 overflow-auto">
      <h1 className="text-xl mb-4">Radare2 Toolkit</h1>

      <div className="mb-6">
        <h2 className="text-lg mb-2">Disassemble Hex</h2>
        <textarea
          className="w-full p-2 rounded text-black mb-2"
          rows={3}
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          placeholder="9090"
        />
        <button
          onClick={handleDisasm}
          className="px-4 py-2 bg-blue-600 rounded"
        >
          Disassemble
        </button>
        {disasm && (
          <pre className="whitespace-pre-wrap bg-black p-2 mt-2 rounded">{disasm}</pre>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg mb-2">Analyze Binary</h2>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-2"
        />
        <button
          onClick={handleAnalyze}
          className="px-4 py-2 bg-green-600 rounded"
        >
          Analyze
        </button>
        {analysis && (
          <pre className="whitespace-pre-wrap bg-black p-2 mt-2 rounded">{analysis}</pre>
        )}
      </div>

      {loading && <p>Running...</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default Radare2;

