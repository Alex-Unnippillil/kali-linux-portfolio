import React, { useEffect, useRef, useState } from 'react';
import Toast from '../../ui/Toast';
import DiscoveryMap from './DiscoveryMap';

// Basic script metadata. Example output is loaded from public/demo/nmap-nse.json
const scripts = [
  {
    name: 'http-title',
    description: 'Fetches page titles from HTTP services.',
    categories: ['discovery', 'http'],
    arguments: [
      {
        name: 'http-title.path',
        description: 'Overrides the request path used when fetching the title.',
        example: 'http-title.path=/admin'
      },
      {
        name: 'http-title.timeout',
        description: 'Adjusts the HTTP request timeout in milliseconds.',
        example: 'http-title.timeout=5000'
      }
    ]
  },
  {
    name: 'ssl-cert',
    description: 'Retrieves TLS certificate information.',
    categories: ['discovery', 'ssl'],
    arguments: [
      {
        name: 'ssl-cert.location',
        description: 'Specifies the host:port of the TLS endpoint to query.',
        example: 'ssl-cert.location=example.com:443'
      }
    ]
  },
  {
    name: 'smb-os-discovery',
    description: 'Discovers remote OS information via SMB.',
    categories: ['discovery', 'smb'],
    arguments: []
  },
  {
    name: 'ftp-anon',
    description: 'Checks for anonymous FTP access.',
    categories: ['ftp', 'auth'],
    arguments: [
      {
        name: 'ftp-anon.maxlist',
        description: 'Limits the number of directory entries the script lists.',
        example: 'ftp-anon.maxlist=10'
      }
    ]
  },
  {
    name: 'http-enum',
    description: 'Enumerates directories on web servers.',
    categories: ['vulnerability', 'http'],
    arguments: [
      {
        name: 'http-enum.basepath',
        description: 'Sets a base path for the enumeration requests.',
        example: 'http-enum.basepath=/intranet'
      },
      {
        name: 'http-enum.category',
        description: 'Filters checks by category (e.g. apache, iis).',
        example: 'http-enum.category=apache'
      }
    ]
  },
  {
    name: 'dns-brute',
    description: 'Performs DNS subdomain brute force enumeration.',
    categories: ['brute-force', 'dns'],
    arguments: [
      {
        name: 'dns-brute.threads',
        description: 'Controls the number of concurrent DNS requests.',
        example: 'dns-brute.threads=10'
      },
      {
        name: 'dns-brute.hostlist',
        description: 'Points to a custom wordlist of subdomains.',
        example: 'dns-brute.hostlist=/path/to/list.txt'
      }
    ]
  }
];

const NSE_DOCS_URL = 'https://nmap.org/book/nse.html';

const scriptPhases = {
  'http-title': ['portrule'],
  'ssl-cert': ['portrule'],
  'smb-os-discovery': ['hostrule'],
  'ftp-anon': ['portrule'],
  'http-enum': ['portrule'],
  'dns-brute': ['hostrule']
};

const phaseInfo = {
  prerule: {
    description:
      'Runs before any hosts are scanned. Often used for broadcast discovery.',
    example: 'broadcast-dhcp-discover'
  },
  hostrule: {
    description: 'Runs once for each target host.',
    example: 'smb-os-discovery'
  },
  portrule: {
    description: 'Runs once for each target port.',
    example: 'http-title'
  }
};

const portPresets = [
  { label: 'Default', flag: '' },
  { label: 'Common', flag: '-F' },
  { label: 'Full', flag: '-p-' }
];

const cvssColor = (score) => {
  if (score >= 9) return 'bg-red-700';
  if (score >= 7) return 'bg-orange-700';
  if (score >= 4) return 'bg-yellow-700';
  return 'bg-green-700';
};

