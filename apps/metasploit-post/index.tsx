'use client';

import React, { useCallback, useMemo, useState } from 'react';
import modules from './modules.json';
import privTree from './priv-esc.json';
import HostNotebook from './components/HostNotebook';

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
  <ul className="pl-4">
    {Object.entries(data).map(([name, node]) => (
      <ModuleNode key={name} name={name} node={node as any} onSelect={onSelect} />
    ))}
  </ul>
);

const ModuleNode: React.FC<{ name: string; node: any; onSelect: (m: ModuleEntry) => void }> = ({ name, node, onSelect }) => {
  if (node.module) {
    return (
      <li>
        <button className="text-left hover:underline" onClick={() => onSelect(node.module)}>
          {name}
        </button>
      </li>
    );
  }
  return (
    <li>
      <details>
        <summary className="cursor-pointer">{name}</summary>
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
    <div className="mt-4">
      <h3 className="font-semibold mb-2">Evidence Vault</h3>
      <textarea
        className="w-full p-2 mb-2 text-black"
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <input type="file" className="mb-2" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <input
        className="w-full p-2 mb-2 text-black"
        placeholder="Tags (comma separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <button onClick={addItem} className="px-3 py-1 bg-blue-600 rounded">Add</button>
      <ul className="mt-4 list-disc pl-6">
        {items.map((i) => (
          <li key={i.id} className="mb-2">
            {i.fileName && <span className="font-mono mr-2">{i.fileName}</span>}
            {i.note}
            {i.tags.length > 0 && (
              <span className="ml-2 text-sm text-gray-400">[{i.tags.join(', ')}]</span>
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
  const [output, setOutput] = useState('');
  const [steps, setSteps] = useState([
    { label: 'Gather System Info', done: false },
    { label: 'Escalate Privileges', done: false },
    { label: 'Establish Persistence', done: false },
    { label: 'Cleanup Traces', done: false },
  ]);

  const treeData = useMemo(() => buildModuleTree(modules as ModuleEntry[]), []);

  const select = (mod: ModuleEntry) => {
    setSelected(mod);
    const initial: Record<string, string> = {};
    mod.options?.forEach((o) => (initial[o.name] = o.value || ''));
    setParams(initial);
    setOutput('');
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

  const run = () => {
    if (!selected) return;
    const lines = selected.sampleOutput.split('\n');
    setOutput('');
    lines.forEach((line, idx) => {
      setTimeout(() => {
        setOutput((prev) => (prev ? prev + '\n' : '') + line);
      }, idx * 500);
    });
    animateSteps();
  };

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen">
      <h1 className="text-xl mb-4">Metasploit Post Modules</h1>
      <div className="flex">
        <div className="w-1/3 overflow-auto border-r border-gray-700 pr-2">
          <ModuleTree data={treeData} onSelect={select} />
        </div>
        <div className="w-2/3 pl-4">
          {selected ? (
            <div>
              <h2 className="font-semibold mb-2">{selected.path}</h2>
              <p className="mb-2 text-sm text-gray-300">{selected.description}</p>
              {selected.options?.map((o) => (
                <label key={o.name} className="block mb-2">
                  {o.label}
                  <input
                    className="w-full p-1 bg-gray-800 rounded mt-1"
                    value={params[o.name] || ''}
                    onChange={(e) => handleParamChange(o.name, e.target.value)}
                  />
                </label>
              ))}
              <button onClick={run} className="mt-2 px-3 py-1 bg-green-600 rounded">
                Run
              </button>
              <pre className="mt-4 bg-black p-2 h-40 overflow-auto whitespace-pre-wrap">{output}</pre>
            </div>
          ) : (
            <p className="text-gray-400">Select a module to view details.</p>
          )}
          <svg width="220" height={steps.length * 80} className="mt-4">
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
          <div className="mt-8">
            <h3 className="font-semibold mb-2">Privilege Escalation Tree</h3>
            <PrivTree node={privTree as PrivNode} />
          </div>
          <EvidenceVault />
          <HostNotebook />
        </div>
      </div>
    </div>
  );
};

export default MetasploitPost;
