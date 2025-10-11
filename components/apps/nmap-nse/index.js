import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import LabMode from '../../LabMode';
import CommandBuilder from '../../CommandBuilder';
import Toast from '../../ui/Toast';
import DiscoveryMap from './DiscoveryMap';
import scriptCatalog from '../../../public/demo-data/nmap/scripts.json';
import outputFixture from '../../../public/demo/nmap-nse.json';
import resultsFixture from '../../../public/demo/nmap-results.json';

const FALLBACK_PHASES = {
  discovery: ['portrule'],
  vuln: ['hostrule'],
  safe: ['portrule'],
};

const PHASE_DETAILS = {
  prerule: {
    description:
      'Runs before any hosts are scanned. Often used for broadcast discovery.',
    example: 'broadcast-dhcp-discover',
  },
  hostrule: {
    description: 'Runs once for each target host.',
    example: 'smb-os-discovery',
  },
  portrule: {
    description: 'Runs once for each target port.',
    example: 'http-title',
  },
  postrule: {
    description: 'Runs after all hosts/ports are processed to summarise findings.',
    example: 'vuln-summary',
  },
};

const PHASE_ORDER = ['prerule', 'hostrule', 'portrule', 'postrule'];

const PORT_PRESETS = [
  { label: 'Default', flag: '' },
  { label: 'Common', flag: '-F' },
  { label: 'Full', flag: '-p-' },
];

const buildLibrary = (catalog) =>
  Object.entries(catalog).flatMap(([tag, scripts]) =>
    scripts.map((script) => ({
      name: script.name,
      description: script.description,
      categories: script.categories || [tag],
      phases: script.phases || FALLBACK_PHASES[tag] || ['hostrule'],
      argsHint: script.argsHint || '',
      example: script.example || '',
    }))
  );

const baseLibrary = buildLibrary(scriptCatalog);

const fallbackExamples = baseLibrary.reduce(
  (acc, script) => {
    if (script.example) {
      acc[script.name] = script.example;
    }
    return acc;
  },
  { ...outputFixture }
);

const cvssColor = (score) => {
  if (score >= 9) return 'bg-red-700';
  if (score >= 7) return 'bg-orange-700';
  if (score >= 4) return 'bg-yellow-700';
  return 'bg-green-700';
};

const highlightLine = (line) => /open|allowed|potential|vulnerable|high/i.test(line);

const buildLibraryFromFetch = (data) => {
  try {
    return buildLibrary(data);
  } catch (err) {
    return [];
  }
};

