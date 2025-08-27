import React, { useEffect, useState } from 'react';

const MsfPostApp = () => {
  const [modules, setModules] = useState([]);
  const [selected, setSelected] = useState('');
  const [output, setOutput] = useState('');

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch('/api/metasploit/modules?type=post');
        const data = await res.json();
        setModules(data.modules || []);
      } catch (err) {
        setModules([]);
      }
    };

    fetchModules();
  }, []);

  const runModule = async () => {
    if (!selected) return;
    setOutput('Running...');
    try {
      const res = await fetch('/api/metasploit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: selected }),
      });
      const data = await res.json();
      setOutput(data.output || 'No output');
    } catch (err) {
      setOutput('Error running module');
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col">
      <h2 className="text-lg mb-2">Metasploit Post Modules</h2>
      <div className="flex mb-4">
        <select
          className="flex-1 bg-gray-800 p-2 rounded"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Select a module</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          onClick={runModule}
          className="ml-2 px-4 py-2 bg-blue-600 rounded"
        >
          Run
        </button>
      </div>
      <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap">
        {output}
      </pre>
    </div>
  );
};

export default MsfPostApp;

export const displayMsfPost = (addFolder, openApp) => <MsfPostApp addFolder={addFolder} openApp={openApp} />;
