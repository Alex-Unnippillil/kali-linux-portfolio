import React, { useEffect, useMemo, useState } from 'react';
import modules from './modules.json';
import usePersistentState from '../../usePersistentState';

const banner = `Metasploit Framework Console (mock)\nType 'search <term>' to search modules.`;

const MetasploitApp = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = usePersistentState('metasploit-history', banner);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  // Refresh modules list in the background on mount
  useEffect(() => {
    fetch('/api/metasploit').catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return [];
    return modules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [query]);

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
      <div className="p-2">
        <input
          className="w-full bg-ub-grey text-white p-1 rounded"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search modules"
          spellCheck={false}
        />
        {query && (
          <ul className="mt-2 max-h-40 overflow-auto text-xs">
            {filtered.map((m) => (
              <li key={m.name} className="mb-1">
                <span className="font-mono">{m.name}</span> - {m.description}
              </li>
            ))}
          </ul>
        )}
      </div>
      <pre className="flex-grow bg-black text-green-400 p-2 overflow-auto whitespace-pre-wrap">
        {loading ? 'Running...' : output}
      </pre>
    </div>
  );
};

export default MetasploitApp;

export const displayMetasploit = () => <MetasploitApp />;
