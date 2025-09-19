'use client';

import React, { useState } from 'react';
import seedrandom from 'seedrandom';
import modules from '@/data/metasploit/modules.json';
import usePersistentState from '../../../hooks/usePersistentState';

interface ModuleInfo {
  name: string;
  description?: string;
}

interface SavedSession {
  name: string;
  output: string;
}

const TargetEmulator: React.FC = () => {
  const [selected, setSelected] = useState<ModuleInfo | null>(null);
  const [output, setOutput] = useState('Select a module to run.');
  const [sessions, setSessions] = usePersistentState<SavedSession[]>(
    'metasploit-sessions',
    [],
  );

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mod = modules.find((m: ModuleInfo) => m.name === e.target.value) || null;
    setSelected(mod);
    if (mod) {
      const rng = seedrandom(mod.name);
      const ip = Array.from({ length: 4 }, () => Math.floor(rng() * 256)).join('.');
      const port = Math.floor(rng() * 65535);
      const sessionId = Math.floor(rng() * 1000);
      const lines = [
        `msf6 > use ${mod.name}`,
        `[*] Connecting to ${ip}:${port}`,
        `[*] Module loaded successfully`,
        `msf6 exploit(${mod.name}) > run`,
        `[*] Session ${sessionId} opened`
      ];
      const text = lines.join('\n');
      setOutput(text);
      setSessions((prev) => [
        ...prev.filter((s) => s.name !== mod.name),
        { name: mod.name, output: text },
      ]);
    } else {
      setOutput('Select a module to run.');
    }
  };

  const reset = () => {
    setSelected(null);
    setOutput('Select a module to run.');
  };

  const reopen = (name: string) => {
    const sess = sessions.find((s) => s.name === name);
    const mod = modules.find((m: ModuleInfo) => m.name === name) || null;
    setSelected(mod);
    setOutput(sess ? sess.output : 'Select a module to run.');
  };

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center space-x-2">
        <label className="sr-only" htmlFor="module-select">Select module</label>
        <select
          id="module-select"
          aria-label="Select module"
          value={selected?.name || ''}
          onChange={handleSelect}
          className="border p-1"
        >
          <option value="">Select a module</option>
          {modules.slice(0, 50).map((m: ModuleInfo) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
        <button
          onClick={reset}
          className="border px-2 py-1"
        >
          Reset
        </button>
        {sessions.length > 0 && (
          <select
            aria-label="Reopen session"
            onChange={(e) => reopen(e.target.value)}
            className="border p-1"
            defaultValue=""
          >
            <option value="">Reopen session</option>
            {sessions.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <pre
        data-testid="session-output"
        className="bg-black text-green-500 p-2 h-48 overflow-auto"
      >
        {output}
      </pre>
    </div>
  );
};

export default TargetEmulator;

