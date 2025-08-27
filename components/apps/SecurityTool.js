import React, { useState } from 'react';

export const CommandSnippet = ({ command }) => {
  const copy = () => navigator.clipboard?.writeText(command);
  const run = () => console.log(`Run this command in your terminal: ${command}`);
  return (
    <div className="bg-black text-green-400 p-2 rounded mb-2 flex items-center space-x-2">
      <code className="flex-1 whitespace-pre">{command}</code>
      <button
        onClick={copy}
        className="px-2 py-1 bg-gray-700 rounded"
        aria-label="copy"
      >
        Copy
      </button>
      <button
        onClick={run}
        className="px-2 py-1 bg-gray-700 rounded"
        aria-label="run"
      >
        Run in Terminal
      </button>
    </div>
  );
};

const SecurityTool = ({ name, sections, resources = [] }) => {
  const [active, setActive] = useState(sections[0]?.id);
  return (
    <div className="flex h-full w-full bg-ub-cool-grey text-white">
      <nav className="w-48 p-4 space-y-2 border-r border-gray-700">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`block w-full text-left px-2 py-1 rounded ${
              active === s.id ? 'bg-ub-orange text-black' : 'bg-gray-800'
            }`}
          >
            {s.title}
          </button>
        ))}
      </nav>
      <main className="flex-1 p-4 overflow-auto">
        {sections.find((s) => s.id === active)?.content}
        {resources.length > 0 && (
          <div className="mt-4">
            <h3 className="font-bold mb-2">Resources</h3>
            <ul className="list-disc pl-4 space-y-1">
              {resources.map((r) => (
                <li key={r.href}>
                  <a className="underline text-blue-400" href={r.href} download>
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-4 text-xs text-gray-300">
          Use {name} responsibly and only on systems you are authorized to test.
        </p>
      </main>
    </div>
  );
};

export default SecurityTool;
