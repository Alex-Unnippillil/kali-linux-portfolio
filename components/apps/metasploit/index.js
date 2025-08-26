import React, { useMemo, useState } from 'react';
import modules from './modules.json';

const warning =
  'For educational use only. Do not attack systems without explicit permission.';

const MetasploitApp = () => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return modules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [query]);

  const copyConfig = () => {
    if (selected && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(selected.config);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white p-2">
      <input
        className="w-full bg-ub-grey text-white p-1 rounded"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search modules"
        spellCheck={false}
      />
      <ul className="mt-2 max-h-40 overflow-auto text-xs">
        {filtered.map((m) => (
          <li
            key={m.name}
            className="mb-1 cursor-pointer hover:underline"
            onClick={() => setSelected(m)}
          >
            <span className="font-mono">{m.name}</span> - {m.description}
          </li>
        ))}
      </ul>
      {selected && (
        <div className="mt-4 text-xs flex flex-col gap-2">
          <h3 className="font-bold">{selected.name}</h3>
          <p>{selected.description}</p>
          <div>
            <h4 className="font-bold mb-1">Sample Transcript</h4>
            <pre className="bg-black text-green-400 p-2 overflow-auto whitespace-pre-wrap">
              {selected.transcript}
            </pre>
          </div>
          <div>
            <h4 className="font-bold mb-1">Configuration</h4>
            <div className="relative">
              <pre className="bg-black text-green-400 p-2 overflow-auto whitespace-pre-wrap">
                {selected.config}
              </pre>
              <button
                onClick={copyConfig}
                className="absolute top-1 right-1 px-2 py-1 bg-ub-orange rounded"
              >
                Copy
              </button>
            </div>
            <p className="mt-1 text-red-400">Warning: {warning}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetasploitApp;

export const displayMetasploit = () => <MetasploitApp />;

