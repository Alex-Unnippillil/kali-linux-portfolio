'use client';

import React, { useEffect, useState } from 'react';

interface ModuleEntry {
  name: string;
  description: string;
  type?: string;
}

const ModuleCatalog: React.FC = () => {
  const [modules, setModules] = useState<ModuleEntry[]>([]);
  const [selected, setSelected] = useState<ModuleEntry | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/metasploit-modules.json');
        const data = await res.json();
        if (active) setModules(data);
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const steps = selected
    ? [
        `search ${selected.name}`,
        `use ${selected.name}`,
        'set RHOST <target>',
        'run'
      ]
    : [];

  return (
    <section className="p-4 bg-gray-900 text-white">
      <h2 className="text-lg font-bold mb-4">Module Catalog</h2>
      <div className="flex flex-col md:flex-row gap-4">
        <ul className="md:w-1/2 h-64 overflow-auto border border-gray-700">
          {modules.map((m) => (
            <li key={m.name} className="p-2 border-b border-gray-800">
              <button
                onClick={() => setSelected(m)}
                className="hover:underline text-left w-full"
              >
                {m.name}
              </button>
            </li>
          ))}
        </ul>
        <div className="md:w-1/2">
          {selected ? (
            <div>
              <h3 className="font-semibold mb-2">{selected.name}</h3>
              <p className="text-sm mb-4">{selected.description}</p>
              <ol className="list-decimal list-inside space-y-1 mb-4">
                {steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <a
                href="/security-education"
                className="text-blue-400 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Legal Notice
              </a>
            </div>
          ) : (
            <p>Select a module to view details.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default ModuleCatalog;

