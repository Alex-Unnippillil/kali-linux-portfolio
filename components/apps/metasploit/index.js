import React, { useState } from 'react';
import modules from './modules.json';

const banner = `Metasploit Framework Console (mock)\nType 'search <term>' to search modules.`;

const escapeRegExp = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MetasploitApp = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState(banner);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const keywords = search
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const filteredModules = modules.filter((m) =>
    keywords.every(
      (kw) =>
        m.name.toLowerCase().includes(kw) ||
        m.description.toLowerCase().includes(kw)
    )
  );

  const highlight = (text) => {
    if (!keywords.length) return text;
    const regex = new RegExp(`(${keywords.map(escapeRegExp).join('|')})`, 'gi');
    return text.split(regex).map((part, i) =>
      i % 2 === 1 ? (
        <mark key={i} className="bg-ub-orange text-black">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const runCommand = async () => {
    const cmd = command.trim();
    if (!cmd) return;
    setLoading(true);
    try {
      const res = await fetch('/api/metasploit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      setOutput((prev) => `${prev}\nmsf6 > ${cmd}\n${data.output || ''}`);
    } catch (e) {
      setOutput((prev) => `${prev}\nError: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white">
      <div className="p-2">
        <input
          className="w-full bg-ub-grey text-white p-1 rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search modules"
          spellCheck={false}
        />
        <ul className="mt-2 max-h-40 overflow-auto">
          {filteredModules.map((m) => (
            <li key={m.name} className="mb-1">
              <div className="font-mono">{highlight(m.name)}</div>
              <div className="text-sm text-ub-warm-grey">
                {highlight(m.description)}
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex p-2">
        <input
          className="flex-grow bg-ub-grey text-white p-1 rounded"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runCommand();
          }}
          placeholder="msfconsole command"
          spellCheck={false}
        />
        <button
          onClick={runCommand}
          className="ml-2 px-2 py-1 bg-ub-orange rounded"
        >
          Run
        </button>
      </div>
      <pre className="flex-grow bg-black text-green-400 p-2 overflow-auto whitespace-pre-wrap">
        {loading ? 'Running...' : output}
      </pre>
    </div>
  );
};

export default MetasploitApp;

export const displayMetasploit = () => <MetasploitApp />;
