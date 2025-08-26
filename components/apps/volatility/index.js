import React, { useState } from 'react';

// Sample plugin data with descriptions and pre-generated output
const plugins = [
  {
    name: 'pslist',
    description: 'List running processes.',
    output: `Offset(V)  PID   PPID  Image
0x823c89c0 4     0     System
0x823d0d40 584   4     smss.exe
0x822d3520 620   584   csrss.exe`,
  },
  {
    name: 'pstree',
    description: 'Process list in tree form.',
    output: `System(4)
 smss.exe(584)
  csrss.exe(620)
   wininit.exe(716)`,
  },
  {
    name: 'dlllist',
    description: 'List loaded DLLs for a process.',
    output: `explorer.exe pid: 1484
Base        Size      Path
0x10000000  0x3d000   C:\\Windows\\System32\\KERNEL32.DLL`,
  },
  {
    name: 'netscan',
    description: 'Scan for network connections.',
    output: `Offset(P)  Proto  Local Address   Foreign Address  State
0x2f8a2760 TCP    0.0.0.0:135  192.168.1.10:49213 LISTENING`,
  },
  {
    name: 'filescan',
    description: 'Scan for file objects.',
    output: `Offset(P)   Name
0x2ffdfb60  \??\\C:\\Users\\Admin\\ntuser.dat`,
  },
];

const profileText = `Memory profiles tell Volatility the operating system and version of a \
memory sample. Profiles are typically named like Win7SP1x64 or WinXPSP2x86 \
and ensure plugins interpret structures correctly.`;

const VolatilityApp = () => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = plugins.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-ub-cool-grey text-white">
      {/* Plugin list */}
      <div className="md:w-1/3 p-4 border-b md:border-b-0 md:border-r border-gray-700 flex flex-col">
        <input
          type="text"
          placeholder="Search plugins..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-2 px-2 py-1 text-black rounded"
        />
        <div className="overflow-auto flex-1 space-y-2">
          {filtered.map((p) => (
            <div
              key={p.name}
              onClick={() => setSelected(p)}
              className="cursor-pointer hover:bg-gray-700 p-2 rounded"
            >
              <div className="font-bold">{p.name}</div>
              <div className="text-xs text-gray-300">{p.description}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-gray-400">No plugins match your search.</div>
          )}
        </div>
      </div>

      {/* Output and profile panel */}
      <div className="flex-1 flex flex-col">
        <pre className="flex-1 overflow-auto p-4 bg-black text-green-400 whitespace-pre-wrap">
          {selected ? selected.output : 'Select a plugin to view sample output.'}
        </pre>
        <div className="p-4 bg-ub-cool-grey border-t border-gray-700 text-sm">
          <h2 className="font-bold mb-1">Memory Profiles</h2>
          <p>{profileText}</p>
        </div>
      </div>
    </div>
  );
};

export default VolatilityApp;

export const displayVolatility = () => {
  return <VolatilityApp />;
};

