import React, { useEffect, useRef, useState } from 'react';
import Toast from '../../ui/Toast';
import DiscoveryMap from './DiscoveryMap';
import PortPresetsEditor from './PortPresetsEditor';
import { safeLocalStorage } from '../../../utils/safeStorage';

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

const builtinPortPresets = [
  { id: 'builtin-default', label: 'Default', flag: '' },
  { id: 'builtin-common', label: 'Common', flag: '-F' },
  { id: 'builtin-full', label: 'Full', flag: '-p-' }
];

const PORT_PRESET_STORAGE_KEY = 'nmap-port-presets';

const normalizePortList = (value) =>
  value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .join(',');

const validatePortList = (value) => {
  if (!value.trim()) {
    return 'Enter at least one port.';
  }

  const tokens = value.split(',').map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) {
    return 'Enter at least one port.';
  }

  const seen = new Set();

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      const port = Number(token);
      if (port < 1 || port > 65535) {
        return `Port ${port} must be between 1 and 65535.`;
      }
      if (seen.has(port)) {
        return `Duplicate port ${port}.`;
      }
      seen.add(port);
      continue;
    }

    if (/^\d+-\d+$/.test(token)) {
      const [startRaw, endRaw] = token.split('-');
      const start = Number(startRaw);
      const end = Number(endRaw);
      if (start < 1 || end > 65535 || start > end) {
        return `Invalid range ${token}.`;
      }
      for (let port = start; port <= end; port += 1) {
        if (seen.has(port)) {
          return `Duplicate port ${port}.`;
        }
        seen.add(port);
      }
      continue;
    }

    return `Invalid token "${token}".`;
  }

  return null;
};

