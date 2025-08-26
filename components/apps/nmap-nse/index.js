import React, { useState } from 'react';

const scripts = [
  { name: 'http-title', description: 'Fetches page titles from HTTP services.' },
  { name: 'ssl-cert', description: 'Retrieves TLS certificate information.' },
  { name: 'smb-os-discovery', description: 'Discovers remote OS information via SMB.' },
  { name: 'ftp-anon', description: 'Checks for anonymous FTP access.' },
  { name: 'http-enum', description: 'Enumerates directories on web servers.' },
  { name: 'dns-brute', description: 'Performs DNS subdomain brute force enumeration.' },
];

const NmapNSEApp = () => {
  const [target, setTarget] = useState('');
  const [script, setScript] = useState(scripts[0].name);
  const [output, setOutput] = useState('');

  const runScan = async () => {
    if (!target) return;
    setOutput('Running scan...');
    try {
      const res = await fetch(
        `https://api.hackertarget.com/nmap/?q=${encodeURIComponent(target)}&script=${encodeURIComponent(script)}`
      );
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
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <p className="text-sm mb-2">
          {scripts.find((s) => s.name === script)?.description}
        </p>
        <button onClick={runScan} className="px-4 py-2 bg-blue-600 rounded">
          Run
        </button>
      </div>
      <div className="mb-4 text-sm">
        <h2 className="font-bold mb-2">Featured Scripts</h2>
        <ul className="list-disc pl-4 space-y-1">
          {scripts.map((s) => (
            <li key={s.name}>
              <code>{s.name}</code>: {s.description}
            </li>
          ))}
        </ul>
        <p className="mt-2">
          Explore the full{' '}
          <a
            href="https://nmap.org/nsedoc/"
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-400"
          >
            NSE script index
          </a>{' '}
          and the{' '}
          <a
            href="https://nmap.org/book/nse.html"
            target="_blank"
            rel="noreferrer"
            className="underline text-blue-400"
          >
            Nmap book chapter on the NSE
          </a>
          .
        </p>
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
