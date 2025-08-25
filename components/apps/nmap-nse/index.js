import React, { useState } from 'react';

const NmapNSEApp = () => {
  const [target, setTarget] = useState('');
  const [script, setScript] = useState('http-title');
  const [output, setOutput] = useState('');
  const scripts = [
    'http-title',
    'ssl-cert',
    'vuln',
    'whois-domain',
    'ftp-anon',
  ];

  const runScan = async () => {
    if (!target) return;
    setOutput('Running scan...');
    try {
      const res = await fetch(`https://api.hackertarget.com/nmap/?q=${encodeURIComponent(target)}&script=${encodeURIComponent(script)}`);
      const text = await res.text();
      setOutput(text);
    } catch (e) {
      setOutput('Error running scan');
    }
  };

  return (
    <div className="h-full w-full flex flex-col p-4 bg-ub-cool-grey text-white">
      <div className="mb-4">
        <input
          className="w-full p-2 mb-2 rounded text-black"
          type="text"
          placeholder="Target host"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <select
          className="w-full p-2 mb-2 rounded text-black"
          value={script}
          onChange={(e) => setScript(e.target.value)}
        >
          {scripts.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button onClick={runScan} className="px-4 py-2 bg-blue-600 rounded">
          Run
        </button>
      </div>
      <pre className="flex-grow overflow-auto bg-black text-green-400 p-2 rounded">
        {output}
      </pre>
    </div>
  );
};

export default NmapNSEApp;

export const displayNmapNSE = () => {
  return <NmapNSEApp />;
};
