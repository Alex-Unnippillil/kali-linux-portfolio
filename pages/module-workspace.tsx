import React, { useState, useMemo, useCallback, useRef } from 'react';
import usePersistentState from '../hooks/usePersistentState';
import { setValue, getAll } from '../utils/moduleStore';
import appsConfig from '../apps.config';

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

type ScreenDescriptor = {
  (...args: unknown[]): React.ReactNode;
  prefetch?: () => void;
};

interface DesktopAppMeta {
  id: string;
  screen?: ScreenDescriptor;
}

const PREFETCH_LIMIT = 4;

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

  const appPrefetchers = useMemo(() => {
    const map = new Map<string, ScreenDescriptor>();
    (appsConfig as DesktopAppMeta[]).forEach((app) => {
      if (app && typeof app.id === 'string' && typeof app.screen === 'function') {
        map.set(app.id, app.screen as ScreenDescriptor);
      }
    });
    return map;
  }, []);

  const prefetchedRef = useRef<Set<string>>(new Set());

  const prefetchFrequentApps = useCallback(() => {
    if (typeof window === 'undefined' || appPrefetchers.size === 0) return;

    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem('frequentApps');
    } catch {
      stored = null;
    }

    if (!stored) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      return;
    }

    if (!Array.isArray(parsed)) return;

    let prefetchedCount = 0;
    for (const raw of parsed) {
      if (prefetchedCount >= PREFETCH_LIMIT) break;
      if (!raw || typeof raw !== 'object') continue;
      const id = (raw as { id?: unknown }).id;
      if (typeof id !== 'string' || prefetchedRef.current.has(id)) continue;
      const screen = appPrefetchers.get(id);
      if (screen && typeof screen.prefetch === 'function') {
        try {
          screen.prefetch();
          prefetchedRef.current.add(id);
          prefetchedCount += 1;
        } catch {
          // ignore prefetch errors
        }
      }
    }
  }, [appPrefetchers]);

  const selectWorkspaceByName = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      prefetchFrequentApps();
      setCurrentWorkspace(trimmed);
    },
    [prefetchFrequentApps],
  );

  const addWorkspace = useCallback(() => {
    const name = newWorkspace.trim();
    if (!name) return;
    if (!workspaces.includes(name)) {
      setWorkspaces([...workspaces, name]);
    }
    selectWorkspaceByName(name);
    setNewWorkspace('');
  }, [newWorkspace, workspaces, setWorkspaces, selectWorkspaceByName]);

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
    <div className="p-4 space-y-4 bg-ub-cool-grey text-white min-h-screen">
      <section className="space-y-2">
        <h1 className="text-xl font-semibold">Workspaces</h1>
        <div className="flex gap-2">
          <input
            value={newWorkspace}
            onChange={(e) => setNewWorkspace(e.target.value)}
            placeholder="New workspace"
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
              onClick={() => selectWorkspaceByName(ws)}
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              {selected.options.map((opt) => (
                <div key={opt.name}>
                  <label className="block text-sm">
                    {opt.name} {opt.required ? '*' : ''}
                    <input
                      value={optionValues[opt.name]}
                      onChange={(e) =>
                        setOptionValues({
                          ...optionValues,
                          [opt.name]: e.target.value,
                        })
                      }
                      className="mt-1 w-full p-1 rounded text-black"
                    />
                  </label>
                </div>
              ))}
              <button
                onClick={runCommand}
                className="px-2 py-1 bg-green-600 rounded text-black"
              >
                Run
              </button>
              {result && (
                <div className="flex items-start gap-2">
                  <pre
                    className="flex-1 bg-black text-green-400 p-2 overflow-auto font-mono"
                    role="log"
                  >
                    {result}
                  </pre>
                  <button
                    onClick={() =>
                      navigator.clipboard?.writeText(result)
                    }
                    className="px-2 py-1 text-sm rounded bg-gray-700"
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
  );
};

export default ModuleWorkspace;