const NmapNSEApp = () => {
  const [target, setTarget] = useState('example.com');
  const [selectedScripts, setSelectedScripts] = useState([scripts[0].name]);
  const [scriptQuery, setScriptQuery] = useState('');
  const [portFlag, setPortFlag] = useState('');
  const [examples, setExamples] = useState({});
  const [results, setResults] = useState({ hosts: [] });
  const [scriptOptions, setScriptOptions] = useState({});
  const [activeScript, setActiveScript] = useState(scripts[0].name);
  const [phaseStep, setPhaseStep] = useState(0);
  const [toast, setToast] = useState('');
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const outputRef = useRef(null);
  const phases = ['prerule', 'hostrule', 'portrule'];

  useEffect(() => {
    fetch('/demo/nmap-nse.json')
      .then((r) => r.json())
      .then(setExamples)
      .catch(() => setExamples({}));
    fetch('/demo/nmap-results.json')
      .then((r) => r.json())
      .then(setResults)
      .catch(() => setResults({ hosts: [] }));
  }, []);

  const toggleScript = (name) => {
    setSelectedScripts((prev) => {
      const exists = prev.includes(name);
      const next = exists ? prev.filter((n) => n !== name) : [...prev, name];
      return next;
    });
    setActiveScript(name);
    setPhaseStep(0);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (!selectedScripts.includes(activeScript)) {
      setActiveScript(selectedScripts[0] || '');
      setPhaseStep(0);
    }
  }, [selectedScripts, activeScript]);

  useEffect(() => {
    if (!activeScript || selectedScripts.length === 0) {
      setDrawerOpen(false);
    }
  }, [activeScript, selectedScripts.length]);

  const filteredScripts = scripts.filter((s) =>
    s.name.toLowerCase().includes(scriptQuery.toLowerCase())
  );

  const argsString = selectedScripts
    .map((s) => scriptOptions[s])
    .filter(Boolean)
    .join(',');
  const command = `nmap ${portFlag} ${
    selectedScripts.length ? `--script ${selectedScripts.join(',')}` : ''
  } ${argsString ? `--script-args ${argsString}` : ''} ${target}`
    .replace(/\s+/g, ' ')
    .trim();

  const activeScriptMeta = scripts.find((s) => s.name === activeScript);
  const drawerVisible = isDrawerOpen && !!activeScriptMeta;

  const buildScriptSnippet = (script) => {
    if (!script) return '';
    const baseTarget = target || 'example.com';
    const argExamples = (script.arguments || [])
      .map((arg) => arg.example)
      .filter(Boolean);
    const argsValue = argExamples.length
      ? ` --script-args ${argExamples.join(',')}`
      : '';
    return `nmap --script ${script.name}${argsValue} ${baseTarget}`
      .replace(/\s+/g, ' ')
      .trim();
  };

  const copyScriptSnippet = async () => {
    const snippet = buildScriptSnippet(activeScriptMeta);
    if (!snippet) return;
    if (typeof window !== 'undefined') {
      try {
        await navigator.clipboard.writeText(snippet);
        setToast('Script snippet copied');
      } catch (e) {
        // ignore
      }
    }
  };

  const closeDrawer = () => setDrawerOpen(false);

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

  return (
    <div className="flex flex-col md:flex-row h-full w-full text-white">
      <div className="md:w-1/2 p-4 bg-ub-dark overflow-y-auto relative">
        <h1 className="text-lg mb-4">Nmap NSE Demo</h1>
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
            aria-label="Target"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1" htmlFor="scripts">
            Scripts
          </label>
          <input
            id="scripts"
            value={scriptQuery}
            onChange={(e) => setScriptQuery(e.target.value)}
            placeholder="Search scripts"
            className="w-full p-2 text-black mb-2"
            aria-label="Search scripts"
          />
          <div className="max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredScripts.map((s) => (
              <div key={s.name} className="bg-white text-black p-2 rounded">
                <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedScripts.includes(s.name)}
                      onChange={() => toggleScript(s.name)}
                      aria-label={s.name}
                    />
                  <span className="font-mono">{s.name}</span>
                </label>
                <p className="text-xs mb-1">{s.description}</p>
                <div className="flex flex-wrap gap-1 mb-1">
                  {s.categories.map((t) => (
                    <span key={t} className="px-1 text-xs bg-gray-200 rounded">
                      {t}
                    </span>
                  ))}
                </div>
                  {selectedScripts.includes(s.name) && (
                    <input
                      type="text"
                      value={scriptOptions[s.name] || ''}
                      onChange={(e) =>
                        setScriptOptions((prev) => ({
                          ...prev,
                          [s.name]: e.target.value,
                        }))
                      }
                      placeholder="arg=value"
                      className="w-full p-1 border rounded text-black"
                      aria-label={`${s.name} arguments`}
                    />
                  )}
              </div>
            ))}
            {filteredScripts.length === 0 && (
              <p className="text-sm">No scripts found.</p>
            )}
          </div>
        </div>
        <aside
          className={`transition-all duration-300 overflow-hidden border border-ub-grey rounded bg-gray-900 ${
            drawerVisible ? 'max-h-[480px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0 pointer-events-none'
          }`}
          role="complementary"
          aria-label="Script details"
          aria-labelledby="script-drawer-title"
          aria-hidden={!drawerVisible}
        >
          {activeScriptMeta && (
            <div className="p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 id="script-drawer-title" className="text-lg font-mono">
                    {activeScriptMeta.name}
                  </h2>
                  <p className="text-sm text-gray-200">
                    {activeScriptMeta.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="px-2 py-1 text-xs uppercase tracking-wide bg-ub-grey text-black rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
                  aria-label="Close script details"
                >
                  Close
                </button>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-400">
                  Categories
                </h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  {activeScriptMeta.categories.length > 0 ? (
                    activeScriptMeta.categories.map((category) => (
                      <span
                        key={category}
                        className="px-2 py-0.5 bg-gray-800 rounded text-xs font-mono"
                      >
                        {category}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">Uncategorized</span>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-400">
                  Arguments
                </h3>
                {activeScriptMeta.arguments?.length ? (
                  <ul className="mt-1 space-y-1 text-xs">
                    {activeScriptMeta.arguments.map((arg) => (
                      <li key={arg.name} className="border border-gray-800 rounded p-2 bg-black/40">
                        <p className="font-mono text-ub-yellow">{arg.name}</p>
                        <p className="text-gray-200">{arg.description}</p>
                        {arg.example && (
                          <p className="text-gray-400">
                            Example: <span className="font-mono">{arg.example}</span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">No custom arguments for this script.</p>
                )}
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-400">
                  Command snippet
                </h3>
                <pre className="mt-1 bg-black text-green-400 p-2 rounded overflow-auto">
                  {buildScriptSnippet(activeScriptMeta)}
                </pre>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyScriptSnippet}
                  className="px-2 py-1 bg-ub-grey text-black rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
                >
                  Copy script snippet
                </button>
                <a
                  href={NSE_DOCS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 bg-blue-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
                >
                  View docs
                </a>
              </div>
            </div>
          )}
        </aside>
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
      </div>
      <div className="md:w-1/2 p-4 bg-black overflow-y-auto">
        <h2 className="text-lg mb-2">Script phases</h2>
        {activeScript ? (
          <>
            <p className="text-sm mb-1">
              Phases for <span className="font-mono">{activeScript}</span>
            </p>
            <div className="flex space-x-2 mb-2">
              {phases.map((p) => (
                <div
                  key={p}
                  className={`flex-1 p-2 text-center rounded ${
                    scriptPhases[activeScript]?.includes(p)
                      ? phaseStep >= scriptPhases[activeScript].indexOf(p)
                        ? 'bg-blue-600'
                        : 'bg-gray-700'
                      : 'bg-gray-800'
                  }`}
                >
                  {p}
                </div>
              ))}
            </div>
            {scriptPhases[activeScript] && (
              <p className="text-sm mb-2">
                {phaseInfo[scriptPhases[activeScript][phaseStep]]?.description}{' '}
                <span className="text-gray-400">
                  Example: {phaseInfo[scriptPhases[activeScript][phaseStep]]?.example}
                </span>
              </p>
            )}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() =>
                  setPhaseStep((s) =>
                    Math.min(
                      s + 1,
                      (scriptPhases[activeScript]?.length || 1) - 1
                    )
                  )
                }
                className="px-2 py-1 bg-ub-grey text-black rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
              >
                Step
              </button>
              <button
                type="button"
                onClick={() => setPhaseStep(0)}
                className="px-2 py-1 bg-ub-grey text-black rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow"
              >
                Reset
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm mb-4">Select a script to view phases.</p>
        )}
        <h2 className="text-lg mb-2">Topology</h2>
        <DiscoveryMap hosts={results.hosts} />
        <h2 className="text-lg mb-2">Parsed output</h2>
        <ul className="mb-4 space-y-2">
          {results.hosts.map((host) => (
            <li key={host.ip}>
              <div className="text-blue-400 font-mono">{host.ip}</div>
              <ul className="ml-4 space-y-1">
                {host.ports.map((p) => (
                  <li key={p.port}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {p.port}/tcp {p.service}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs ${cvssColor(p.cvss)}`}
                        aria-label={`CVSS score ${p.cvss}`}
                      >
                        CVSS {p.cvss}
                      </span>
                    </div>
                    {p.scripts?.length > 0 && (
                      <ul className="ml-4 mt-1 space-y-1">
                        {p.scripts.map((sc) => {
                          const meta = scripts.find((s) => s.name === sc.name);
                          return (
                            <li key={sc.name}>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono">{sc.name}</span>
                                {meta && (
                                  <div className="flex flex-wrap gap-1">
                                    {meta.categories.map((t) => (
                                      <span
                                        key={t}
                                        className="px-1.5 py-0.5 rounded text-xs bg-gray-700"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {sc.output && (
                                <pre className="ml-4 text-green-400 whitespace-pre-wrap">
                                  {sc.output}
                                </pre>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
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
