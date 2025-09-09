'use client';
import React, { useState } from 'react';
import cmds from './commands.json';

interface Cmd { cmd: string; output: string; }

const Emulator: React.FC = () => {
  const data: Cmd[] = cmds as Cmd[];
  const [history, setHistory] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const run = () => {
    const entry = data.find((c) => c.cmd === input);
    const out = entry ? entry.output : 'Unknown command';
    setHistory((h) => [...h, `> ${input}`, out]);
    setInput('');
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') run();
  };

  return (
    <div className="p-4 bg-gray-900 text-white h-full">
      <h1 className="text-xl mb-2">Emulator</h1>
      <div className="bg-black text-green-400 p-2 h-40 overflow-y-auto mb-2 font-mono text-sm">
        {history.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      <input
        className="w-full p-1 bg-gray-800 rounded text-white font-mono"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Enter command"
        aria-label="command input"
      />
    </div>
  );
};

export default Emulator;
