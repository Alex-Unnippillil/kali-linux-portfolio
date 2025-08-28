import React, { useEffect, useState } from 'react';

// Basic script metadata. Example output is loaded from public/demo/nmap-nse.json
const scripts = [
  {
    name: 'http-title',
    description: 'Fetches page titles from HTTP services.',
    command: 'nmap -sV --script http-title <target>'
  },
  {
    name: 'ssl-cert',
    description: 'Retrieves TLS certificate information.',
    command: 'nmap -p 443 --script ssl-cert <target>'
  },
  {
    name: 'smb-os-discovery',
    description: 'Discovers remote OS information via SMB.',
    command: 'nmap -p 445 --script smb-os-discovery <target>'
  },
  {
    name: 'ftp-anon',
    description: 'Checks for anonymous FTP access.',
    command: 'nmap -p 21 --script ftp-anon <target>'
  },
  {
    name: 'http-enum',
    description: 'Enumerates directories on web servers.',
    command: 'nmap -p 80 --script http-enum <target>'
  },
  {
    name: 'dns-brute',
    description: 'Performs DNS subdomain brute force enumeration.',
    command: 'nmap --script dns-brute <target>'
  }
];

const NmapNSEApp = () => {
  const [target, setTarget] = useState('example.com');
  const [script, setScript] = useState(scripts[0].name);
  const [examples, setExamples] = useState({});

  useEffect(() => {
    fetch('/demo/nmap-nse.json')
      .then((r) => r.json())
      .then(setExamples)
      .catch(() => setExamples({}));
  }, []);

  const current = scripts.find((s) => s.name === script);
  const command = current.command.replace('<target>', target);

  const copyCommand = async () => {
    if (typeof window !== 'undefined') {
      try {
        await navigator.clipboard.writeText(command);
      } catch (e) {
        // ignore
      }
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full text-white">
      <div className="md:w-1/2 p-4 bg-ub-dark overflow-y-auto">
        <h1 className="text-lg mb-4">Nmap NSE Demo</h1>
        <div className="mb-4">
          <label className="block text-sm mb-1" htmlFor="target">Target</label>
          <input
            id="target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-2 text-black"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1" htmlFor="script">Script</label>
          <select
            id="script"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="w-full p-2 text-black"
          >
            {scripts.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <p className="mb-4 text-sm">{current.description}</p>
        <div className="flex items-center mb-4">
          <pre className="flex-1 bg-black text-green-400 p-2 rounded overflow-auto">
            {command}
          </pre>
          <button
            type="button"
            onClick={copyCommand}
            className="ml-2 px-2 py-1 bg-ub-grey text-black rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
          >
            Copy
          </button>
        </div>
      </div>
      <div className="md:w-1/2 p-4 bg-black overflow-y-auto">
        <h2 className="text-lg mb-2">Example output</h2>
        <pre className="whitespace-pre-wrap text-green-400">
          {examples[script] || 'Select a script to view sample output.'}
        </pre>
      </div>
    </div>
  );
};

export default NmapNSEApp;

export const displayNmapNSE = () => <NmapNSEApp />;
