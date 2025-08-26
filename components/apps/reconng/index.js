import React, { useState, useRef } from 'react';

const modules = [
  'DNS Enumeration',
  'WHOIS Lookup',
  'Reverse IP Lookup',
];

const ReconNG = () => {
  const [selectedModule, setSelectedModule] = useState(modules[0]);
  const [target, setTarget] = useState('');
  const [output, setOutput] = useState('');
  const fileInputRef = useRef(null);

  const runModule = () => {
    if (!target) return;
    setOutput(`Running ${selectedModule} on ${target}...\nResults will appear here.`);
  };

  const exportWorkspace = () => {
    const data = JSON.stringify(
      { selectedModule, target, output },
      null,
      2,
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reconng-workspace.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (
          typeof data !== 'object' ||
          typeof data.selectedModule !== 'string' ||
          typeof data.target !== 'string' ||
          typeof data.output !== 'string' ||
          !modules.includes(data.selectedModule)
        ) {
          throw new Error('Invalid workspace');
        }
        setSelectedModule(data.selectedModule);
        setTarget(data.target);
        setOutput(data.output);
      } catch (err) {
        alert('Invalid workspace file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-900 text-white p-4">
      <div className="flex gap-2 mb-2">
        <select
          value={selectedModule}
          onChange={(e) => setSelectedModule(e.target.value)}
          className="bg-gray-800 px-2 py-1"
        >
          {modules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target"
          className="flex-1 bg-gray-800 px-2 py-1"
        />
        <button
          type="button"
          onClick={runModule}
          className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
        >
          Run
        </button>
        <button
          type="button"
          onClick={exportWorkspace}
          className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
        >
          Export
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-yellow-600 hover:bg-yellow-500 px-3 py-1 rounded"
        >
          Import
        </button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          onChange={handleImport}
          className="hidden"
        />
      </div>
      <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap">{output}</pre>
    </div>
  );
};

export default ReconNG;

export const displayReconNG = () => <ReconNG />;

