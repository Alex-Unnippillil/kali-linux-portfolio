'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import MetasploitApp, {
  metasploitModules as metasploitModuleIndex,
} from '../../components/apps/metasploit';
import Toast from '../../components/ui/Toast';

interface ModuleOption {
  desc: string;
  default?: string | number | boolean;
  required?: boolean;
}

interface Module {
  name: string;
  description: string;
  type: string;
  severity: string;
  platform?: string;
  cve?: string[];
  tags?: string[];
  transcript?: string;
  disclosure_date?: string;
  teaches?: string;
  doc?: string;
  options?: Record<string, ModuleOption>;
  [key: string]: any;
}

interface TreeNode {
  [key: string]: TreeNode | Module[] | undefined;
  __modules?: Module[];
}

const typeColors: Record<string, string> = {
  auxiliary: 'bg-blue-500',
  exploit: 'bg-red-500',
  post: 'bg-green-600',
};

const severityPills: Record<string, string> = {
  critical: 'bg-red-700 text-white',
  high: 'bg-orange-600 text-white',
  medium: 'bg-yellow-400 text-gray-900',
  low: 'bg-green-600 text-white',
};

const modulesList = (metasploitModuleIndex as Module[]) || [];

const labWarnings = [
  'Operate only inside isolated lab networks that you control. Do not target external systems.',
  'All console output on this page is simulated for education. No packets leave your browser.',
  'Reset the environment between demos to avoid mixing real workflows with the mock data.',
];

const cannedConsole = `msf6 > workspace kali-lab
[*] Workspace: kali-lab (offline demo)
msf6 > db_status
[*] Connection type: demo-sqlite
[*] Status: OK (fixtures loaded)
msf6 > use exploit/windows/smb/ms17_010_eternalblue
[!] Lab warning: payloads are redacted in this simulation.
msf6 exploit(windows/smb/ms17_010_eternalblue) > run
[*] Starting simulated exploit chain...
[*] Target 10.10.10.5 answered a mock SMB probe
[*] Launching fake meterpreter session
[+] Session 1 opened (localhost -> 10.10.10.5:445) at 2024-01-01 12:00:00 +0000
[*] Note: Session artifacts are training data only.`;

function buildTree(mods: Module[]): TreeNode {
  const root: TreeNode = {};
  mods.forEach((mod) => {
    const parts = mod.name.split('/');
    let node: TreeNode = root;
    parts.forEach((part, idx) => {
      if (idx === parts.length - 1) {
        if (!node.__modules) node.__modules = [];
        node.__modules.push(mod);
      } else {
        node[part] = (node[part] as TreeNode) || {};
        node = node[part] as TreeNode;
      }
    });
  });
  return root;
}

