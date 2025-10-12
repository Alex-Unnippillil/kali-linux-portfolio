'use client';

import React, { useCallback, useMemo, useState } from 'react';
import modules from './modules.json';
import privTree from './priv-esc.json';
import RemediationTable from './components/RemediationTable';
import ResultCard from './components/ResultCard';
import usePersistentState from '../../hooks/usePersistentState';

interface ModuleOption {
  name: string;
  label: string;
  value?: string;
}

interface ModuleEntry {
  path: string;
  description: string;
  options?: ModuleOption[];
  sampleOutput: string;
}

interface TreeNode {
  [key: string]: TreeNode | { module?: ModuleEntry; children?: TreeNode };
}

interface PrivNode {
  label: string;
  children?: PrivNode[];
}

interface Evidence {
  id: number;
  note: string;
  fileName?: string;
  tags: string[];
}

interface ResultItem {
  title: string;
  output: string;
}

interface ModuleSet {
  name: string;
  modules: string[];
}

type QueueStatus = 'pending' | 'running' | 'done';

interface QueueItem {
  module: ModuleEntry;
  status: QueueStatus;
}

const queueStatusStyles: Record<QueueStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/40',
  running: 'bg-blue-500/20 text-blue-200 border border-blue-500/40',
  done: 'bg-green-500/20 text-green-200 border border-green-500/40',
};

const queueStatusLabels: Record<QueueStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  done: 'Done',
};

const buildModuleTree = (catalog: ModuleEntry[]) => {
  const root: TreeNode = {};
  catalog.forEach((mod) => {
    const parts = mod.path.split('/').slice(1);
    let node: any = root;
    parts.forEach((part, idx) => {
      node[part] = node[part] || {};
      if (idx === parts.length - 1) {
        node[part].module = mod;
      } else {
        node[part].children = node[part].children || {};
        node = node[part].children;
      }
    });
  });
  return root;
};

const ModuleTree: React.FC<{ data: TreeNode; onSelect: (m: ModuleEntry) => void }> = ({ data, onSelect }) => (
  <ul className="pl-4 space-y-1 text-sm text-gray-100">
    {Object.entries(data).map(([name, node]) => (
      <ModuleNode key={name} name={name} node={node as any} onSelect={onSelect} />
    ))}
  </ul>
);

const ModuleNode: React.FC<{ name: string; node: any; onSelect: (m: ModuleEntry) => void }> = ({ name, node, onSelect }) => {
  if (node.module) {
    return (
      <li>
        <button
          className="flex w-full items-center rounded-md px-2 py-1 text-left transition hover:bg-emerald-500/10 hover:text-emerald-300"
          onClick={() => onSelect(node.module)}
        >
          {name}
        </button>
      </li>
    );
  }
  return (
    <li>
      <details className="rounded-lg border border-gray-700/60 bg-gray-800/50 p-2">
        <summary className="cursor-pointer font-medium text-emerald-300">{name}</summary>
        <ModuleTree data={node.children} onSelect={onSelect} />
      </details>
    </li>
  );
};

const PrivTree: React.FC<{ node: PrivNode }> = ({ node }) => (
  <ul className="pl-4">
    <li>
      {node.label}
      {node.children && node.children.length > 0 && (
        <div>
          {node.children.map((c) => (
            <PrivTree key={c.label} node={c} />
          ))}
        </div>
      )}
    </li>
  </ul>
);

