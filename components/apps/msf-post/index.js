import React, { useEffect, useState } from 'react';

// Sample module catalog for demo purposes only
const MODULE_CATALOG = [
  {
    path: 'post/multi/recon/local_exploit_suggester',
    description:
      'Examines the target system to suggest potential local privilege escalation exploits.',
    options: [{ name: 'SESSION', label: 'Session ID', value: '1' }],
    sampleOutput:
      '# Running local_exploit_suggester\n[*] Checking target...\n[+] Found 0-day privilege escalation path',
  },
  {
    path: 'post/windows/manage/enable_rdp',
    description: 'Enables Remote Desktop Protocol on the target Windows system.',
    options: [{ name: 'SESSION', label: 'Session ID', value: '1' }],
    sampleOutput:
      '# Running enable_rdp\n[*] RDP is already enabled\n[+] Operation completed successfully',
  },
  {
    path: 'post/linux/gather/enum_network',
    description:
      'Collects network interface and routing information from a Linux host.',
    options: [{ name: 'SESSION', label: 'Session ID', value: '1' }],
    sampleOutput:
      '# Running enum_network\n[*] Gathering network info\n[+] Interface eth0 192.168.0.5',
  },
];

// Escape text for clipboard copy
const escapeText = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Build a tree structure from module paths
const buildTree = (catalog) => {
  const root = {};
  catalog.forEach((mod) => {
    const parts = mod.path.split('/').slice(1); // drop "post"
    let node = root;
    parts.forEach((part, idx) => {
      if (!node[part]) node[part] = {};
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

const Tree = ({ data, onSelect, depth = 0 }) => (
  <ul className="pl-0 list-none">
    {Object.entries(data).map(([name, node]) => (
      <TreeNode
        key={name}
        name={name}
        node={node}
        onSelect={onSelect}
        depth={depth}
      />
    ))}
  </ul>
);

const TreeNode = ({ name, node, onSelect, depth }) => {
  const indent = depth * 6;
  if (node.module) {
    return (
      <li>
        <button
          onClick={() => onSelect(node.module)}
          className="text-left hover:underline focus-visible:outline-none h-8 flex items-center w-full"
          style={{ paddingLeft: indent }}
        >
          {name}
        </button>
      </li>
    );
  }
  return (
    <li>
      <details>
        <summary
          className="cursor-pointer h-8 flex items-center"
          style={{ paddingLeft: indent }}
        >
          {name}
        </summary>
        <Tree data={node.children} onSelect={onSelect} depth={depth + 1} />
      </details>
    </li>
  );
};

const MsfPostApp = () => {
  const [selectedModule, setSelectedModule] = useState(null);
  const [params, setParams] = useState({});
  const [output, setOutput] = useState('');
  const [steps, setSteps] = useState([
    { label: 'Gather System Info', done: false },
    { label: 'Escalate Privileges', done: false },
    { label: 'Establish Persistence', done: false },
    { label: 'Cleanup Traces', done: false },
  ]);
  const [liveMessage, setLiveMessage] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReduceMotion(mq.matches);
    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const treeData = buildTree(MODULE_CATALOG);

  const selectModule = (mod) => {
    setSelectedModule(mod);
    const initial = {};
    mod.options?.forEach((o) => {
      initial[o.name] = o.value || '';
    });
    setParams(initial);
    setOutput('');
  };

  const handleParamChange = (name, value) =>
    setParams((prev) => ({ ...prev, [name]: value }));

  const animateSteps = () => {
    setSteps((prev) => prev.map((s) => ({ ...s, done: false })));
    let index = 0;
    const total = steps.length;
    const update = () => {
      setSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, done: true } : s))
      );
      setLiveMessage(`${steps[index].label} completed`);
      index += 1;
      if (index < total) {
        if (reduceMotion) {
          setTimeout(update, 0);
        } else {
          requestAnimationFrame(update);
        }
      }
    };
    update();
  };

  const runModule = () => {
    if (!selectedModule) return;
    const lines = selectedModule.sampleOutput.split('\n');
    setOutput('');
    let idx = 0;
    const append = () => {
      setOutput((prev) => prev + (idx > 0 ? '\n' : '') + lines[idx]);
      idx += 1;
      if (idx < lines.length) {
        setTimeout(append, 500);
      }
    };
    append();
    animateSteps();
  };

  const copyAsCode = async () => {
    if (!output) return;
    const escaped = escapeText(output);
    const codeBlock = '```\n' + escaped + '\n```';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(codeBlock);
      } catch {
        /* ignore clipboard errors */
      }
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col">
      <h2 className="text-lg mb-2">Metasploit Post Modules</h2>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 overflow-auto border-r border-gray-700 pr-2">
          <Tree data={treeData} onSelect={selectModule} />
        </div>
        <div className="w-2/3 pl-4 flex flex-col">
          {selectedModule ? (
            <div>
              <h3 className="text-md font-semibold mb-1">
                {selectedModule.path}
              </h3>
              <p className="text-sm text-gray-400 mb-2">
                {selectedModule.description}
              </p>
              {selectedModule.options?.map((opt) => (
                <label key={opt.name} className="block mb-2">
                  {opt.label}
                  <input
                    className="w-full p-1 bg-gray-800 rounded mt-1"
                    value={params[opt.name] || ''}
                    onChange={(e) => handleParamChange(opt.name, e.target.value)}
                  />
                </label>
              ))}
              <button
                onClick={runModule}
                className="mt-2 px-3 py-1 bg-blue-600 rounded"
              >
                Run
              </button>
            </div>
          ) : (
            <p className="text-gray-400">Select a module to view details.</p>
          )}
          <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap mt-4">
            {output}
          </pre>
          <button
            onClick={copyAsCode}
            className="mt-2 px-4 py-2 bg-green-600 rounded self-start"
          >
            Copy as code
          </button>
        </div>
      </div>
      <div className="sr-only" aria-live="polite" role="status">
        {liveMessage}
      </div>
      <ul
        className="mt-4 space-y-2"
        role="list"
        aria-label="Post-exploitation checklist"
      >
        {steps.map((step) => (
          <li key={step.label} className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={step.done}
              readOnly
              className="form-checkbox h-4 w-4 text-green-500 rounded"
            />
            <span className={step.done ? 'text-green-400' : 'text-gray-400'}>
              {step.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MsfPostApp;

