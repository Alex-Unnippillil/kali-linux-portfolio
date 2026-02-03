import React, { useEffect, useRef, useState } from 'react';
import Toast from '../../ui/Toast';
import SimulationBanner from '../SimulationBanner';
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

const scenarioPresets = [
  {
    id: 'web-app',
    label: 'Public Web App',
    target: 'shop.example.lab',
    scripts: ['http-title', 'http-enum', 'ssl-cert'],
    note: 'Simulated public web application audit. Review visible HTTP metadata only.'
  },
  {
    id: 'file-server',
    label: 'Internal File Server',
    target: '10.20.30.15',
    scripts: ['smb-os-discovery', 'ftp-anon'],
    note: 'Simulated internal host reconnaissance for SMB/FTP exposure.'
  },
  {
    id: 'dns',
    label: 'DNS Inventory',
    target: 'corp.lab',
    scripts: ['dns-brute'],
    note: 'Simulated DNS enumeration using curated wordlists.'
  }
];

const cvssColor = (score) => {
  if (score >= 9) return 'bg-kali-severity-critical';
  if (score >= 7) return 'bg-kali-severity-high';
  if (score >= 4) return 'bg-kali-severity-medium';
  return 'bg-kali-severity-low';
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
  const [activeScenarioId, setActiveScenarioId] = useState(scenarioPresets[0].id);
  const [scenarioNote, setScenarioNote] = useState(scenarioPresets[0].note);
  const [showHelp, setShowHelp] = useState(false);
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

  const applyScenario = () => {
    const preset = scenarioPresets.find((s) => s.id === activeScenarioId);
    if (!preset) return;
    setTarget(preset.target);
    setSelectedScripts(preset.scripts);
    setActiveScript(preset.scripts[0] || '');
    setPhaseStep(0);
    setScenarioNote(preset.note);
    setToast(`Loaded ${preset.label} scenario`);
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
        <span key={idx} className={highlight ? 'text-kali-info' : undefined}>
          {line}
          {'\n'}
        </span>
      );
    });
  };

  return (
    <div className="flex h-full w-full flex-col text-kali-text md:flex-row">
      <div className="md:w-1/2 overflow-y-auto bg-kali-surface p-4">
        <h1 className="mb-4 text-lg font-semibold">Nmap NSE Demo</h1>
        <SimulationBanner
          toolName="Nmap NSE"
          message="Simulated scripts and outputs. Commands are build-only; no packets are sent."
          className="mb-4"
        />
        <button
          type="button"
          onClick={() => setShowHelp((prev) => !prev)}
          className="mb-4 rounded border border-white/10 bg-kali-surface-muted/80 px-3 py-2 text-sm text-white/80 hover:text-white"
          aria-expanded={showHelp}
        >
          {showHelp ? 'Hide' : 'About this tool'}
        </button>
        {showHelp && (
          <div className="mb-4 rounded border border-white/10 bg-kali-surface-muted/80 p-3 text-sm text-white/80">
            <p className="font-semibold text-white">Nmap NSE walkthrough</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                NSE scripts simulate reconnaissance modules such as HTTP discovery,
                SMB fingerprinting, and DNS enumeration.
              </li>
              <li>
                Adjust the port preset and script arguments to see how the command
                line changes in a real scan.
              </li>
              <li>
                Output shown here is curated for learning and does not probe any
                live hosts.
              </li>
            </ul>
          </div>
        )}
        <div className="mb-4 rounded border border-kali-severity-medium/60 bg-kali-severity-medium/15 p-3">
          <p className="text-sm font-semibold">
            Educational use only. Do not scan systems without permission.
          </p>
        </div>
        <div className="mb-4 rounded-lg border border-white/10 bg-kali-surface-muted/80 p-3">
          <p className="mb-2 text-sm font-semibold">Guided scenario</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={activeScenarioId}
              onChange={(e) => setActiveScenarioId(e.target.value)}
              className="rounded border border-white/10 bg-kali-dark px-3 py-2 text-sm text-kali-text"
              aria-label="Select guided scenario"
            >
              {scenarioPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={applyScenario}
              className="rounded px-3 py-2 text-sm font-medium text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus bg-kali-control"
            >
              Load Scenario
            </button>
          </div>
          <p className="mt-2 text-xs text-white/70">{scenarioNote}</p>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm" htmlFor="target">
            Target
          </label>
          <input
            type="text"
            id="target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Scan target"
            className="w-full rounded-lg border border-white/10 bg-kali-dark px-3 py-2 text-sm text-kali-text placeholder-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm" htmlFor="scripts">
            Scripts
          </label>
          <input
            type="search"
            id="scripts"
            value={scriptQuery}
            onChange={(e) => setScriptQuery(e.target.value)}
            placeholder="Search scripts"
            aria-label="Search scripts"
            className="mb-2 w-full rounded-lg border border-white/10 bg-kali-dark px-3 py-2 text-sm text-kali-text placeholder-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          />
          <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {filteredScripts.map((s) => (
              <div
                key={s.name}
                className="rounded-lg border border-white/5 bg-kali-surface-muted/90 p-3 text-sm text-kali-text shadow-sm"
              >
                <label className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedScripts.includes(s.name)}
                    onChange={() => toggleScript(s.name)}
                    aria-label={`Toggle ${s.name}`}
                  />
                  <span className="font-mono">{s.name}</span>
                </label>
                <p className="mb-1 text-xs text-white/80">{s.description}</p>
                <div className="mb-1 flex flex-wrap gap-1">
                  {s.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-white/80 bg-kali-info/20"
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
                    className="w-full rounded border border-white/10 bg-kali-dark/80 px-2 py-1 text-sm text-kali-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
          <p className="mb-1 block text-sm">Port presets</p>
          <div className="flex gap-2">
            {portPresets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPortFlag(p.flag)}
                className={`rounded px-3 py-1 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                  portFlag === p.flag
                    ? 'bg-kali-control text-black shadow-[0_0_0_1px_rgba(255,255,255,0.2)]'
                    : 'bg-kali-surface-muted text-white/80 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4 flex items-center gap-2">
          <pre className="flex-1 overflow-auto rounded border border-white/10 bg-kali-dark px-3 py-2 font-mono text-sm text-kali-terminal">
            {command}
          </pre>
          <button
            type="button"
            onClick={copyCommand}
            className="rounded px-3 py-1 text-sm font-medium text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus bg-kali-surface-muted hover:bg-kali-surface-raised/90"
          >
            Copy Command
          </button>
        </div>
      </div>
      <div className="md:w-1/2 overflow-y-auto bg-kali-surface-raised p-4">
        {scenarioNote && (
          <div className="mb-4 rounded border border-white/10 bg-kali-surface/80 p-3 text-sm text-white/80">
            <p className="font-semibold text-white">Scenario summary</p>
            <p>{scenarioNote}</p>
          </div>
        )}
        <h2 className="mb-2 text-lg font-semibold">Script phases</h2>
        {activeScript ? (
          <>
            <p className="mb-1 text-sm">
              Phases for <span className="font-mono text-white/90">{activeScript}</span>
            </p>
            <div className="mb-2 flex space-x-2">
              {phases.map((p) => (
                <div
                  key={p}
                  className={`flex-1 rounded px-2 py-1 text-center text-sm font-semibold uppercase tracking-wide ${
                    scriptPhases[activeScript]?.includes(p)
                      ? phaseStep >= scriptPhases[activeScript].indexOf(p)
                        ? 'bg-kali-info text-kali-inverse shadow-[0_0_0_1px_rgba(255,255,255,0.08)]'
                        : 'bg-kali-info/30 text-white/80'
                      : 'bg-kali-surface-muted text-white/60'
                  }`}
                >
                  {p}
                </div>
              ))}
            </div>
            {scriptPhases[activeScript] && (
              <p className="mb-2 text-sm text-white/80">
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
                className="rounded px-3 py-1 text-sm font-medium text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus bg-kali-surface-muted hover:bg-kali-surface/80"
              >
                Step
              </button>
              <button
                type="button"
                onClick={() => setPhaseStep(0)}
                className="rounded px-3 py-1 text-sm font-medium text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus bg-kali-surface-muted hover:bg-kali-surface/80"
              >
                Reset
              </button>
            </div>
          </>
        ) : (
          <p className="mb-4 text-sm text-white/70">Select a script to view phases.</p>
        )}
        <h2 className="mb-2 text-lg font-semibold">Topology</h2>
        <DiscoveryMap hosts={results.hosts} />
        <h2 className="mb-2 text-lg font-semibold">Parsed output</h2>
        <ul className="mb-4 space-y-2 text-sm">
          {results.hosts.map((host) => (
            <li key={host.ip} className="rounded border border-white/5 bg-kali-surface/80 p-3">
              <div className="font-mono text-kali-info">{host.ip}</div>
              <ul className="ml-4 mt-2 space-y-2">
                {host.ports.map((p) => (
                  <li key={p.port} className="rounded bg-kali-surface-muted/70 p-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-white">
                        {p.port}/tcp {p.service}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold text-white ${cvssColor(p.cvss)}`}
                        aria-label={`CVSS score ${p.cvss}`}
                      >
                        CVSS {p.cvss}
                      </span>
                    </div>
                    {p.scripts?.length > 0 && (
                      <ul className="ml-4 mt-2 space-y-2">
                        {p.scripts.map((sc) => {
                          const meta = scripts.find((s) => s.name === sc.name);
                          return (
                            <li key={sc.name} className="rounded bg-kali-surface/70 p-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-white/90">{sc.name}</span>
                                {meta && (
                                  <div className="flex flex-wrap gap-1">
                                    {meta.tags.map((t) => (
                                      <span
                                        key={t}
                                        className="rounded px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-white/80 bg-kali-info/20"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {sc.output && (
                                <pre className="ml-4 mt-1 whitespace-pre-wrap text-kali-terminal">
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
        <h2 className="mb-2 text-lg font-semibold">Example output</h2>
        <div
          ref={outputRef}
          tabIndex={0}
          onKeyDown={handleOutputKey}
          className="whitespace-pre-wrap rounded border border-white/5 bg-kali-surface/80 p-3 font-mono text-sm text-kali-terminal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
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
            className="rounded px-3 py-1 text-sm font-medium text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus bg-kali-surface-muted hover:bg-kali-surface/80"
          >
            Copy Output
          </button>
          <button
            type="button"
            onClick={selectOutput}
            className="rounded px-3 py-1 text-sm font-medium text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus bg-kali-surface-muted hover:bg-kali-surface/80"
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