const MetasploitPage: React.FC = () => {
  const [selected, setSelected] = useState<Module | null>(null);
  const [split, setSplit] = useState(60);
  const splitRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [builderModule, setBuilderModule] = useState<string>(
    () => modulesList[0]?.name || '',
  );
  const [builderOptions, setBuilderOptions] = useState<Record<string, string>>({});
  const [builtCommand, setBuiltCommand] = useState('');

  const allTags = useMemo(
    () => Array.from(new Set(modulesList.flatMap((m) => m.tags || []))).sort(),
    [],
  );

  const filteredModules = useMemo(
    () =>
      modulesList.filter((m) => {
        if (tag && !(m.tags || []).includes(tag)) return false;
        if (query) {
          const q = query.toLowerCase();
          return (
            m.name.toLowerCase().includes(q) ||
            m.description.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [tag, query],
  );

  const tree = useMemo(() => buildTree(filteredModules), [filteredModules]);

  const builderModuleMeta = useMemo(
    () => modulesList.find((m) => m.name === builderModule) || null,
    [builderModule],
  );

  useEffect(() => {
    if (!builderModuleMeta) {
      setBuilderOptions({});
      return;
    }
    const defaults = Object.entries(builderModuleMeta.options || {}).reduce(
      (acc, [name, opt]) => {
        acc[name] =
          opt.default !== undefined ? String(opt.default) : acc[name] || '';
        return acc;
      },
      {} as Record<string, string>,
    );
    setBuilderOptions(defaults);
  }, [builderModuleMeta]);

  useEffect(() => {
    if (selected) {
      setBuilderModule(selected.name);
    }
  }, [selected]);

  useEffect(() => {
    setBuiltCommand('');
  }, [builderModule]);

  useEffect(() => {
    setSelected(null);
  }, [query, tag]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current || !splitRef.current) return;
      const rect = splitRef.current.getBoundingClientRect();
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      setSplit(Math.min(80, Math.max(20, pct)));
    };
    const stop = () => {
      dragging.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', stop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', stop);
    };
  }, []);

  const handleOptionChange = (name: string, value: string) => {
    setBuilderOptions((prev) => ({ ...prev, [name]: value }));
  };

  const handleBuildCommand = () => {
    const moduleName = builderModule || selected?.name;
    if (!moduleName) {
      setToast('Select a module to build a command.');
      return;
    }
    const moduleMeta = modulesList.find((m) => m.name === moduleName);
    const commandParts = [`use ${moduleName}`];
    Object.entries(builderOptions)
      .filter(([, value]) => value !== '')
      .forEach(([key, value]) => {
        commandParts.push(`set ${key} ${value}`);
      });
    commandParts.push(moduleMeta?.type === 'exploit' ? 'exploit' : 'run');
    const assembled = commandParts.join('\n');
    setBuiltCommand(assembled);
    setToast('Command staged in builder panel.');
  };

  const handleCopyCommand = async () => {
    if (!builtCommand) return;
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      'writeText' in navigator.clipboard
    ) {
      try {
        await navigator.clipboard.writeText(builtCommand);
        setToast('Command copied to clipboard.');
        return;
      } catch (error) {
        // Ignore failure and fall back to manual copy guidance.
      }
    }
    setToast('Clipboard access unavailable—select and copy manually.');
  };

  const renderTree = (node: TreeNode) => (
    <ul className="ml-2">
      {Object.entries(node)
        .filter(([k]) => k !== '__modules')
        .map(([key, child]) => (
          <li key={key}>
            <details>
              <summary className="cursor-pointer">{key}</summary>
              {renderTree(child as TreeNode)}
            </details>
          </li>
        ))}
      {(node.__modules || []).map((mod) => (
        <li key={mod.name}>
          <button
            onClick={() => setSelected(mod)}
            className="flex justify-between w-full text-left px-1 py-0.5 hover:bg-gray-100"
          >
            <span>{mod.name.split('/').pop()}</span>
            <span
              className={`ml-2 text-xs text-white px-1 rounded ${
                typeColors[mod.type] || 'bg-gray-500'
              }`}
            >
              {mod.type}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex h-full">
      <div className="w-1/3 border-r overflow-auto p-2">
        <label htmlFor="metasploit-search" className="sr-only" id="metasploit-search-label">
          Search modules
        </label>
        <input
          id="metasploit-search"
          type="text"
          placeholder="Search modules"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full p-1 mb-2 border rounded"
          aria-labelledby="metasploit-search-label"
        />
        <div className="flex flex-wrap gap-1 mb-2">
          <button
            onClick={() => setTag('')}
            className={`px-2 py-0.5 text-xs rounded ${
              tag === '' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            All
          </button>
          {allTags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`px-2 py-0.5 text-xs rounded ${
                tag === t ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {renderTree(tree)}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-4">
          {selected ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-lg">{selected.name}</h2>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    typeColors[selected.type] || 'bg-gray-500'
                  } text-white`}
                >
                  {selected.type}
                </span>
                {selected.severity && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      severityPills[selected.severity] || 'bg-gray-600 text-white'
                    }`}
                  >
                    Severity: {selected.severity}
                  </span>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm">{selected.description}</p>
              {(selected.cve || []).length > 0 && (
                <div className="text-xs text-gray-600 space-x-1">
                  {(selected.cve || []).map((cve) => (
                    <span key={cve} className="inline-block bg-gray-200 rounded px-1 py-0.5">
                      {cve}
                    </span>
                  ))}
                </div>
              )}
              {selected.disclosure_date && (
                <p className="text-xs text-gray-600">
                  Disclosed: {selected.disclosure_date}
                </p>
              )}
              {selected.teaches && (
                <p className="text-xs text-gray-600">Teaches: {selected.teaches}</p>
              )}
              {selected.doc && (
                <p className="text-xs text-blue-700">Reference: {selected.doc}</p>
              )}
              {selected.transcript && (
                <div>
                  <h3 className="text-sm font-semibold">Demo transcript</h3>
                  <pre className="max-h-40 overflow-auto bg-gray-900 text-green-200 text-xs rounded p-2 whitespace-pre-wrap">
                    {selected.transcript}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p>Select a module to view details</p>
          )}
        </div>
        <div ref={splitRef} className="h-96 border-t flex flex-col">
          <div style={{ height: `calc(${split}% - 2px)` }} className="overflow-auto">
            <MetasploitApp />
          </div>
          <div
            className="h-1 bg-gray-400 cursor-row-resize"
            onMouseDown={() => (dragging.current = true)}
          />
          <div
            style={{ height: `calc(${100 - split}% - 2px)` }}
            className="overflow-auto p-3 space-y-4 bg-gray-50"
          >
            <section className="bg-yellow-100 border-l-4 border-yellow-500 p-3 text-sm text-yellow-900">
              <h3 className="font-semibold">Lab Warnings</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {labWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
            <section className="bg-white border border-gray-200 rounded shadow-sm p-3 space-y-3">
              <h3 className="font-semibold">Command Builder</h3>
              <div>
                <label
                  htmlFor="metasploit-builder-module"
                  className="block text-sm font-medium text-gray-700"
                >
                  Module path
                </label>
                <input
                  id="metasploit-builder-module"
                  type="text"
                  value={builderModule}
                  onChange={(e) => setBuilderModule(e.target.value)}
                  placeholder="auxiliary/scanner/portscan/tcp"
                  aria-label="Module path"
                  className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
                />
              </div>
              {builderModuleMeta && (
                <p className="text-xs text-gray-600">
                  {builderModuleMeta.description}
                </p>
              )}
              {builderModuleMeta &&
                Object.keys(builderModuleMeta.options || {}).length > 0 && (
                  <fieldset>
                    <legend className="text-sm font-medium text-gray-700">
                      Options
                    </legend>
                    <div className="mt-2 space-y-2">
                      {Object.entries(builderModuleMeta.options || {}).map(
                        ([name, opt]) => (
                          <div key={name} className="space-y-1">
                            <label
                              htmlFor={`metasploit-option-${name}`}
                              className="flex items-center justify-between text-xs font-semibold text-gray-700"
                            >
                              <span>{name}</span>
                              {opt.required && (
                                <span className="ml-2 text-red-600">Required</span>
                              )}
                            </label>
                            <input
                              id={`metasploit-option-${name}`}
                              type="text"
                              value={builderOptions[name] || ''}
                              onChange={(e) =>
                                handleOptionChange(name, e.target.value)
                              }
                              placeholder={
                                opt.default !== undefined
                                  ? String(opt.default)
                                  : opt.desc
                              }
                              aria-label={name}
                              className="w-full rounded border border-gray-300 p-2 text-xs"
                              aria-describedby={`metasploit-option-${name}-desc`}
                            />
                            <p
                              id={`metasploit-option-${name}-desc`}
                              className="text-[11px] text-gray-500"
                            >
                              {opt.desc}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                  </fieldset>
                )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleBuildCommand}
                  className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                >
                  Build command
                </button>
                <button
                  type="button"
                  onClick={handleCopyCommand}
                  className="px-3 py-1 rounded border border-blue-600 text-blue-600 text-sm disabled:opacity-50"
                  disabled={!builtCommand}
                >
                  Copy command
                </button>
              </div>
              {builtCommand && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">Command preview</h4>
                  <pre
                    data-testid="metasploit-command-preview"
                    className="whitespace-pre-wrap text-xs bg-gray-900 text-green-200 rounded p-2"
                    aria-live="polite"
                  >
                    {builtCommand}
                  </pre>
                </div>
              )}
            </section>
            <section className="bg-black text-green-300 rounded p-3 shadow-inner">
              <h3 className="text-sm font-semibold text-green-100 mb-2">
                Canned Console Output
              </h3>
              <pre
                data-testid="metasploit-canned-console"
                className="whitespace-pre-wrap text-xs font-mono"
              >
                {cannedConsole}
              </pre>
            </section>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default MetasploitPage;
