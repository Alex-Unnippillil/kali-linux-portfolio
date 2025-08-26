import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  saveSnippet,
  loadSnippets,
  parseGraph,
  convertAnalysisToGhidra,
} from './utils';

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then((mod) => mod.ForceGraph2D),
  { ssr: false }
);

const Radare2 = () => {
  const [hex, setHex] = useState('');
  const [disasm, setDisasm] = useState('');
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [snippets, setSnippets] = useState([]);
  const [snippetName, setSnippetName] = useState('');
  const [snippetCommand, setSnippetCommand] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  useEffect(() => {
    setSnippets(loadSnippets());
  }, []);

  useEffect(() => {
    setGraphData(parseGraph(analysis));
  }, [analysis]);

  const handleSaveSnippet = () => {
    if (!snippetName || !snippetCommand) return;
    const updated = saveSnippet(snippetName, snippetCommand);
    setSnippets(updated);
    setSnippetName('');
    setSnippetCommand('');
  };

  const handleExport = () => {
    const ghidra = convertAnalysisToGhidra(analysis);
    const blob = new Blob([JSON.stringify(ghidra, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analysis.ghidra.json';
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <button onClick={handleDisasm} className="px-4 py-2 bg-blue-600 rounded">
          Disassemble
        </button>
        {disasm && (
          <pre className="whitespace-pre-wrap bg-black p-2 mt-2 rounded">
            {disasm}
          </pre>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg mb-2">Analyze Binary</h2>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="mb-2"
        />
        <button onClick={handleAnalyze} className="px-4 py-2 bg-green-600 rounded">
          Analyze
        </button>
        {analysis && (
          <>
            <pre className="whitespace-pre-wrap bg-black p-2 mt-2 rounded">
              {analysis}
            </pre>
            <button
              onClick={handleExport}
              className="mt-2 px-4 py-2 bg-purple-600 rounded"
            >
              Export Ghidra
            </button>
          </>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg mb-2">Snippets</h2>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <input
            type="text"
            value={snippetName}
            onChange={(e) => setSnippetName(e.target.value)}
            placeholder="Name"
            className="p-2 rounded text-black flex-1"
          />
          <input
            type="text"
            value={snippetCommand}
            onChange={(e) => setSnippetCommand(e.target.value)}
            placeholder="Command"
            className="p-2 rounded text-black flex-1"
          />
          <button
            onClick={handleSaveSnippet}
            className="px-4 py-2 bg-blue-600 rounded"
          >
            Save
          </button>
        </div>
        <ul>
          {snippets.map((s, idx) => (
            <li key={idx} className="mb-1">
              <button
                onClick={() => setHex(s.command)}
                className="px-2 py-1 bg-gray-700 rounded w-full text-left"
              >
                {s.name}: {s.command}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {graphData.nodes.length > 0 && (
        <div className="h-64 bg-black rounded">
          <ForceGraph2D graphData={graphData} />
        </div>
      )}

      {loading && <p>Running...</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default Radare2;
