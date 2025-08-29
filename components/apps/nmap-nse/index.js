import React, { useEffect, useRef, useState } from 'react';
import Toast from '../../ui/Toast';
import DiscoveryMap from './DiscoveryMap';

const portPresets = [
  { label: 'Default', flag: '' },
  { label: 'Common', flag: '-F' },
  { label: 'Full', flag: '-p-' }
];

const cvssByCategory = { discovery: 3, vuln: 9, safe: 1 };

const NmapNSEApp = () => {
  const [target, setTarget] = useState('example.com');
  const [scriptQuery, setScriptQuery] = useState('');
  const [portFlag, setPortFlag] = useState('');
  const [scriptArgs, setScriptArgs] = useState('');
  const [scripts, setScripts] = useState([]); // flat list with category
  const [categories, setCategories] = useState({}); // name -> category
  const [selectedScripts, setSelectedScripts] = useState([]);
  const [examples, setExamples] = useState({});
  const [hostTree, setHostTree] = useState({});
  const [addresses, setAddresses] = useState([]);
  const [toast, setToast] = useState('');
  const outputRef = useRef(null);

  useEffect(() => {
    fetch('/demo-data/nmap/scripts.json')
      .then((r) => r.json())
      .then((json) => {
        const flat = [];
        const catMap = {};
        Object.entries(json).forEach(([cat, list]) => {
          list.forEach((s) => {
            flat.push({ ...s, category: cat });
            catMap[s.name] = cat;
          });
        });
        setScripts(flat);
        setCategories(catMap);
        if (flat.length > 0) setSelectedScripts([flat[0].name]);
      })
      .catch(() => setScripts([]));
    fetch('/demo/nmap-nse.json')
      .then((r) => r.json())
      .then(setExamples)
      .catch(() => setExamples({}));
  }, []);

  useEffect(() => {
    const dns = examples['dns-brute'];
    if (!dns) return setAddresses([]);
    const addrs = [];
    dns.split('\n').forEach((line) => {
      const m = line.match(/(\d+\.\d+\.\d+\.\d+)/);
      if (m) addrs.push(m[1]);
    });
    setAddresses(addrs);
  }, [examples]);

  useEffect(() => {
    const ports = {};
    const host = target;
    selectedScripts.forEach((name) => {
      const text = examples[name];
      if (!text) return;
      text.split('\n').forEach((line) => {
        const m = line.match(/^(\d+)\/\w+\s+open\s+(\S+)/);
        if (m) {
          const port = m[1];
          const service = m[2];
          if (!ports[port]) ports[port] = { service, scripts: [] };
          ports[port].scripts.push(name);
        }
      });
    });
    setHostTree({ [host]: ports });
  }, [selectedScripts, examples, target]);

  const toggleScript = (name) => {
    setSelectedScripts((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    );
  };

  const filteredScripts = scripts.filter((s) => {
    const q = scriptQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    );
  });

  const command = `nmap ${portFlag} ${
    selectedScripts.length ? `--script ${selectedScripts.join(',')}` : ''
  } ${scriptArgs ? `--script-args ${scriptArgs}` : ''} ${target}`
    .replace(/\s+/g, ' ')
    .trim();

  const copyCommand = async () => {
    if (typeof window !== 'undefined') {
      try {
        await navigator.clipboard.writeText(command);
        setToast('Command copied');
      } catch (e) {
        // ignore
      }
    }
  };

  const copyOutput = async () => {
    const text = selectedScripts
      .map((s) => `# ${s}\n${examples[s] || ''}`)
      .join('\n');
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setToast('Output copied');
    } catch (e) {
      // ignore
    }
  };

  const selectOutput = () => {
    const el = outputRef.current;
    if (!el || typeof window === 'undefined') return;
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    setToast('Output selected');
  };

  const handleOutputKey = (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      copyOutput();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectOutput();
    }
  };

  const renderOutput = (text) => {
    if (!text) return 'No sample output available.';
    return text.split('\n').map((line, idx) => {
      const highlight = /open|allowed|Potential/i.test(line);
      return (
        <span key={idx} className={highlight ? 'text-yellow-300' : undefined}>
          {line}
          {'\n'}
        </span>
      );
    });
  };

  const computeCvss = (scripts) => {
    let score = 0;
    scripts.forEach((n) => {
      const cat = categories[n];
      score = Math.max(score, cvssByCategory[cat] || 0);
    });
    return score.toFixed(1);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full text-white">
      <div className="md:w-1/2 p-4 bg-ub-dark overflow-y-auto">
        <h1 className="text-lg mb-4">Nmap NSE Demo</h1>
        <DiscoveryMap addresses={addresses} trigger={selectedScripts.join(',')} />
        <div className="mb-4 p-2 bg-yellow-900 text-yellow-200 border-l-4 border-yellow-500 rounded">
          <p className="text-sm font-bold">
            Educational use only. Do not scan systems without permission.
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1" htmlFor="target">Target</label>
          <input
            id="target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-2 text-black"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1" htmlFor="scripts">Scripts</label>
          <input
            id="scripts"
            value={scriptQuery}
            onChange={(e) => setScriptQuery(e.target.value)}
            placeholder="Search scripts"
            className="w-full p-2 text-black mb-2"
          />
          <div className="h-32 overflow-y-auto bg-white text-black rounded p-2">
            {filteredScripts.map((s) => (
              <label key={s.name} className="flex items-start space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={selectedScripts.includes(s.name)}
                  onChange={() => toggleScript(s.name)}
                />
                <div>
                  <span className="font-mono">{s.name}</span>
                  <span className="ml-2 text-xs bg-ub-grey px-1 rounded">
                    {s.category}
                  </span>
                  <p className="text-xs">{s.description}</p>
                </div>
              </label>
            ))}
            {filteredScripts.length === 0 && (
              <p className="text-sm">No scripts found.</p>
            )}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1" htmlFor="scriptArgs">
            Script Args
          </label>
          <input
            id="scriptArgs"
            value={scriptArgs}
            onChange={(e) => setScriptArgs(e.target.value)}
            className="w-full p-2 text-black"
          />
        </div>
        <div className="mb-4">
          <p className="block text-sm mb-1">Port presets</p>
          <div className="flex gap-2">
            {portPresets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPortFlag(p.flag)}
                className={`px-2 py-1 rounded text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow ${
                  portFlag === p.flag ? 'bg-ub-yellow' : 'bg-ub-grey'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center mb-4">
          <pre className="flex-1 bg-black text-green-400 p-2 rounded overflow-auto">
            {command}
          </pre>
          <button
            type="button"
            onClick={copyCommand}
            className="ml-2 px-2 py-1 bg-ub-grey text-black rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
          >
            Copy Command
          </button>
        </div>
        <div className="mb-4">
          <h2 className="text-lg mb-2">Host/Port Summary</h2>
          <ul className="ml-4 list-disc">
            {Object.entries(hostTree).map(([host, ports]) => (
              <li key={host}>
                {host}
                <ul className="ml-4 list-disc">
                  {Object.entries(ports).map(([port, info]) => (
                    <li key={port}>
                      {port}/tcp {info.service}
                      <span className="ml-2 px-1 rounded bg-ub-grey text-black text-xs">
                        CVSS {computeCvss(info.scripts)}
                      </span>
                    </li>
                  ))}
                  {Object.keys(ports).length === 0 && <li>No open ports</li>}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="md:w-1/2 p-4 bg-black overflow-y-auto">
        <h2 className="text-lg mb-2">Example output</h2>
        <div
          ref={outputRef}
          tabIndex={0}
          onKeyDown={handleOutputKey}
          className="whitespace-pre-wrap text-green-400"
        >
          {selectedScripts.length === 0 && 'Select scripts to view sample output.'}
          {selectedScripts.map((s) => (
            <div key={s} className="mb-4">
              <h3 className="text-blue-400 font-mono">{s}</h3>
              <pre>{renderOutput(examples[s])}</pre>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={copyOutput}
            className="px-2 py-1 bg-ub-grey text-black rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
          >
            Copy Output
          </button>
          <button
            type="button"
            onClick={selectOutput}
            className="px-2 py-1 bg-ub-grey text-black rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
          >
            Select All
          </button>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default NmapNSEApp;

export const displayNmapNSE = () => <NmapNSEApp />;

