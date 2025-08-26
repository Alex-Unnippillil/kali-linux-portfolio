import React, { useState, useEffect } from 'react';

function Autopsy() {
  const [caseName, setCaseName] = useState('');
  const [currentCase, setCurrentCase] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [artifacts, setArtifacts] = useState([]);
  const [plugins, setPlugins] = useState([]);
  const [selectedPlugin, setSelectedPlugin] = useState('');

  useEffect(() => {
    fetch('/plugin-marketplace.json')
      .then((res) => res.json())
      .then(setPlugins)
      .catch(() => setPlugins([]));
  }, []);

  const createCase = () => {
    const name = caseName.trim();
    if (name) {
      setCurrentCase(name);
      setAnalysis('');
    }
  };

  const analyseFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target.result;
      const bytes = new Uint8Array(buffer).slice(0, 20);
      const hex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
      setAnalysis(`File: ${file.name}\nSize: ${file.size} bytes\nFirst 20 bytes: ${hex}`);
      setArtifacts((prev) => [
        ...prev,
        {
          name: file.name,
          size: file.size,
          hex,
          plugin: selectedPlugin || 'None',
          timestamp: new Date().toISOString(),
        },
      ]);
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadReport = () => {
    const lines = artifacts.map(
      (a) => `${a.timestamp} - ${a.name} (${a.size} bytes) [Plugin: ${a.plugin}]`
    );
    const report = `Case: ${currentCase}\n` + lines.join('\n');
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentCase || 'case'}-report.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 space-y-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={caseName}
          onChange={(e) => setCaseName(e.target.value)}
          placeholder="Case name"
          className="flex-grow bg-ub-grey text-white px-2 py-1 rounded"
        />
        <button
          onClick={createCase}
          className="bg-ub-orange px-3 py-1 rounded"
        >
          Create Case
        </button>
      </div>
      {currentCase && (
        <div className="space-y-2">
          <div className="text-sm">Current case: {currentCase}</div>
          <div className="flex space-x-2 items-center">
            <select
              value={selectedPlugin}
              onChange={(e) => setSelectedPlugin(e.target.value)}
              className="bg-ub-grey text-white px-2 py-1 rounded"
            >
              <option value="">Select Plugin</option>
              {plugins.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              aria-label="Upload file"
              type="file"
              onChange={analyseFile}
              className="text-sm"
            />
          </div>
        </div>
      )}
      {analysis && (
        <textarea
          readOnly
          value={analysis}
          className="bg-ub-grey text-xs text-white p-2 rounded resize-none"
        />
      )}
      {artifacts.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-bold">Timeline</div>
          <ul className="space-y-1 text-xs">
            {artifacts.map((a, idx) => (
              <li key={idx} className="bg-ub-grey p-1 rounded">
                <div>{new Date(a.timestamp).toLocaleString()}</div>
                <div>
                  {a.name} ({a.plugin})
                </div>
              </li>
            ))}
          </ul>
          <button
            onClick={downloadReport}
            className="bg-ub-orange px-3 py-1 rounded text-sm"
          >
            Download Report
          </button>
        </div>
      )}
    </div>
  );
}

export default Autopsy;

export const displayAutopsy = () => <Autopsy />;

