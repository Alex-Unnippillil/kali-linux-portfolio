import React, { useState } from 'react';

interface Module {
  id: string;
  name: string;
  description: string;
  tags: string[];
  log: string;
  results: { target: string; status: string }[];
  data: string;
  inputs: string[];
  lab: string;
}

const modules: Module[] = [
  {
    id: 'port-scan',
    name: 'Port Scanner',
    description: 'Scans for open network ports',
    tags: ['network', 'scanner'],
    log: 'Starting port scan...\nFound open port 22 on 192.168.0.1\nScan complete.',
    results: [
      { target: '192.168.0.1', status: 'Ports 22,80 open' },
      { target: '192.168.0.2', status: 'No open ports' },
    ],
    data: 'Open ports discovered on the target host',
    inputs: ['Target IP or range'],
    lab: 'https://tryhackme.com/room/rpnmap',
  },
  {
    id: 'bruteforce',
    name: 'Brute Force',
    description: 'Attempts common passwords',
    tags: ['attack', 'password'],
    log: 'Starting brute force...\nTried 100 passwords\nNo valid credentials found.',
    results: [
      { target: 'admin@example.com', status: 'Login failed' },
      { target: 'root@example.com', status: 'Login failed' },
    ],
    data: 'Accounts that accept guessed credentials',
    inputs: ['Target service or account', 'Password list'],
    lab: 'https://tryhackme.com/room/hydra',
  },
  {
    id: 'vuln-check',
    name: 'Vuln Check',
    description: 'Checks for known CVEs',
    tags: ['vulnerability', 'scanner'],
    log: 'Checking for vulnerabilities...\nCVE-2024-1234 found on host1\nCheck complete.',
    results: [
      { target: 'host1', status: 'CVE-2024-1234' },
      { target: 'host2', status: 'No issues' },
    ],
    data: 'Known vulnerabilities present on a host',
    inputs: ['Target host'],
    lab: 'https://tryhackme.com/room/vulnversity',
  },
];

const PopularModules: React.FC = () => {
  const [filter, setFilter] = useState<string>('');
  const [selected, setSelected] = useState<Module | null>(null);

  const tags = Array.from(new Set(modules.flatMap((m) => m.tags)));
  const filtered = filter ? modules.filter((m) => m.tags.includes(filter)) : modules;

  return (
    <div className="p-4 space-y-4 bg-ub-cool-grey text-white min-h-screen">
      <p className="text-sm">All modules are simulated; no network activity occurs.</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('')}
          className={`px-2 py-1 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            filter === '' ? 'bg-blue-600' : 'bg-gray-700'
          }`}
        >
          All
        </button>
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-2 py-1 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${
              filter === t ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m)}
            className="p-3 text-left bg-ub-grey rounded border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <h3 className="font-semibold">{m.name}</h3>
            <p className="text-sm text-gray-300">{m.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {m.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded bg-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="space-y-2">
          <pre className="bg-black text-green-400 p-2 overflow-auto" role="log">
            {selected.log}
          </pre>
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1">Target</th>
                <th className="border px-2 py-1">Result</th>
              </tr>
            </thead>
            <tbody>
              {selected.results.map((r) => (
                <tr key={r.target}>
                  <td className="border px-2 py-1">{r.target}</td>
                  <td className="border px-2 py-1">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-sm">
            <h4 className="font-semibold mt-2">Data Retrieved</h4>
            <p>{selected.data}</p>
            <h4 className="font-semibold mt-2">Required Inputs</h4>
            <ul className="list-disc list-inside">
              {selected.inputs.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <a
              href={selected.lab}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-300"
            >
              Practice Lab
            </a>
          </div>
        </div>
      ) : (
        <p>Select a module to view logs and results.</p>
      )}
    </div>
  );
};

export default PopularModules;

