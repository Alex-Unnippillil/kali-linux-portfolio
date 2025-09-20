import React, { useState, useMemo, useCallback } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { setValue, getAll } from '../utils/moduleStore';

interface ModuleOption {
  name: string;
  required: boolean;
}

interface Module {
  id: string;
  name: string;
  description: string;
  tags: string[];
  options: ModuleOption[];
  sample: string;
}

const modules: Module[] = [
  {
    id: 'port-scan',
    name: 'Port Scanner',
    description: 'Scans for open network ports',
    tags: ['network', 'scanner'],
    options: [{ name: 'TARGET', required: true }],
    sample: '[+] 192.168.0.1: Ports 22,80 open',
  },
  {
    id: 'bruteforce',
    name: 'Brute Force',
    description: 'Attempts common passwords',
    tags: ['attack', 'password'],
    options: [
      { name: 'TARGET', required: true },
      { name: 'WORDLIST', required: true },
    ],
    sample: '[-] No valid password found',
  },
  {
    id: 'vuln-check',
    name: 'Vuln Check',
    description: 'Checks for known CVEs',
    tags: ['vulnerability', 'scanner'],
    options: [{ name: 'HOST', required: true }],
    sample: '[+] CVE-2024-1234 present on host',
  },
];

const ModuleWorkspace: React.FC = () => {
  const [workspaces, setWorkspaces] = usePersistentState<string[]>(
    'workspaces',
    [],
  );
  const [newWorkspace, setNewWorkspace] = useState('');
  const [currentWorkspace, setCurrentWorkspace] = useState('');

  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Module | null>(null);
  const [optionValues, setOptionValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState('');
  const [storeData, setStoreData] = useState<Record<string, string>>({});

  const tags = useMemo(
    () => Array.from(new Set(modules.flatMap((m) => m.tags))),
    [],
  );
  const filteredModules = useMemo(
    () => (filter ? modules.filter((m) => m.tags.includes(filter)) : modules),
    [filter],
  );

  const addWorkspace = useCallback(() => {
    const name = newWorkspace.trim();
    if (!name) return;
    if (!workspaces.includes(name)) {
      setWorkspaces([...workspaces, name]);
    }
    setCurrentWorkspace(name);
    setNewWorkspace('');
  }, [newWorkspace, workspaces, setWorkspaces]);

  const selectModule = useCallback((mod: Module) => {
    setSelected(mod);
    const initial: Record<string, string> = {};
    mod.options.forEach((o) => {
      initial[o.name] = '';
    });
    setOptionValues(initial);
    setResult('');
  }, []);

  const runCommand = useCallback(() => {
    if (!selected) return;
    const opts = selected.options
      .map((o) => `${o.name}=${optionValues[o.name] || ''}`)
      .join(' ');
    const cmd = `${selected.id} ${opts}`.trim();
    const res = `$ ${cmd}\n${selected.sample}`;
    setResult(res);
    setValue(selected.id, res);
    setStoreData(getAll());
  }, [selected, optionValues]);

  return (
    <div className="min-h-screen bg-ub-cool-grey p-4 text-white md:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="space-y-2">
          <h1 className="text-xl font-semibold">Workspaces</h1>
          <div className="flex gap-2">
            <label htmlFor="workspace-name" className="sr-only">
              Workspace name
            </label>
            <input
              id="workspace-name"
              value={newWorkspace}
              onChange={(e) => setNewWorkspace(e.target.value)}
              placeholder="New workspace"
              className="p-1 rounded text-black"
              aria-label="New workspace name"
            />
            <button
              onClick={addWorkspace}
              className="px-2 py-1 bg-ub-orange rounded text-black"
            >
              Create
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {workspaces.map((ws) => (
              <button
                key={ws}
                onClick={() => setCurrentWorkspace(ws)}
                className={`px-2 py-1 rounded ${
                  currentWorkspace === ws ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                {ws}
              </button>
            ))}
          </div>
        </section>
        {currentWorkspace && (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('')}
                className={`px-2 py-1 text-sm rounded ${
                  filter === '' ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                All
              </button>
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-2 py-1 text-sm rounded ${
                    filter === t ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredModules.map((m) => (
              <button
                key={m.id}
                onClick={() => selectModule(m)}
                className="p-3 text-left bg-ub-grey rounded border border-gray-700"
              >
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-sm text-gray-300">{m.description}</p>
              </button>
            ))}
          </div>
          {selected && (
            <div className="space-y-2">
              <h2 className="font-semibold">Command Composer</h2>
              {selected.options.map((opt) => {
                const optionId = `module-option-${opt.name
                  .toLowerCase()
                  .replace(/\s+/g, '-')}`;
                return (
                  <div key={opt.name}>
                    <label className="block text-sm" htmlFor={optionId}>
                      {opt.name} {opt.required ? '*' : ''}
                    </label>
                    <input
                      id={optionId}
                      value={optionValues[opt.name]}
                      onChange={(e) =>
                        setOptionValues({
                          ...optionValues,
                          [opt.name]: e.target.value,
                        })
                      }
                      className="mt-1 w-full p-1 rounded text-black"
                      aria-label={`${opt.name}${opt.required ? ' (required)' : ''}`}
                    />
                  </div>
                );
              })}
              <button
                onClick={runCommand}
                className="px-2 py-1 bg-green-600 rounded text-black"
              >
                Run
              </button>
              {result && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <pre
                    className="flex-1 min-w-0 overflow-auto bg-black p-2 font-mono text-green-400"
                    role="log"
                  >
                    {result}
                  </pre>
                  <button
                    onClick={() =>
                      navigator.clipboard?.writeText(result)
                    }
                    className="self-start rounded bg-gray-700 px-2 py-1 text-sm sm:self-auto"
                  >
                    Copy
                  </button>
                </div>
              )}
              {Object.keys(storeData).length > 0 && (
                <div>
                  <h3 className="font-semibold">Stored Values</h3>
                  <ul className="text-xs">
                    {Object.entries(storeData).map(([k, v]) => (
                      <li key={k}>
                        <strong>{k}</strong>: {v}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
};

export default ModuleWorkspace;

