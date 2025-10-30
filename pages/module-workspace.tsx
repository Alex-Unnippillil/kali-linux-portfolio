import React, { useState, useMemo, useCallback } from 'react';
import Meta from '../components/SEO/Meta';
import usePersistentState from '../hooks/usePersistentState';
import { setValue, getAll } from '../utils/moduleStore';
import StarterWizard from '../components/workspaces/StarterWizard';

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

const moduleListJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Alex Unnippillil Project Modules',
  description:
    'A curated list of simulated security modules demonstrating Alex Unnippillil’s approach to tooling design and UX. Each entry highlights inputs, outputs, and saved workspace states.',
  url: 'https://unnippillil.com/module-workspace',
  numberOfItems: modules.length,
  itemListElement: modules.map((module, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: module.name,
    url: `https://unnippillil.com/module-workspace#${module.id}`,
    item: {
      '@type': 'SoftwareApplication',
      name: module.name,
      description: module.description,
      applicationCategory: 'SecurityApplication',
    },
  })),
};

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

  const resetOptionValues = useCallback(() => {
    if (!selected) return;
    const initial: Record<string, string> = {};
    selected.options.forEach((o) => {
      initial[o.name] = '';
    });
    setOptionValues(initial);
    setResult('');
  }, [selected]);

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
    <>
      <Meta
        title="Project Modules"
        description="Experiment with Alex Unnippillil’s simulated security modules, configure inputs, and generate repeatable results for portfolio walkthroughs."
        canonical="/module-workspace"
        jsonLd={[moduleListJsonLd]}
      />
      <div className="p-4 space-y-4 bg-ub-cool-grey text-white min-h-screen">
        <StarterWizard />
        <section className="space-y-2">
          <h1 className="text-xl font-semibold">Workspaces</h1>
          <div className="flex gap-2">
            <input
              value={newWorkspace}
              onChange={(e) => setNewWorkspace(e.target.value)}
              placeholder="New workspace"
              aria-label="New workspace name"
              className="p-1 rounded text-black"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filteredModules.map((m) => (
              <button
                key={m.id}
                onClick={() => selectModule(m)}
                className="p-3 text-left bg-ub-grey rounded border border-gray-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange"
              >
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-sm text-gray-300 line-clamp-2 sm:line-clamp-none">
                  {m.description}
                </p>
              </button>
            ))}
          </div>
          {selected && (
            <div className="space-y-3">
              <details className="overflow-hidden rounded border border-gray-700 bg-ub-grey/80">
                <summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold tracking-wide transition hover:bg-ub-grey">
                  Command Composer · {selected.name}
                </summary>
                <div className="space-y-3 border-t border-gray-700 bg-ub-grey/70 px-3 py-3">
                  {selected.options.map((opt) => {
                    const inputId = `option-${selected.id}-${opt.name}`;
                    return (
                      <div key={opt.name} className="space-y-1">
                        <label className="block text-sm" htmlFor={inputId}>
                          {opt.name} {opt.required ? '*' : ''}
                        </label>
                        <input
                          id={inputId}
                          aria-label={`${opt.name} option`}
                          value={optionValues[opt.name]}
                          onChange={(e) =>
                            setOptionValues({
                              ...optionValues,
                              [opt.name]: e.target.value,
                            })
                          }
                          className="w-full rounded border border-gray-600 bg-white/90 p-2 text-black focus:outline-none focus:ring-2 focus:ring-ub-orange"
                        />
                      </div>
                    );
                  })}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={runCommand}
                      aria-label="Run"
                      className="rounded bg-green-600 px-3 py-2 text-sm font-semibold text-black transition hover:bg-green-500"
                    >
                      Run Command
                    </button>
                    <button
                      onClick={resetOptionValues}
                      className="rounded border border-gray-600 px-3 py-2 text-sm font-semibold text-gray-200 transition hover:bg-gray-700"
                    >
                      Clear Inputs
                    </button>
                  </div>
                </div>
              </details>
              {result && (
                <div className="space-y-2 rounded border border-gray-700 bg-black/70 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold">Command Output</h3>
                    <button
                      onClick={() => navigator.clipboard?.writeText(result)}
                      className="self-start rounded bg-gray-700 px-3 py-1 text-sm font-medium transition hover:bg-gray-600"
                    >
                      Copy Output
                    </button>
                  </div>
                  <pre
                    className="max-h-64 overflow-auto rounded bg-black p-2 font-mono text-green-400"
                    role="log"
                  >
                    {result}
                  </pre>
                </div>
              )}
              {Object.keys(storeData).length > 0 && (
                <div className="space-y-2 rounded border border-gray-700 bg-ub-grey/80 p-3">
                  <h3 className="font-semibold">Stored Values</h3>
                  <ul className="space-y-1 text-xs">
                    {Object.entries(storeData).map(([k, v]) => (
                      <li key={k} className="break-words">
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
    </>
  );
};

export default ModuleWorkspace;