const NmapNSEApp = () => {
  const [library, setLibrary] = useState(baseLibrary);
  const [target, setTarget] = useState('scanme.nmap.org');
  const [scriptQuery, setScriptQuery] = useState('');
  const [selectedScripts, setSelectedScripts] = useState(() =>
    baseLibrary[0] ? [baseLibrary[0].name] : []
  );
  const [activeScript, setActiveScript] = useState(
    () => baseLibrary[0]?.name || ''
  );
  const [phaseStep, setPhaseStep] = useState(0);
  const [portFlag, setPortFlag] = useState('');
  const [scriptOptions, setScriptOptions] = useState({});
  const [examples, setExamples] = useState(fallbackExamples);
  const [results, setResults] = useState(resultsFixture);
  const [toast, setToast] = useState('');
  const [commandString, setCommandString] = useState('');
  const outputRef = useRef(null);

  const scriptMap = useMemo(() => {
    return library.reduce((acc, script) => {
      acc[script.name] = script;
      return acc;
    }, {});
  }, [library]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch('/demo-data/nmap/scripts.json', {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          const nextLibrary = buildLibraryFromFetch(json);
          if (nextLibrary.length) {
            setLibrary(nextLibrary);
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          // ignore
        }
      }

      try {
        const res = await fetch('/demo/nmap-nse.json', {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          setExamples((prev) => ({ ...prev, ...json }));
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          // ignore
        }
      }

      try {
        const res = await fetch('/demo/nmap-results.json', {
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.hosts) {
            setResults(json);
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          // ignore
        }
      }
    };

    load();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedScripts.length && library[0]) {
      setSelectedScripts([library[0].name]);
      setActiveScript(library[0].name);
      setPhaseStep(0);
    }
  }, [library, selectedScripts.length]);

  useEffect(() => {
    if (activeScript && !scriptMap[activeScript]) {
      const fallback = selectedScripts[0] || library[0]?.name || '';
      setActiveScript(fallback);
      setPhaseStep(0);
    }
  }, [activeScript, scriptMap, selectedScripts, library]);

  const buildCommand = useCallback(
    (params) => {
      const resolvedTarget = (params.target || target || '').trim() || 'scanme.nmap.org';
      const extraOpts = (params.opts || '').trim();
      const scriptList = selectedScripts.join(',');
      const argsList = selectedScripts
        .map((name) => scriptOptions[name])
        .filter(Boolean)
        .join(',');

      const segments = ['nmap'];
      if (portFlag) segments.push(portFlag);
      if (extraOpts) segments.push(extraOpts);
      if (scriptList) segments.push(`--script ${scriptList}`);
      if (argsList) segments.push(`--script-args ${argsList}`);
      segments.push(resolvedTarget);

      return segments.join(' ').replace(/\s+/g, ' ').trim();
    },
    [portFlag, scriptOptions, selectedScripts, target]
  );

  const handleBuild = useCallback((cmd) => {
    setCommandString(cmd);
  }, []);

  const filteredScripts = useMemo(() => {
    const query = scriptQuery.toLowerCase();
    return library.filter(
      (script) =>
        script.name.toLowerCase().includes(query) ||
        script.description.toLowerCase().includes(query)
    );
  }, [library, scriptQuery]);

  const toggleScript = (name) => {
    setSelectedScripts((prev) => {
      const exists = prev.includes(name);
      if (exists) {
        return prev.filter((n) => n !== name);
      }
      return [...prev, name];
    });
    setActiveScript(name);
    setPhaseStep(0);
  };

  const copyCommand = async () => {
    if (!commandString) return;
    try {
      await navigator.clipboard.writeText(commandString);
      setToast('Command copied');
    } catch {
      // ignore
    }
  };

  const copyOutput = async () => {
    const text = selectedScripts
      .map((name) => `# ${name}\n${examples[name] || ''}`)
      .join('\n');
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setToast('Output copied');
    } catch {
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
    return text.split('\n').map((line, idx) => (
      <span key={idx} className={highlightLine(line) ? 'text-yellow-300' : undefined}>
        {line}
        {'\n'}
      </span>
    ));
  };

  const activeMeta = activeScript ? scriptMap[activeScript] : null;
  const activePhases = activeMeta?.phases || [];

  useEffect(() => {
    if (activePhases.length && phaseStep >= activePhases.length) {
      setPhaseStep(activePhases.length - 1);
    }
    if (!activePhases.length && phaseStep !== 0) {
      setPhaseStep(0);
    }
  }, [activePhases, phaseStep]);

  return (
    <LabMode>
      <div className="flex h-full w-full flex-col text-white md:flex-row">
        <div className="bg-ub-dark p-4 md:w-1/2 md:overflow-y-auto">
          <h1 className="text-lg font-semibold">Nmap NSE Lab</h1>
          <p className="mt-1 mb-4 text-xs text-yellow-200">
            Build safe commands, explore outputs, and keep scans inside this simulated lab.
          </p>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="nmap-target">
              Target host or range
            </label>
            <input
              id="nmap-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded border border-black/40 p-2 text-black"
              placeholder="scanme.nmap.org"
            />
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium" htmlFor="nmap-script-search">
              Script library
            </label>
            <input
              id="nmap-script-search"
              value={scriptQuery}
              onChange={(e) => setScriptQuery(e.target.value)}
              placeholder="Search by name or description"
              className="mb-2 w-full rounded border border-black/40 p-2 text-black"
            />
            <div className="max-h-64 overflow-y-auto rounded border border-white/10 bg-black/30 p-2">
              {filteredScripts.map((script) => (
                <div
                  key={script.name}
                  className="mb-2 rounded bg-white text-black p-2 last:mb-0"
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedScripts.includes(script.name)}
                      onChange={() => toggleScript(script.name)}
                      aria-label={script.name}
                    />
                    <span className="font-mono text-sm">{script.name}</span>
                  </label>
                  <p className="mt-1 text-xs text-gray-700">{script.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {script.categories.map((category) => (
                      <span
                        key={category}
                        className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                  {selectedScripts.includes(script.name) && (
                    <input
                      type="text"
                      value={scriptOptions[script.name] || ''}
                      onChange={(e) =>
                        setScriptOptions((prev) => ({
                          ...prev,
                          [script.name]: e.target.value,
                        }))
                      }
                      placeholder={script.argsHint || 'key=value'}
                      className="mt-2 w-full rounded border border-black/30 p-1 text-xs"
                      aria-label={`Arguments for ${script.name}`}
                    />
                  )}
                </div>
              ))}
              {filteredScripts.length === 0 && (
                <p className="text-xs text-gray-300">No scripts match that query.</p>
              )}
            </div>
          </div>
          <div className="mb-4">
            <p className="mb-1 text-sm font-medium">Port presets</p>
            <div className="flex gap-2">
              {PORT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPortFlag(preset.flag)}
                  className={`rounded px-2 py-1 text-xs font-semibold transition ${
                    portFlag === preset.flag
                      ? 'bg-ub-yellow text-black'
                      : 'bg-ub-grey text-black'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <CommandBuilder
              doc="Craft an NSE command string without executing it. Optional fields let you append additional flags."
              build={buildCommand}
              onBuild={handleBuild}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={copyCommand}
                className="rounded bg-ub-grey px-2 py-1 text-xs font-semibold text-black"
                disabled={!commandString}
              >
                Copy command
              </button>
            </div>
          </div>
        </div>
        <div className="bg-black p-4 md:w-1/2 md:overflow-y-auto">
          <h2 className="text-lg font-semibold">Script phases</h2>
          {activeMeta ? (
            <div className="mb-4">
              <p className="text-xs text-gray-300">
                Phases for <span className="font-mono text-sm text-blue-300">{activeMeta.name}</span>
              </p>
              <div className="mt-2 flex gap-2">
                {PHASE_ORDER.map((phase) => {
                  const index = activePhases.indexOf(phase);
                  const stateClass =
                    index === -1
                      ? 'bg-gray-800'
                      : phaseStep >= index
                      ? 'bg-blue-600'
                      : 'bg-gray-700';
                  return (
                    <div
                      key={phase}
                      className={`flex-1 rounded px-2 py-1 text-center text-xs uppercase tracking-wide ${stateClass}`}
                    >
                      {phase}
                    </div>
                  );
                })}
              </div>
              {activePhases[phaseStep] && (
                <p className="mt-2 text-xs text-gray-200">
                  {PHASE_DETAILS[activePhases[phaseStep]]?.description}{' '}
                  <span className="text-gray-500">
                    Example: {PHASE_DETAILS[activePhases[phaseStep]]?.example}
                  </span>
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPhaseStep((prev) => {
                      if (!activePhases.length) return 0;
                      return Math.min(prev + 1, activePhases.length - 1);
                    })
                  }
                  className="rounded bg-ub-grey px-2 py-1 text-xs font-semibold text-black"
                >
                  Step
                </button>
                <button
                  type="button"
                  onClick={() => setPhaseStep(0)}
                  className="rounded bg-ub-grey px-2 py-1 text-xs font-semibold text-black"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <p className="mb-4 text-sm text-gray-300">Select a script to view its phase progression.</p>
          )}
          <h2 className="text-lg font-semibold">Topology</h2>
          <DiscoveryMap hosts={results.hosts || []} />
          <h2 className="mt-4 text-lg font-semibold">Parsed output</h2>
          <ul className="mb-4 space-y-2">
            {(results.hosts || []).map((host) => (
              <li key={host.ip}>
                <div className="font-mono text-blue-400">{host.ip}</div>
                <ul className="ml-4 space-y-1">
                  {host.ports.map((port) => (
                    <li key={`${host.ip}-${port.port}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {port.port}/tcp {port.service}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cvssColor(port.cvss)}`}
                          aria-label={`CVSS score ${port.cvss}`}
                        >
                          CVSS {port.cvss}
                        </span>
                      </div>
                      {port.scripts?.length > 0 && (
                        <ul className="ml-4 mt-1 space-y-1">
                          {port.scripts.map((script) => {
                            const meta = scriptMap[script.name];
                            return (
                              <li key={script.name}>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs text-white">{script.name}</span>
                                  {meta && (
                                    <div className="flex flex-wrap gap-1">
                                      {meta.categories.map((cat) => (
                                        <span
                                          key={cat}
                                          className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] uppercase"
                                        >
                                          {cat}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {script.output && (
                                  <pre className="ml-4 whitespace-pre-wrap text-[11px] text-green-400">
                                    {script.output}
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
                {host.vulnerabilities?.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1">
                    {host.vulnerabilities.map((vuln, idx) => (
                      <div key={`${host.ip}-vuln-${idx}`} className="text-xs text-red-400">
                        {vuln.id}: {vuln.output}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <h2 className="text-lg font-semibold">Example output</h2>
          <div
            ref={outputRef}
            tabIndex={0}
            onKeyDown={handleOutputKey}
            className="mt-2 whitespace-pre-wrap text-[13px] text-green-400 focus:outline-none"
          >
            {selectedScripts.length === 0 && (
              <p>Select scripts to view sample output.</p>
            )}
            {selectedScripts.map((name) => (
              <div key={name} className="mb-4">
                <h3 className="font-mono text-blue-300">{name}</h3>
                <pre>{renderOutput(examples[name])}</pre>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={copyOutput}
              className="rounded bg-ub-grey px-2 py-1 text-xs font-semibold text-black"
            >
              Copy output
            </button>
            <button
              type="button"
              onClick={selectOutput}
              className="rounded bg-ub-grey px-2 py-1 text-xs font-semibold text-black"
            >
              Select all
            </button>
          </div>
        </div>
        {toast && <Toast message={toast} onClose={() => setToast('')} />}
      </div>
    </LabMode>
  );
};

export default NmapNSEApp;

export const displayNmapNSE = () => <NmapNSEApp />;