const EvidenceVault: React.FC = () => {
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState('');
  const [items, setItems] = useState<Evidence[]>([]);

  const addItem = () => {
    if (!note && !file) return;
    const entry: Evidence = {
      id: Date.now(),
      note,
      fileName: file?.name,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    setItems((prev) => [...prev, entry]);
    setNote('');
    setFile(null);
    setTags('');
  };

  return (
    <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800/70 p-4">
      <h3 className="mb-3 text-lg font-semibold text-emerald-300">Evidence Vault</h3>
      <label htmlFor="metasploit-evidence-note" className="sr-only" id="metasploit-evidence-note-label">
        Note
      </label>
      <textarea
        id="metasploit-evidence-note"
        className="w-full rounded-md border border-gray-600 bg-gray-900/60 p-2 text-gray-100 placeholder:text-gray-500"
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-labelledby="metasploit-evidence-note-label"
      />
      <label htmlFor="metasploit-evidence-file" className="sr-only" id="metasploit-evidence-file-label">
        Attachment
      </label>
      <input
        id="metasploit-evidence-file"
        type="file"
        className="mb-3 text-sm text-gray-200 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1 file:text-sm file:font-medium"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        aria-labelledby="metasploit-evidence-file-label"
      />
      <label htmlFor="metasploit-evidence-tags" className="sr-only" id="metasploit-evidence-tags-label">
        Tags
      </label>
      <input
        id="metasploit-evidence-tags"
        className="w-full rounded-md border border-gray-600 bg-gray-900/60 p-2 text-gray-100 placeholder:text-gray-500"
        placeholder="Tags (comma separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        aria-labelledby="metasploit-evidence-tags-label"
      />
      <button
        onClick={addItem}
        className="mt-1 inline-flex items-center rounded-md bg-emerald-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-emerald-500"
      >
        Add evidence
      </button>
      <ul className="mt-4 space-y-2">
        {items.map((i) => (
          <li key={i.id} className="rounded-md border border-gray-700/70 bg-gray-900/60 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {i.fileName && <span className="font-mono text-emerald-300">{i.fileName}</span>}
              <span>{i.note}</span>
            </div>
            {i.tags.length > 0 && (
              <span className="mt-2 block text-xs uppercase tracking-wide text-gray-400">
                Tags: {i.tags.join(', ')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const MetasploitPost: React.FC = () => {
  const [selected, setSelected] = useState<ModuleEntry | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState([
    { label: 'Gather System Info', done: false },
    { label: 'Escalate Privileges', done: false },
    { label: 'Establish Persistence', done: false },
    { label: 'Cleanup Traces', done: false },
  ]);

  const tabs = ['Hash Dump', 'Persistence', 'Enumeration'];
  const [activeTab, setActiveTab] = useState('Hash Dump');
  const [results, setResults] = useState<Record<string, ResultItem[]>>({
    'Hash Dump': [],
    Persistence: [],
    Enumeration: [],
  });
  const [report, setReport] = useState<ResultItem[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [setName, setSetName] = useState('');
  const [savedSets, setSavedSets] = usePersistentState<ModuleSet[]>('msf-post-sets', []);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);

  const treeData = useMemo(() => buildModuleTree(modules as ModuleEntry[]), []);

  const select = (mod: ModuleEntry) => {
    setSelected(mod);
    const initial: Record<string, string> = {};
    mod.options?.forEach((o) => (initial[o.name] = o.value || ''));
    setParams(initial);
    setSteps((prev) => prev.map((s) => ({ ...s, done: false })));
  };

  const handleParamChange = (name: string, value: string) => {
    setParams((p) => ({ ...p, [name]: value }));
  };

  const animateSteps = useCallback(() => {
    setSteps((prev) => prev.map((s) => ({ ...s, done: false })));
    steps.forEach((_, idx) => {
      setTimeout(() => {
        setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, done: true } : s)));
      }, (idx + 1) * 500);
    });
  }, [steps]);

  const updateQueueItemStatus = useCallback((modulePath: string, status: QueueStatus) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.module.path === modulePath
          ? {
              ...item,
              status,
            }
          : item,
      ),
    );
  }, []);

  const runModule = (mod: ModuleEntry) => {
    const result = { title: mod.path, output: mod.sampleOutput };
    setResults((prev) => ({
      ...prev,
      [activeTab]: [...prev[activeTab], result],
    }));
    setSelected(mod);
    animateSteps();
  };

  const run = () => {
    if (!selected) {
      setStatusMessage('Select a module to run from the catalog tree.');
      return;
    }

    const missingOptions =
      selected.options?.filter((o) => !(params[o.name] && params[o.name].trim())) || [];

    if (missingOptions.length > 0) {
      const missingLabels = missingOptions.map((o) => o.label).join(', ');
      setStatusMessage(`Set the required option values before running: ${missingLabels}.`);
      return;
    }

    setStatusMessage(`Running ${selected.path}...`);
    runModule(selected);
    updateQueueItemStatus(selected.path, 'done');
    setStatusMessage(`Completed ${selected.path}. Review the output in the ${activeTab} tab.`);
  };

  const addToQueue = () => {
    if (!selected) return;
    setQueue((prev) => {
      if (prev.find((item) => item.module.path === selected.path)) {
        setStatusMessage('This module is already queued.');
        return prev;
      }
      setStatusMessage(`Queued ${selected.path}.`);
      return [...prev, { module: selected, status: 'pending' }];
    });
  };

  const runQueue = () => {
    if (queue.length === 0) {
      setStatusMessage('Queue is empty. Add modules to the queue before running.');
      return;
    }

    if (isQueueProcessing) {
      setStatusMessage('Queue is already running. Please wait for it to finish.');
      return;
    }

    const snapshot = [...queue];
    setIsQueueProcessing(true);
    setStatusMessage(
      `Running queue with ${snapshot.length} module${snapshot.length > 1 ? 's' : ''}...`,
    );

    snapshot.forEach((item, idx) => {
      const startDelay = idx * 1200;
      setTimeout(() => {
        updateQueueItemStatus(item.module.path, 'running');
        setStatusMessage(
          `Running ${item.module.path} (${idx + 1}/${snapshot.length})...`,
        );
      }, startDelay);

      setTimeout(() => {
        runModule(item.module);
        updateQueueItemStatus(item.module.path, 'done');
        if (idx === snapshot.length - 1) {
          setStatusMessage('Queue completed. Review the results below.');
          setIsQueueProcessing(false);
          setTimeout(() => setQueue([]), 800);
        }
      }, startDelay + 600);
    });
  };

  const saveSet = () => {
    if (!setName || queue.length === 0) return;
    const newSet = { name: setName, modules: queue.map((m) => m.module.path) };
    setSavedSets((prev) => [...prev, newSet]);
    setQueue([]);
    setSetName('');
  };

  const runSavedSet = (paths: string[]) => {
    const mods = (modules as ModuleEntry[]).filter((m) => paths.includes(m.path));
    mods.forEach((mod, idx) => {
      setTimeout(() => runModule(mod), idx * 1000);
    });
  };

  const deleteSet = (idx: number) => {
    setSavedSets((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveReport = () => {
    const all = [
      ...results['Hash Dump'],
      ...results['Persistence'],
      ...results['Enumeration'],
    ];
    if (all.length === 0) {
      setStatusMessage('No results to save. Run a module before generating a report.');
      return;
    }
    setStatusMessage('Saving consolidated report results...');
    setReport((prev) => [...prev, ...all]);
    setStatusMessage('Report saved. Scroll down to review the compiled findings.');
  };

  const selectedMissingOptions =
    selected?.options?.filter((o) => !(params[o.name] && params[o.name].trim())) || [];
  const hasMissingOptions = selectedMissingOptions.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white">
      <h1 className="text-2xl font-semibold text-emerald-300 mb-6">Metasploit Post Modules</h1>
      <div
        className="mb-6 rounded-xl border border-emerald-600/40 bg-slate-900/80 p-4 shadow-lg"
        data-testid="queue-summary-card"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-emerald-200">Execution Queue</h2>
          {isQueueProcessing && (
            <span className="rounded-full bg-emerald-600/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
              Processing
            </span>
          )}
        </div>
        {queue.length === 0 ? (
          <p className="mt-3 text-sm text-slate-300">No modules queued.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {queue.map((item) => (
              <li key={item.module.path} className="flex items-center justify-between rounded-lg border border-gray-700/60 bg-gray-900/60 px-3 py-2 text-sm">
                <span className="pr-4 font-mono text-emerald-200">{item.module.path}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${queueStatusStyles[item.status]}`}
                >
                  {queueStatusLabels[item.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {statusMessage && (
        <div className="mb-6 rounded-lg border-l-4 border-emerald-400 bg-emerald-500/10 p-4 text-sm text-emerald-100 shadow" role="status">
          {statusMessage}
        </div>
      )}
      <div className="mb-6 flex flex-wrap gap-3">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              activeTab === t
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-200'
                : 'border-gray-700/70 bg-slate-800 text-slate-200 hover:border-emerald-600/40 hover:text-emerald-200'
            }`}
          >
            {t}
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                results[t].length ? 'bg-emerald-500 text-emerald-950' : 'bg-slate-700 text-slate-200'
              }`}
            >
              {results[t].length ? 'done' : 'pending'}
            </span>
          </button>
        ))}
      </div>
      <div className="mb-8 space-y-3 rounded-xl border border-gray-800/70 bg-slate-950/70 p-4">
        <h2 className="text-lg font-semibold text-emerald-200">{activeTab} Results</h2>
        {results[activeTab].map((r, i) => (
          <ResultCard key={i} title={r.title} output={r.output} />
        ))}
        <button
          onClick={saveReport}
          className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Save combined report snapshot
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="max-h-[32rem] overflow-auto rounded-xl border border-gray-800/80 bg-slate-950/80 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-emerald-200">Module Catalog</h2>
            <span className="text-xs uppercase tracking-wide text-slate-400">Tap to configure</span>
          </div>
          <ModuleTree data={treeData} onSelect={select} />
        </div>
        <div className="space-y-6">
          {selected ? (
            <div className="rounded-xl border border-gray-800/80 bg-slate-950/80 p-5 shadow-inner">
              <h2 className="text-xl font-semibold text-emerald-200">{selected.path}</h2>
              <p className="mt-2 text-sm text-slate-200">{selected.description}</p>
              {selected.options && selected.options.length > 0 ? (
                <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">
                  Provide values for all required options before running. Defaults are pre-filled when
                  available.
                </p>
              ) : (
                <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">
                  This module has no required options.
                </p>
              )}
                  {selected.options?.map((o) => {
                    const inputId = `metasploit-post-option-${o.name}`;
                    const labelId = `${inputId}-label`;
                    return (
                      <div key={o.name} className="mt-4">
                        <label className="block text-sm font-medium text-emerald-200" htmlFor={inputId} id={labelId}>
                          {o.label}
                        </label>
                        <input
                          id={inputId}
                          type="text"
                          className="mt-1 w-full rounded-md border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-gray-100 focus:border-emerald-500 focus:outline-none"
                          value={params[o.name] || ''}
                          onChange={(e) => handleParamChange(o.name, e.target.value)}
                          aria-labelledby={labelId}
                        />
                      </div>
                    );
                  })}
              {hasMissingOptions && (
                <p className="mt-3 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                  Missing options: {selectedMissingOptions.map((o) => o.label).join(', ')}
                </p>
              )}
              <button
                onClick={run}
                className={`mt-4 inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold transition ${
                  hasMissingOptions
                    ? 'cursor-not-allowed bg-emerald-600/30 text-emerald-200'
                    : 'bg-emerald-600 text-emerald-950 hover:bg-emerald-500'
                }`}
                disabled={hasMissingOptions}
              >
                Run
              </button>
              <button
                onClick={addToQueue}
                className="mt-4 ml-3 inline-flex items-center rounded-md bg-purple-600/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-500"
              >
                Add to Queue
              </button>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-emerald-600/50 bg-slate-950/60 p-6 text-sm text-slate-300">
              Select a module from the catalog to review its simulated description and available options.
            </p>
          )}
          {queue.length > 0 && (
            <div className="rounded-xl border border-gray-800/70 bg-slate-950/80 p-5">
              <h3 className="text-lg font-semibold text-emerald-200">Queued Modules</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                {queue.map((m) => (
                  <li key={m.module.path}>
                    {m.module.path}
                    <span className="ml-2 text-xs text-gray-400">({queueStatusLabels[m.status]})</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    onClick={runQueue}
                    className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                      isQueueProcessing
                        ? 'cursor-not-allowed bg-emerald-600/30 text-emerald-200'
                        : 'bg-emerald-600 text-emerald-950 hover:bg-emerald-500'
                    }`}
                    disabled={isQueueProcessing}
                  >
                    Run Queue
                  </button>
                  <label htmlFor="metasploit-post-set-name" className="sr-only" id="metasploit-post-set-name-label">
                    Set name
                  </label>
                  <input
                    id="metasploit-post-set-name"
                    className="rounded-md border border-gray-700 bg-gray-900/70 px-3 py-2 text-sm text-gray-100 focus:border-emerald-500 focus:outline-none"
                    placeholder="Set name"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    aria-labelledby="metasploit-post-set-name-label"
                  />
                <button
                  onClick={saveSet}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                    queue.length === 0 || !setName.trim()
                      ? 'cursor-not-allowed bg-purple-600/40 text-purple-200'
                      : 'bg-purple-600 text-white hover:bg-purple-500'
                  }`}
                  disabled={queue.length === 0 || !setName.trim()}
                >
                  Save Set
                </button>
              </div>
            </div>
          )}
          {savedSets.length > 0 && (
            <div className="rounded-xl border border-gray-800/70 bg-slate-950/80 p-5">
              <h3 className="text-lg font-semibold text-emerald-200">Saved Sets</h3>
              {savedSets.map((s, idx) => (
                <div key={idx} className="mt-3 flex items-center gap-2 text-sm text-slate-200">
                  <span className="flex-1 font-medium text-emerald-100">{s.name}</span>
                  <button
                    onClick={() => runSavedSet(s.modules)}
                    className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-500"
                  >
                    Run
                  </button>
                  <button
                    onClick={() => deleteSet(idx)}
                    className="rounded-md bg-red-600/80 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-500"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
          <svg width="220" height={steps.length * 80} className="mt-6">
            {steps.map((step, i) => (
              <g key={step.label} transform={`translate(20, ${i * 70 + 20})`}>
                <circle cx="0" cy="0" r="20" fill={step.done ? '#22c55e' : '#6b7280'} />
                {step.done && (
                  <path d="M-8 0 l4 4 l8 -8" stroke="#fff" strokeWidth="2" fill="none" />
                )}
                <text x="40" y="5" fill={step.done ? '#22c55e' : '#d1d5db'} fontSize="14">
                  {step.label}
                </text>
                {i < steps.length - 1 && (
                  <line x1="0" y1="20" x2="0" y2="70" stroke="#6b7280" strokeWidth="2" />
                )}
              </g>
            ))}
          </svg>
          <div className="mt-8 rounded-xl border border-gray-800/70 bg-slate-950/80 p-5">
            <h3 className="text-lg font-semibold text-emerald-200">Privilege Escalation Tree</h3>
            <div className="mt-3 border-l-2 border-emerald-600/40 pl-4 text-sm text-slate-200">
              <PrivTree node={privTree as PrivNode} />
            </div>
          </div>
          <RemediationTable />
          <EvidenceVault />
        </div>
      </div>
      {report.length > 0 && (
        <div className="mt-10 rounded-xl border border-gray-800/80 bg-slate-950/80 p-6">
          <h3 className="text-xl font-semibold text-emerald-200">Saved Report Archive</h3>
          {report.map((r, i) => (
            <ResultCard key={i} title={r.title} output={r.output} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MetasploitPost;
