import React, { useMemo, useState } from 'react';
import categories from './scripts.json';

const categoryNames = Object.keys(categories);

const NmapNSEApp = () => {
  const [target, setTarget] = useState('');
  const [category, setCategory] = useState(categoryNames[0]);
  const [script, setScript] = useState(categories[category][0].name);

  const scripts = useMemo(() => categories[category], [category]);
  const selected = useMemo(
    () => scripts.find((s) => s.name === script) || scripts[0],
    [scripts, script]
  );

  const command = `nmap --script ${script} ${target || '<target>'}`;

  const copyCommand = () => {
    try {
      navigator.clipboard.writeText(command);
    } catch (e) {
      // ignore clipboard errors
    }
  };

  return (
    <div className="h-full w-full flex flex-col p-4 bg-ub-cool-grey text-white">
      <div className="mb-4 space-y-2">
        <input
          className="w-full p-2 rounded text-black"
          type="text"
          placeholder="Target host"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <select
          aria-label="category select"
          className="w-full p-2 rounded text-black"
          value={category}
          onChange={(e) => {
            const c = e.target.value;
            setCategory(c);
            setScript(categories[c][0].name);
          }}
        >
          {categoryNames.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          aria-label="script select"
          className="w-full p-2 rounded text-black"
          value={script}
          onChange={(e) => setScript(e.target.value)}
        >
          {scripts.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <p className="text-sm">{selected.description}</p>
        <div className="flex items-center space-x-2">
          <code className="flex-grow bg-black text-green-400 p-2 rounded">
            {command}
          </code>
          <button
            onClick={copyCommand}
            className="px-2 py-1 bg-blue-600 rounded"
          >
            Copy
          </button>
        </div>
        <p className="text-xs text-yellow-400">
          Commands are examples only. Do not scan networks without permission.
        </p>
      </div>
      <div className="flex-grow">
        <h2 className="font-bold mb-2">Example Output</h2>
        <pre className="h-full overflow-auto bg-black text-green-400 p-2 rounded">
          {selected.example}
        </pre>
      </div>
    </div>
  );
};

export default NmapNSEApp;

export const displayNmapNSE = () => {
  return <NmapNSEApp />;
};
