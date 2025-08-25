import React, { useState } from 'react';

const modules = [
  'DNS Enumeration',
  'WHOIS Lookup',
  'Reverse IP Lookup',
];

const ReconNG = () => {
  const [selectedModule, setSelectedModule] = useState(modules[0]);
  const [target, setTarget] = useState('');
  const [output, setOutput] = useState('');

  const runModule = () => {
    if (!target) return;
    setOutput(`Running ${selectedModule} on ${target}...\nResults will appear here.`);
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
      </div>
      <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap">{output}</pre>
    </div>
  );
};

export default ReconNG;

export const displayReconNG = () => <ReconNG />;

