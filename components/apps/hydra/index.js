import React, { useState } from 'react';

const services = ['ssh', 'ftp', 'http-get', 'http-post-form', 'smtp'];

const HydraApp = () => {
  const [target, setTarget] = useState('');
  const [service, setService] = useState('ssh');
  const [users, setUsers] = useState('');
  const [passwords, setPasswords] = useState('');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  const readFile = (file, setter) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setter(e.target.result);
    reader.readAsText(file);
  };

  const runHydra = async () => {
    if (!target || !users || !passwords) {
      setOutput('Please provide target, user list and password list');
      return;
    }

    setRunning(true);
    setOutput('');
    try {
      const res = await fetch('/api/hydra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, service, userList: users, passList: passwords }),
      });
      const data = await res.json();
      setOutput(data.output || data.error || 'No output');
    } catch (err) {
      setOutput(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="space-y-2">
        <div>
          <label className="block mb-1">Target</label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-2 rounded text-black"
            placeholder="192.168.0.1"
          />
        </div>
        <div>
          <label className="block mb-1">Service</label>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full p-2 rounded text-black"
          >
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1">User List</label>
          <input
            type="file"
            accept="text/plain"
            onChange={(e) => readFile(e.target.files[0], setUsers)}
            className="w-full p-2 rounded text-black"
          />
        </div>
        <div>
          <label className="block mb-1">Password List</label>
          <input
            type="file"
            accept="text/plain"
            onChange={(e) => readFile(e.target.files[0], setPasswords)}
            className="w-full p-2 rounded text-black"
          />
        </div>
        <button
          onClick={runHydra}
          disabled={running}
          className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          {running ? 'Running...' : 'Run Hydra'}
        </button>
      </div>

      {output && (
        <pre className="mt-4 bg-black p-2 overflow-auto h-64 whitespace-pre-wrap">{output}</pre>
      )}
    </div>
  );
};

export default HydraApp;

export const displayHydra = () => {
  return <HydraApp />;
};

