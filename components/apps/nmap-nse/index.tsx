import React, { useEffect, useMemo, useRef, useState } from 'react';
import Toast from '../../ui/Toast';
import DiscoveryMap from './DiscoveryMap';
import {
  generateServiceReport,
  cloneServiceReport,
} from '@/utils/faker/services';
import type { ServiceReport } from '@/utils/faker/services';

type ScriptMeta = {
  name: string;
  description: string;
  tags: string[];
};

type ScriptExamples = Record<string, string>;
type ScriptOptionMap = Record<string, string>;

type ScriptRunResult = {
  name: string;
  output: string;
};

type PortResult = {
  port: number;
  service: string;
  cvss: number;
  scripts?: ScriptRunResult[];
};

type HostResult = {
  ip: string;
  ports: PortResult[];
};

type NmapResults = {
  hosts: HostResult[];
};

// Basic script metadata. Example output is loaded from public/demo/nmap-nse.json
const scripts: ScriptMeta[] = [
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

const FALLBACK_SEED = 'nmap-nse-demo';
export const NMAP_NSE_FALLBACK_SEED = FALLBACK_SEED;

const cvssColor = (score) => {
  if (score >= 9) return 'bg-red-700';
  if (score >= 7) return 'bg-orange-700';
  if (score >= 4) return 'bg-yellow-700';
  return 'bg-green-700';
};

const NmapNSEApp = () => {
  const [target, setTarget] = useState<string>('example.com');
  const [selectedScripts, setSelectedScripts] = useState<string[]>([
    scripts[0].name,
  ]);
  const [scriptQuery, setScriptQuery] = useState<string>('');
  const [portFlag, setPortFlag] = useState<string>('');
  const fallbackReport = useMemo(
    () => generateServiceReport({ seed: FALLBACK_SEED }),
    []
  );
  const fallbackRef = useRef<ServiceReport>(fallbackReport);
  const initialClone = useMemo<ServiceReport>(
    () => cloneServiceReport(fallbackRef.current),
    []
  );
  const [examples, setExamples] = useState<ScriptExamples>(
    initialClone.scriptExamples
  );
  const [results, setResults] = useState<NmapResults>({
    hosts: initialClone.hosts as HostResult[],
  });
  const [scriptOptions, setScriptOptions] = useState<ScriptOptionMap>({});
  const [activeScript, setActiveScript] = useState<string>(scripts[0].name);
  const [phaseStep, setPhaseStep] = useState<number>(0);
  const [toast, setToast] = useState<string>('');
  const outputRef = useRef<HTMLDivElement | null>(null);
  const phases = ['prerule', 'hostrule', 'portrule'];

  useEffect(() => {
    let cancelled = false;
    const fallbackClone = (): ServiceReport => cloneServiceReport(fallbackRef.current);

    const loadExamples = async () => {
      try {
        const res = await fetch('/demo/nmap-nse.json');
        const json = (await res.json()) as ScriptExamples;
        if (cancelled) return;
        if (json && Object.keys(json).length > 0) {
          setExamples(json);
        } else {
          const fallback = fallbackClone();
          setExamples(fallback.scriptExamples);
        }
      } catch {
        if (!cancelled) {
          const fallback = fallbackClone();
          setExamples(fallback.scriptExamples);
        }
      }
    };

    const loadResults = async () => {
      try {
        const res = await fetch('/demo/nmap-results.json');
        const json = (await res.json()) as Partial<NmapResults>;
        if (cancelled) return;
        if (json?.hosts?.length) {
          setResults(json as NmapResults);
        } else {
          const fallback = fallbackClone();
          setResults({ hosts: fallback.hosts as HostResult[] });
        }
      } catch {
        if (!cancelled) {
          const fallback = fallbackClone();
          setResults({ hosts: fallback.hosts as HostResult[] });
        }
      }
    };

    loadExamples();
    loadResults();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleScript = (name: string) => {
    setSelectedScripts((prev: string[]) => {
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
    .filter((value): value is string => Boolean(value))
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
        <span key={idx} className={highlight ? 'text-yellow-300' : undefined}>
          {line}
          {'\n'}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full text-white">
      <div className="md:w-1/2 p-4 bg-ub-dark overflow-y-auto">
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
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-2 text-black"
            aria-label="Target host"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1" htmlFor="scripts">
            Scripts
          </label>
          <input
            id="scripts"
            type="text"
            value={scriptQuery}
            onChange={(e) => setScriptQuery(e.target.value)}
            placeholder="Search scripts"
            className="w-full p-2 text-black mb-2"
            aria-label="Search scripts"
          />
          <div className="max-h-64 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredScripts.map((s) => (
              <div key={s.name} className="bg-white text-black p-2 rounded">
                <label
                  className="flex items-center space-x-2"
                  htmlFor={`script-toggle-${s.name}`}
                >
                  <input
                    id={`script-toggle-${s.name}`}
                    type="checkbox"
                    checked={selectedScripts.includes(s.name)}
                    onChange={() => toggleScript(s.name)}
                    aria-label={`Toggle script ${s.name}`}
                  />
                  <span className="font-mono">{s.name}</span>
                </label>
                <p className="text-xs mb-1">{s.description}</p>
                <div className="flex flex-wrap gap-1 mb-1">
                  {s.tags.map((t) => (
                    <span key={t} className="px-1 text-xs bg-gray-200 rounded">
                      {t}
                    </span>
                  ))}
                </div>
                {selectedScripts.includes(s.name) && (
                  <div className="mt-1">
                    <label
                      className="sr-only"
                      htmlFor={`script-option-${s.name}`}
                    >
                      Arguments for {s.name}
                    </label>
                    <input
                      id={`script-option-${s.name}`}
                      type="text"
                      value={scriptOptions[s.name] || ''}
                      onChange={(e) =>
                        setScriptOptions((prev: ScriptOptionMap) => ({
                          ...prev,
                          [s.name]: e.target.value,
                        }))
                      }
                      placeholder="arg=value"
                      className="w-full p-1 border rounded text-black"
                      aria-label={`Arguments for ${s.name}`}
                    />
                  </div>
                )}
              </div>
            ))}
            {filteredScripts.length === 0 && (
              <p className="text-sm">No scripts found.</p>
            )}
          </div>
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
                  setPhaseStep((s: number) =>
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
                                    {meta.tags.map((t) => (
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
