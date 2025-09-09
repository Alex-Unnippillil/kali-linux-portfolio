import React, { useState, useMemo, useCallback } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { setValue, getAll } from '../utils/moduleStore';
import modulesData from '../data/module-index.json';

interface ModuleOption {
  name: string;
  label: string;
}

interface Module {
  id: string;
  name: string;
  description: string;
  tags: string[];
  options: ModuleOption[];
  log: { level: string; message: string }[];
  results: { target: string; status: string }[];
  data: string;
  inputs: string[];
  lab: string;
}

const modules: Module[] = modulesData as Module[];

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
  const [command, setCommand] = useState('');
  const [logOutput, setLogOutput] = useState<Module['log']>([]);
  const [scanResults, setScanResults] = useState<Module['results']>([]);
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
    setCommand('');
    setLogOutput([]);
    setScanResults([]);
  }, []);

  const runCommand = useCallback(() => {
    if (!selected) return;
    const opts = selected.options
      .map((o) => `${o.name}=${optionValues[o.name] || ''}`)
      .join(' ');
    const cmd = `${selected.id} ${opts}`.trim();
    setCommand(cmd);
    setLogOutput(selected.log);
    setScanResults(selected.results);
    setValue(selected.id, cmd);
    setStoreData(getAll());
  }, [selected, optionValues]);

  return (
    <div className="p-space-2 space-y-space-2 bg-ub-cool-grey text-white min-h-screen">
      <section className="space-y-space-1">
        <h1 className="text-xl font-semibold">Workspaces</h1>
        <div className="flex gap-space-1">
          <input
            value={newWorkspace}
            onChange={(e) => setNewWorkspace(e.target.value)}
            placeholder="New workspace"
            className="p-space-1 rounded text-black"
          />
          <button
            onClick={addWorkspace}
            className="px-space-1 py-space-1 bg-ub-orange rounded text-black"
          >
            Create
          </button>
        </div>
        <div className="flex flex-wrap gap-space-1">
          {workspaces.map((ws) => (
            <button
              key={ws}
              onClick={() => setCurrentWorkspace(ws)}
              className={`px-space-1 py-space-1 rounded ${
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
          <div className="flex flex-wrap gap-space-1">
            <button
              onClick={() => setFilter('')}
              className={`px-space-1 py-space-1 text-sm rounded ${
                filter === '' ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              All
            </button>
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-space-1 py-space-1 text-sm rounded ${
                  filter === t ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid gap-space-2 sm:grid-cols-2 lg:grid-cols-3">
            {filteredModules.map((m) => (
              <button
                key={m.id}
                onClick={() => selectModule(m)}
                className="p-space-3 text-left bg-ub-grey rounded border border-gray-700"
              >
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-sm text-gray-300">{m.description}</p>
              </button>
            ))}
          </div>
          {selected && (
            <div className="space-y-space-1">
              <h2 className="font-semibold">Command Composer</h2>
              {selected.options.map((opt) => (
                <div key={opt.name}>
                  <label className="block text-sm">
                    {opt.label.toUpperCase()}
                    <input
                      value={optionValues[opt.name]}
                      onChange={(e) =>
                        setOptionValues({
                          ...optionValues,
                          [opt.name]: e.target.value,
                        })
                      }
                      className="mt-space-1 w-full p-space-1 rounded text-black"
                    />
                  </label>
                </div>
              ))}
              <button
                onClick={runCommand}
                className="px-space-1 py-space-1 bg-green-600 rounded text-black"
              >
                Run
              </button>
              {command && (
                <div className="flex items-start gap-space-1">
                  <pre className="flex-1 bg-black text-green-400 p-space-1 overflow-auto font-mono">
                    $ {command}
                  </pre>
                  <button
                    onClick={() => navigator.clipboard?.writeText(command)}
                    className="px-space-1 py-space-1 text-sm rounded bg-gray-700"
                  >
                    Copy
                  </button>
                </div>
              )}
              {logOutput.length > 0 && (
                <ul
                  className="bg-black text-xs p-space-1 font-mono space-y-0.5"
                  role="log"
                >
                  {logOutput.map((l, i) => (
                    <li key={i}>{l.message}</li>
                  ))}
                </ul>
              )}
              {scanResults.length > 0 && (
                <table className="w-full text-xs" role="table">
                  <thead>
                    <tr>
                      <th className="text-left">Target</th>
                      <th className="text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResults.map((r, i) => (
                      <tr key={i}>
                        <td className="pr-space-1">{r.target}</td>
                        <td>{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {selected && (
                <div className="space-y-space-1">
                  <p>{selected.data}</p>
                  <ul className="list-disc list-inside text-xs">
                    {selected.inputs.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                  {selected.lab && (
                    <a
                      href={selected.lab}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline text-xs"
                    >
                      Practice Lab
                    </a>
                  )}
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
  );
};

export default ModuleWorkspace;