const createPresetId = () =>
  `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
  const [customPresets, setCustomPresets] = useState([]);
  const [presetErrors, setPresetErrors] = useState({});
  const [selectedPresetId, setSelectedPresetId] = useState(
    builtinPortPresets[0].id
  );
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

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      const stored = safeLocalStorage.getItem(PORT_PRESET_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const mapped = parsed
            .filter((item) => item && typeof item === 'object')
            .map((item, index) => ({
              id:
                typeof item.id === 'string'
                  ? item.id
                  : `custom-${index}-${Date.now()}`,
              name: typeof item.name === 'string' ? item.name : '',
              ports: typeof item.ports === 'string' ? item.ports : '',
            }));

          const errors = mapped.reduce((acc, preset) => {
            const error = validatePortList(preset.ports);
            if (error) {
              acc[preset.id] = error;
            }
            return acc;
          }, {});

          setCustomPresets(mapped);
          setPresetErrors(errors);
        }
      }
    } catch (e) {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      safeLocalStorage.setItem(
        PORT_PRESET_STORAGE_KEY,
        JSON.stringify(
          customPresets.map(({ id, name, ports }) => ({ id, name, ports }))
        )
      );
    } catch (e) {
      // ignore storage errors
    }
  }, [customPresets]);

  const selectBuiltinPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setPortFlag(preset.flag);
  };

  const selectCustomPreset = (preset) => {
    const normalized = normalizePortList(preset.ports);
    if (!normalized || presetErrors[preset.id]) return;
    setSelectedPresetId(preset.id);
    setPortFlag(`-p ${normalized}`);
  };

  const handleCreatePreset = () => {
    const newPreset = {
      id: createPresetId(),
      name: `Custom preset ${customPresets.length + 1}`,
      ports: '80,443',
    };
    const error = validatePortList(newPreset.ports);
    setCustomPresets((prev) => [...prev, newPreset]);
    setPresetErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[newPreset.id] = error;
      } else {
        delete next[newPreset.id];
      }
      return next;
    });
    setSelectedPresetId(newPreset.id);
    setPortFlag(`-p ${normalizePortList(newPreset.ports)}`);
  };

  const handleRenamePreset = (id, name) => {
    setCustomPresets((prev) =>
      prev.map((preset) =>
        preset.id === id
          ? {
              ...preset,
              name,
            }
          : preset
      )
    );
  };

  const handlePortsChange = (id, ports) => {
    const error = validatePortList(ports);
    setCustomPresets((prev) =>
      prev.map((preset) =>
        preset.id === id
          ? {
              ...preset,
              ports,
            }
          : preset
      )
    );
    setPresetErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[id] = error;
      } else {
        delete next[id];
      }
      return next;
    });
    if (!error && selectedPresetId === id) {
      const normalized = normalizePortList(ports);
      setPortFlag(normalized ? `-p ${normalized}` : '');
    }
  };

  const handleDeletePreset = (id) => {
    setCustomPresets((prev) => prev.filter((preset) => preset.id !== id));
    setPresetErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (selectedPresetId === id) {
      setSelectedPresetId(builtinPortPresets[0].id);
      setPortFlag(builtinPortPresets[0].flag);
    }
  };

  const handleImportPresets = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid format');
      }

      const mapped = parsed.map((item, index) => ({
        id: createPresetId(),
        name:
          item && typeof item.name === 'string'
            ? item.name
            : `Imported preset ${index + 1}`,
        ports:
          item && typeof item.ports === 'string' ? item.ports : '',
      }));

      const errors = mapped.reduce((acc, preset) => {
        const error = validatePortList(preset.ports);
        if (error) {
          acc[preset.id] = error;
        }
        return acc;
      }, {});

      setCustomPresets(mapped);
      setPresetErrors(errors);

      const firstValid = mapped.find((preset) => !errors[preset.id]);
      if (firstValid) {
        setSelectedPresetId(firstValid.id);
        setPortFlag(`-p ${normalizePortList(firstValid.ports)}`);
      } else {
        setSelectedPresetId(builtinPortPresets[0].id);
        setPortFlag(builtinPortPresets[0].flag);
      }

      setToast('Presets imported');
      return true;
    } catch (e) {
      setToast('Import failed');
      return false;
    }
  };

  const handleExportPresets = async () => {
    const data = customPresets.map((preset) => ({
      name: preset.name,
      ports: normalizePortList(preset.ports),
    }));
    const json = JSON.stringify(data, null, 2);

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
        setToast('Presets copied to clipboard');
      } else {
        setToast('Export ready below');
      }
    } catch (e) {
      setToast('Export ready below');
    }

    return json;
  };

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
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Target"
            className="w-full p-2 text-black"
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
            aria-label="Search scripts"
            className="w-full p-2 text-black mb-2"
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
                  {s.tags.map((t) => (
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
                    aria-label={`${s.name} arguments`}
                    className="w-full p-1 border rounded text-black"
                  />
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
          <div className="flex flex-wrap gap-2">
            {builtinPortPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => selectBuiltinPreset(preset)}
                className={`px-2 py-1 rounded text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow ${
                  selectedPresetId === preset.id
                    ? 'bg-ub-yellow'
                    : 'bg-ub-grey'
                }`}
              >
                {preset.label}
              </button>
            ))}
            {customPresets.map((preset) => {
              const normalized = normalizePortList(preset.ports);
              const hasError = Boolean(presetErrors[preset.id]);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectCustomPreset(preset)}
                  disabled={hasError || !normalized}
                  className={`px-2 py-1 rounded text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ub-yellow ${
                    selectedPresetId === preset.id
                      ? 'bg-ub-yellow'
                      : 'bg-ub-grey'
                  } ${hasError || !normalized ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {preset.name || 'Unnamed preset'}
                </button>
              );
            })}
          </div>
          <PortPresetsEditor
            presets={customPresets}
            errors={presetErrors}
            onCreate={handleCreatePreset}
            onRename={handleRenamePreset}
            onUpdatePorts={handlePortsChange}
            onDelete={handleDeletePreset}
            onImport={handleImportPresets}
            onExport={handleExportPresets}
          />
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
