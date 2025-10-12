import React, { useEffect, useRef, useState } from 'react';
import Toast from '../../ui/Toast';
import DiscoveryMap from './DiscoveryMap';

// Basic script metadata. Example output is loaded from public/demo/nmap-nse.json
const scripts = [
  {
    name: 'http-title',
    description: 'Fetches page titles from HTTP services.',
    tags: ['discovery', 'http']
  },
  {
    name: 'ssl-cert',
    description: 'Retrieves TLS certificate information.',
    tags: ['ssl', 'discovery']
  },
  {
    name: 'smb-os-discovery',
    description: 'Discovers remote OS information via SMB.',
    tags: ['smb', 'discovery']
  },
  {
    name: 'ftp-anon',
    description: 'Checks for anonymous FTP access.',
    tags: ['ftp', 'auth']
  },
  {
    name: 'http-enum',
    description: 'Enumerates directories on web servers.',
    tags: ['http', 'vuln']
  },
  {
    name: 'dns-brute',
    description: 'Performs DNS subdomain brute force enumeration.',
    tags: ['dns', 'brute']
  }
];

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

const cvssBadgeClass = (score) => {
  if (score >= 9)
    return 'bg-kali-danger-surface text-kali-status-on-dark border border-kali-danger-border';
  if (score >= 7)
    return 'bg-kali-warning-surface text-kali-status-on-dark border border-kali-warning-border';
  if (score >= 4)
    return 'bg-kali-info-surface text-kali-status-on-dark border border-kali-info-border';
  return 'bg-kali-success-surface text-kali-status-on-dark border border-kali-success-border';
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
  };

  useEffect(() => {
    if (!selectedScripts.includes(activeScript)) {
      setActiveScript(selectedScripts[0] || '');
      setPhaseStep(0);
    }
  }, [selectedScripts, activeScript]);

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
        <span key={idx} className={highlight ? 'text-kali-warning' : undefined}>
          {line}
          {'\n'}
        </span>
      );
    });
  };

  return (
    <div className="flex h-full w-full flex-col text-kali-status-on-dark md:flex-row">
      <div className="md:w-1/2 overflow-y-auto bg-kali-surface p-4">
        <h1 className="mb-4 text-lg">Nmap NSE Demo</h1>
        <div className="mb-4 rounded border-l-4 border-kali-warning-border bg-kali-warning-surface p-3 text-sm text-kali-status-on-dark shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <p className="text-sm font-bold">
            Educational use only. Do not scan systems without permission.
          </p>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium" htmlFor="target">
            Target
          </label>
          <input
            id="target"
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Target"
            className="w-full rounded border border-white/10 bg-white/10 p-2 text-kali-status-on-dark placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-kali-info focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface)]"
          />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium" htmlFor="scripts">
            Scripts
          </label>
          <input
            id="scripts"
            type="text"
            value={scriptQuery}
            onChange={(e) => setScriptQuery(e.target.value)}
            placeholder="Search scripts"
            aria-label="Search scripts"
            className="mb-2 w-full rounded border border-white/10 bg-white/10 p-2 text-kali-status-on-dark placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-kali-info focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface)]"
          />
          <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {filteredScripts.map((s) => (
              <div
                key={s.name}
                className="rounded border border-white/10 bg-white/5 p-3 text-sm shadow-sm shadow-black/20"
              >
                <label className="flex items-center gap-2 text-kali-status-on-dark">
                  <input
                    type="checkbox"
                    aria-label={`Toggle ${s.name}`}
                    checked={selectedScripts.includes(s.name)}
                    onChange={() => toggleScript(s.name)}
                  />
                  <span className="font-mono">{s.name}</span>
                </label>
                <p className="mb-1 text-xs text-white/70">{s.description}</p>
                <div className="mb-1 flex flex-wrap gap-1">
                  {s.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded border border-kali-info-border bg-kali-info-surface px-1.5 py-0.5 text-xs text-kali-status-on-dark"
                    >
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
                    aria-label={`${s.name} script arguments`}
                    className="w-full rounded border border-white/10 bg-white/10 p-1 text-kali-status-on-dark placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-kali-info focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface)]"
                  />
                )}
              </div>
            ))}
            {filteredScripts.length === 0 && (
              <p className="text-sm text-white/70">No scripts found.</p>
            )}
          </div>
        </div>
        <div className="mb-4">
          <p className="mb-1 text-sm font-medium">Port presets</p>
          <div className="flex flex-wrap gap-2">
            {portPresets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPortFlag(p.flag)}
                aria-pressed={portFlag === p.flag}
                className={`rounded border px-2 py-1 text-sm transition focus:outline-none focus:ring-2 focus:ring-kali-info focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface)] ${
                  portFlag === p.flag
                    ? 'border-kali-info-border bg-kali-info-surface text-kali-status-on-dark'
                    : 'border-white/10 bg-white/5 text-kali-status-on-dark hover:bg-white/10'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4 flex items-start gap-2">
          <pre className="flex-1 overflow-auto rounded border border-white/10 bg-kali-dark p-2 font-mono text-[color:var(--color-terminal)]">
            {command}
          </pre>
          <button
            type="button"
            onClick={copyCommand}
            className="rounded border border-white/10 bg-white/10 px-2 py-1 text-sm text-kali-status-on-dark transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-kali-info focus:ring-offset-2 focus:ring-offset-[color:var(--color-surface)]"
          >
            Copy Command
          </button>
        </div>
      </div>
      <div className="md:w-1/2 overflow-y-auto bg-kali-dark p-4">
        <h2 className="mb-2 text-lg font-semibold">Script phases</h2>
        {activeScript ? (
          <>
            <p className="mb-1 text-sm text-white/80">
              Phases for <span className="font-mono">{activeScript}</span>
            </p>
            <div className="mb-2 flex gap-2">
              {phases.map((p) => (
                <div
                  key={p}
                  className={`flex-1 rounded border px-2 py-2 text-center text-xs font-medium uppercase tracking-wide ${
                    scriptPhases[activeScript]?.includes(p)
                      ? phaseStep >= scriptPhases[activeScript].indexOf(p)
                        ? 'border-kali-info-border bg-kali-info-surface text-kali-status-on-dark'
                        : 'border-white/10 bg-white/10 text-white/70'
                      : 'border-white/5 bg-white/5 text-white/50'
                  }`}
                >
                  {p}
                </div>
              ))}
            </div>
            {scriptPhases[activeScript] && (
              <p className="mb-2 text-sm text-white/75">
                {phaseInfo[scriptPhases[activeScript][phaseStep]]?.description}{' '}
                <span className="text-white/60">
                  Example: {phaseInfo[scriptPhases[activeScript][phaseStep]]?.example}
                </span>
              </p>
            )}
            <div className="mb-4 flex gap-2">
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
                className="rounded border border-white/10 bg-white/10 px-2 py-1 text-sm text-kali-status-on-dark transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-kali-info focus:ring-offset-2 focus:ring-offset-[color:var(--color-dark)]"
              >
                Step
              </button>
              <button
                type="button"
                onClick={() => setPhaseStep(0)}
                className="rounded border border-white/10 bg-white/10 px-2 py-1 text-sm text-kali-status-on-dark transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-kali-info focus:ring-offset-2 focus:ring-offset-[color:var(--color-dark)]"
              >
                Reset
              </button>
            </div>
          </>
        ) : (
          <p className="mb-4 text-sm text-white/70">Select a script to view phases.</p>
        )}
        <h2 className="text-lg mb-2">Topology</h2>
        <DiscoveryMap hosts={results.hosts} />
        <h2 className="text-lg mb-2">Parsed output</h2>
        <ul className="mb-4 space-y-2">
          {results.hosts.map((host) => (
            <li key={host.ip}>
              <div className="font-mono text-kali-info">{host.ip}</div>
              <ul className="ml-4 space-y-1">
                {host.ports.map((p) => (
                  <li key={p.port}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">
                        {p.port}/tcp {p.service}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold ${cvssBadgeClass(p.cvss)}`}
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
                                    {meta.tags.map((t) => (
                                      <span
                                        key={t}
                                        className="rounded border border-kali-info-border bg-kali-info-surface px-1.5 py-0.5 text-xs text-kali-status-on-dark"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {sc.output && (
                                <pre className="ml-4 whitespace-pre-wrap text-[color:var(--color-terminal)]">
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
          className="whitespace-pre-wrap text-[color:var(--color-terminal)]"
        >
          {selectedScripts.length === 0 && 'Select scripts to view sample output.'}
          {selectedScripts.map((s) => (
            <div key={s} className="mb-4">
              <h3 className="font-mono text-kali-info">{s}</h3>
              <pre>{renderOutput(examples[s])}</pre>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={copyOutput}
            className="rounded border border-white/10 bg-white/10 px-2 py-1 text-sm text-kali-status-on-dark transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-kali-info focus:ring-offset-2 focus:ring-offset-[color:var(--color-dark)]"
          >
            Copy Output
          </button>
          <button
            type="button"
            onClick={selectOutput}
            className="rounded border border-white/10 bg-white/10 px-2 py-1 text-sm text-kali-status-on-dark transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-kali-info focus:ring-offset-2 focus:ring-offset-[color:var(--color-dark)]"
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
