import React, { useEffect, useMemo, useRef, useState } from 'react';
import SimulationBanner from '../SimulationBanner';
import SimulationReportExport from '../SimulationReportExport';
import { recordSimulation } from '../../../utils/simulationLog';
import modules from './modules.json';
import usePersistentState from '../../../hooks/usePersistentState';
import ConsolePane from './ConsolePane';

const severities = ['critical', 'high', 'medium', 'low'];
const severityStyles = {
  critical: 'bg-red-700 text-white',
  high: 'bg-orange-600 text-black',
  medium: 'bg-yellow-300 text-black',
  low: 'bg-green-300 text-black',
};

const moduleTypes = ['auxiliary', 'exploit', 'post'];

const timelineSteps = 5;

const banner = `Metasploit Framework Console (mock)\nFor legal and ethical use only.\nType 'search <term>' to search modules.`;

const simulationScenarios = [
  {
    id: 'windows-lab',
    label: 'Windows Lab Host',
    target: '10.10.20.15',
    intro: 'Simulated enterprise workstation discovery and credential gathering.',
    steps: [
      {
        command: 'search type:auxiliary smb',
        output: 'Matching modules: auxiliary/scanner/smb/smb_version',
        note: 'Enumerate SMB version without touching credentials.'
      },
      {
        command: 'use auxiliary/scanner/smb/smb_version',
        output: 'Module selected. Ready to scan target host.',
        note: 'Select the scanner module for the lab target.'
      },
      {
        command: 'set RHOSTS 10.10.20.15',
        output: 'RHOSTS => 10.10.20.15',
        note: 'Set the simulated target address.'
      },
      {
        command: 'run',
        output: '[*] 10.10.20.15:445 - Windows 10 Pro 10.0 build 19045 (simulation)',
        note: 'Returns deterministic, pre-baked banner output.'
      },
      {
        command: 'use post/windows/gather/enum_logged_on_users',
        output: 'Selected post module for user enumeration.',
        note: 'Switch to a post module for contextual teaching.'
      }
    ]
  },
  {
    id: 'linux-web',
    label: 'Linux Web Server',
    target: '172.16.8.42',
    intro: 'Simulated web server review focusing on known CVEs and service banners.',
    steps: [
      {
        command: 'search type:exploit apache',
        output: 'Matching modules: exploit/linux/http/apache_mod_cgi_bash_env_exec',
        note: 'Review available exploit modules without execution.'
      },
      {
        command: 'use exploit/linux/http/apache_mod_cgi_bash_env_exec',
        output: 'Module selected. Required options: RHOSTS, TARGETURI.',
        note: 'Load exploit module in a controlled demo.'
      },
      {
        command: 'set RHOSTS 172.16.8.42',
        output: 'RHOSTS => 172.16.8.42',
        note: 'Point to the simulated web server host.'
      },
      {
        command: 'set TARGETURI /cgi-bin/status',
        output: 'TARGETURI => /cgi-bin/status',
        note: 'Demonstrate configuration without a real HTTP request.'
      },
      {
        command: 'run',
        output: '[demo] Exploit not executed. Use this output to explain mitigation steps.',
        note: 'Demo mode only — no packets are sent.'
      }
    ]
  },
  {
    id: 'database-audit',
    label: 'Database Audit',
    target: '10.20.40.25',
    intro: 'Simulated configuration audit for SQL Server in a lab environment.',
    steps: [
      {
        command: 'search type:auxiliary mssql',
        output: 'Matching modules: auxiliary/admin/mssql/mssql_enum',
        note: 'Choose a configuration audit module.'
      },
      {
        command: 'use auxiliary/admin/mssql/mssql_enum',
        output: 'Module selected. Configure credentials (demo only).',
        note: 'Set up module options in a safe simulation.'
      },
      {
        command: 'set RHOSTS 10.20.40.25',
        output: 'RHOSTS => 10.20.40.25',
        note: 'Use the lab database host.'
      },
      {
        command: 'run',
        output: '[*] Demo audit complete. Findings stored in notes.',
        note: 'Use the mock output to discuss hardening.'
      }
    ]
  }
];

const MetasploitApp = ({
  demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  onLoadingChange = () => {},
} = {}) => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = usePersistentState('metasploit-history', banner);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [searchField, setSearchField] = useState('name');
  const [selectedSeverity, setSelectedSeverity] = useState(null);
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [cveFilter, setCveFilter] = useState('');
  const [animationStyle, setAnimationStyle] = useState({ opacity: 1 });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState(
    simulationScenarios[0].id
  );

  const [selectedModule, setSelectedModule] = useState(null);
  const [loot, setLoot] = useState([]);
  const [notes, setNotes] = useState([]);
  const [showLoot, setShowLoot] = useState(false);

  const [sessions, setSessions] = useState([]);

  const [timeline, setTimeline] = useState([]);
  const [replaying, setReplaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    onLoadingChange(loading);
  }, [loading, onLoadingChange]);

  const workerRef = useRef();
  const moduleRaf = useRef();
  const progressRaf = useRef();

  const allTags = useMemo(
    () => Array.from(new Set(modules.flatMap((m) => m.tags || []))).sort(),
    []
  );
  const allPlatforms = useMemo(
    () => Array.from(new Set(modules.map((m) => m.platform).filter(Boolean))).sort(),
    []
  );

  // Modules are loaded from a local JSON index so the app works offline.

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduceMotion(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/fixtures/metasploit_loot.json');
        const data = await res.json();
        if (active) {
          setLoot(data.loot || []);
          setNotes(data.notes || []);
        }
      } catch (e) {}
    })();
    return () => {
      active = false;
    };
  }, []);

  const activeScenario = useMemo(
    () => simulationScenarios.find((s) => s.id === activeScenarioId),
    [activeScenarioId]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return [];
    return modules.filter((m) => {
      if (selectedTag && !m.tags.includes(selectedTag)) return false;
      if (selectedPlatform && m.platform !== selectedPlatform) return false;
      if (
        cveFilter &&
        !(m.cve || []).some((c) => c.toLowerCase().includes(cveFilter.toLowerCase()))
      )
        return false;
      if (searchField === 'cve') {
        return (m.cve || []).some((c) => c.toLowerCase().includes(q));
      }
      if (searchField === 'tags') {
        return (m.tags || []).some((t) => t.toLowerCase().includes(q));
      }
      const field = (m[searchField] || '').toString().toLowerCase();
      return field.includes(q);
    });
  }, [query, searchField, selectedTag, selectedPlatform, cveFilter]);

  const modulesByType = useMemo(() => {
    const filteredMods = modules.filter(
      (m) =>
        (!selectedSeverity || m.severity === selectedSeverity) &&
        (!selectedTag || m.tags.includes(selectedTag)) &&
        (!selectedPlatform || m.platform === selectedPlatform) &&
        (!cveFilter ||
          (m.cve || []).some((c) =>
            c.toLowerCase().includes(cveFilter.toLowerCase())
          ))
    );
    return moduleTypes.reduce((acc, type) => {
      acc[type] = filteredMods.filter((m) => m.type === type);
      return acc;
    }, {});
  }, [selectedSeverity, selectedTag, selectedPlatform, cveFilter]);

  useEffect(() => {
    if (reduceMotion) return;
    setAnimationStyle({ opacity: 0 });
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / 300, 1);
      setAnimationStyle({ opacity: pct });
      if (pct < 1) moduleRaf.current = requestAnimationFrame(step);
    };
    moduleRaf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(moduleRaf.current);
  }, [selectedSeverity, reduceMotion]);

  const applyScenario = () => {
    if (!activeScenario) return;
    setCommand(`set RHOSTS ${activeScenario.target}`);
    recordSimulation({
      tool: 'metasploit',
      title: `Scenario: ${activeScenario.label}`,
      summary: activeScenario.intro,
      data: { target: activeScenario.target },
    });
  };

  const runScenario = async () => {
    if (!activeScenario) return;
    setLoading(true);
    try {
      setOutput((prev) => `${prev}\n# Scenario: ${activeScenario.label}`);
      for (const step of activeScenario.steps) {
        setOutput((prev) => `${prev}\nmsf6 > ${step.command}\n${step.output}`);
        recordSimulation({
          tool: 'metasploit',
          title: step.command,
          summary: step.note,
          data: { scenario: activeScenario.id },
        });
        await new Promise((r) => setTimeout(r, 300));
      }
      setNotes((prev) => [
        ...prev,
        { host: activeScenario.target, note: activeScenario.intro },
      ]);
      setShowLoot(true);
    } finally {
      setLoading(false);
    }
  };

  const runCommand = async () => {
    const cmd = command.trim();
    if (!cmd) return;
    setLoading(true);
    try {
      if (demoMode || process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') {
        setOutput((prev) => {
          const next = `${prev}\nmsf6 > ${cmd}\n[demo mode] command disabled`;
          recordSimulation({
            tool: 'metasploit',
            title: cmd || 'msf6',
            summary: 'Command replayed in demo mode',
            data: { mode: 'demo', command: cmd },
          });
          return next;
        });
      } else {
        const res = await fetch('/api/metasploit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd }),
        });
        const data = await res.json();
        setOutput((prev) => {
          const next = `${prev}\nmsf6 > ${cmd}\n${data.output || ''}`;
          recordSimulation({
            tool: 'metasploit',
            title: cmd || 'msf6',
            summary: 'API-backed demo response',
            data: { mode: 'api', command: cmd, output: (data.output || '').slice(0, 120) },
          });
          return next;
        });
      }
    } catch (e) {
      setOutput((prev) => `${prev}\nError: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runDemo = async () => {
    setLoading(true);
    try {
      const exploit = modules[0];
      const post = modules.find((m) => m.type === 'post');
      if (!exploit || !post) return;
      recordSimulation({
        tool: 'metasploit',
        title: 'Guided demo',
        summary: `${exploit.name} → ${post.name}`,
        data: { exploit: exploit.name, post: post.name },
      });
      setOutput(
        (prev) =>
          `${prev}\nmsf6 > use ${exploit.name}\n${exploit.transcript || ''}`
      );
      await new Promise((r) => setTimeout(r, 500));
      setOutput(
        (prev) =>
          `${prev}\nmsf6 exploit(${exploit.name}) > sessions -i 1\n[*] Session 1 opened`
      );
      await new Promise((r) => setTimeout(r, 500));
      setOutput(
        (prev) =>
          `${prev}\nmsf6 exploit(${exploit.name}) > run ${post.name}\n${post.transcript || ''}`
      );
    } finally {
      setLoading(false);
    }
  };

  const showModule = (mod) => {
    setSelectedModule(mod);
    setOutput((prev) => `${prev}\nmsf6 > use ${mod.name}\n${mod.transcript || ''}`);
    recordSimulation({
      tool: 'metasploit',
      title: `Module ${mod.name}`,
      summary: `Opened ${mod.type} module for review`,
      data: { tags: mod.tags, platform: mod.platform },
    });
  };

  const startReplay = () => {
    if (workerRef.current) workerRef.current.terminate();
    setTimeline([]);
    setProgress(0);
    setReplaying(true);
    const steps = [
      'Initializing exploit...',
      'Checking target...',
      'Sending payload...',
      'Gaining access...',
      'Session established.'
    ];
    const lootItem = { host: '10.0.0.3', data: 'ssh-creds.txt' };
    if (typeof Worker === 'function') {
      const worker = new Worker(new URL('./exploit.worker.js', import.meta.url));
      worker.onmessage = (e) => {
        if (e.data.step) {
          setTimeline((t) => [...t, e.data.step]);
        } else if (e.data.loot) {
          setLoot((l) => [...l, e.data.loot]);
          setShowLoot(true);
        } else if (e.data.done) {
          setReplaying(false);
          worker.terminate();
        }
      };
      worker.postMessage('start');
      workerRef.current = worker;
    } else {
      let i = 0;
      const sendStep = () => {
        if (i < steps.length) {
          const step = steps[i];
          setTimeline((t) => [...t, step]);
          if (i === 2) {
            setLoot((l) => [...l, lootItem]);
            setShowLoot(true);
          }
          i += 1;
          setTimeout(sendStep, 1000);
        } else {
          setReplaying(false);
        }
      };
      sendStep();
    }
  };

  useEffect(() => {
    if (!replaying || reduceMotion) return;
    let start;
    const total = timelineSteps * 1000;
    const step = (ts) => {
      if (!start) start = ts;
      const pct = Math.min(((ts - start) / total) * 100, 100);
      setProgress(pct);
      if (pct < 100) progressRaf.current = requestAnimationFrame(step);
    };
    progressRaf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(progressRaf.current);
  }, [replaying, reduceMotion]);

  useEffect(() => {
    const regex = /Session\s+(\d+)\s+opened/g;
    setSessions((prev) => {
      const existing = new Set(prev.map((s) => s.id));
      const added = [];
      let m;
      while ((m = regex.exec(output))) {
        if (!existing.has(m[1])) {
          existing.add(m[1]);
          added.push({ id: m[1] });
        }
      }
      return added.length ? [...prev, ...added] : prev;
    });
  }, [output]);

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white">
      <SimulationBanner
        toolName="Metasploit"
        message="Module searches and console output are deterministic and stay inside this browser."
      />
      <div className="flex flex-wrap items-center gap-2 px-2 pb-2 text-xs text-white/80">
        <span className="font-semibold uppercase tracking-wide">Scenario lab</span>
        <select
          className="bg-ub-grey text-white p-1 rounded"
          value={activeScenarioId}
          onChange={(e) => setActiveScenarioId(e.target.value)}
          aria-label="Select Metasploit scenario"
        >
          {simulationScenarios.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.label}
            </option>
          ))}
        </select>
        <button
          onClick={applyScenario}
          className="px-2 py-1 bg-blue-600 rounded text-white"
        >
          Load Scenario
        </button>
        <button
          onClick={runScenario}
          className="px-2 py-1 bg-ub-orange rounded text-black"
        >
          Run Guided Steps
        </button>
        {activeScenario && (
          <span className="text-white/70">{activeScenario.intro}</span>
        )}
      </div>
      <div className="flex p-2">
        <input
          className="flex-grow bg-ub-grey text-white p-1 rounded"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runCommand();
          }}
          placeholder="msfconsole command"
          aria-label="Metasploit command input"
          spellCheck={false}
        />
        <button
          onClick={runCommand}
          className="ml-2 px-2 py-1 bg-ub-orange rounded"
        >
          Run
        </button>
        <button
          onClick={runDemo}
          className="ml-2 px-2 py-1 bg-green-600 text-black rounded"
        >
          Run Demo
        </button>
      </div>
      <div className="flex p-2">
        <aside
          className="w-40 pr-2 border-r space-y-1.5 text-xs"
          style={{ borderColor: 'var(--color-primary)' }}
        >
          <h3 className="text-sm font-bold">Sessions</h3>
          {sessions.length ? (
            <ul className="space-y-1.5">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>#{s.id}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setOutput((prev) => `${prev}\nmsf6 > sessions -i ${s.id}`)
                    }
                    className="px-1 text-black rounded"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    use
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs">No sessions</p>
          )}
        </aside>
        <div className="flex-1 px-2">
          <div className="flex mb-2">
            <input
              className="flex-grow bg-ub-grey text-white p-1 rounded"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules"
              aria-label="Search Metasploit modules"
              spellCheck={false}
            />
            <select
              className="ml-2 bg-ub-grey text-white p-1 rounded"
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              aria-label="Search field"
            >
              <option value="name">Name</option>
              <option value="type">Type</option>
              <option value="platform">Platform</option>
              <option value="cve">CVE</option>
              <option value="tags">Tags</option>
            </select>
          </div>
          {query && (
            <ul className="mt-2 max-h-40 overflow-auto text-xs">
              {filtered.map((m) => (
                <li key={m.name} className="mb-1">
                  <span className="font-mono">{m.name}</span> - {m.description}
                  {m.platform && <span className="ml-1">[{m.platform}]</span>}
                  {(m.cve || []).map((c) => (
                    <span key={c} className="ml-1">{c}</span>
                  ))}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
          <div className="mb-2">
            <select
              className="bg-ub-grey text-white p-1 rounded"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              aria-label="Filter by tag"
            >
              <option value="">All Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-2">
            <select
              className="bg-ub-grey text-white p-1 rounded"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              aria-label="Filter by platform"
            >
              <option value="">All Platforms</option>
              {allPlatforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-2">
            <input
              className="bg-ub-grey text-white p-1 rounded w-full"
              value={cveFilter}
              onChange={(e) => setCveFilter(e.target.value)}
              placeholder="Filter by CVE"
              aria-label="Filter by CVE"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-wrap mb-2">
              {severities.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSeverity(s)}
                  aria-pressed={selectedSeverity === s}
                  className={`px-2 py-1 rounded-full text-xs font-bold mr-2 mb-2 focus:outline-none ${severityStyles[s]} ${
                    selectedSeverity === s
                      ? 'ring-2 ring-white motion-safe:transition-transform motion-safe:duration-300 motion-safe:scale-110 motion-reduce:transition-none motion-reduce:scale-100'
                      : ''
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {moduleTypes.map((type) => (
              <div key={type} className="mb-2">
                <h3 className="text-sm font-bold capitalize">{type}</h3>
                <div
                  style={animationStyle}
                  className="grid grid-cols-2 gap-2 max-h-32 overflow-auto text-xs"
                >
                  {(modulesByType[type] || []).map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => showModule(m)}
                      aria-label={`Select module ${m.name}`}
                      className="p-2 text-left bg-ub-grey rounded flex"
                    >
                      <svg
                        className="w-6 h-6 mr-2"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      <div>
                        <div className="flex items-center mb-1">
                          <span
                            className={`px-1 rounded mr-1 ${severityStyles[m.severity]}`}
                          >
                            {m.severity}
                          </span>
                          <span className="font-mono">{m.name}</span>
                        </div>
                        <p>{m.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button
              onClick={startReplay}
              className="px-2 py-1 bg-ub-orange rounded text-black"
            >
              Replay Mock Exploit
            </button>
            {timeline.length > 0 && (
              <>
                <ul
                  className="mt-2 text-xs max-h-32 overflow-auto"
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  {timeline.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
                <div
                  className="w-full bg-ub-grey h-2 mt-2"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  aria-label="Exploit replay progress"
                >
                  <div className="h-full bg-ub-orange" style={{ width: `${progress}%` }} />
                </div>
              </>
            )}
          </div>
          <div className="mt-4">
            <button
              onClick={() => setShowLoot((s) => !s)}
              className="px-2 py-1 bg-blue-600 rounded text-white"
            >
              Toggle Loot/Notes
            </button>
            {showLoot && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <h4 className="font-bold mb-1">Loot</h4>
                  <ul className="max-h-24 overflow-auto">
                    {loot.map((l, i) => (
                      <li key={i}>
                        {l.host}: {l.data || l.path || l.type}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-1">Notes</h4>
                  <ul className="max-h-24 overflow-auto">
                    {notes.map((n, i) => (
                      <li key={i}>
                        {n.host}: {n.note}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
        <aside className="w-1/3 bg-ub-grey p-2 overflow-auto text-xs">
          {selectedModule ? (
            <>
              <h3 className="font-bold mb-1">{selectedModule.name}</h3>
              <p className="mb-1">{selectedModule.description}</p>
              {selectedModule.disclosure_date && (
                <p className="mb-1">
                  <strong>Disclosed:</strong> {selectedModule.disclosure_date}
                </p>
              )}
              {selectedModule.teaches && (
                <p className="mb-1">
                  <strong>Teaches:</strong> {selectedModule.teaches}
                </p>
              )}
              <p>{selectedModule.doc || 'No documentation available.'}</p>
              {selectedModule.options && (
                <div className="mt-2">
                  <h4 className="font-bold mb-1">Options</h4>
                  <ul className="max-h-24 overflow-auto">
                    {Object.entries(selectedModule.options).map(([name, opt]) => (
                      <li key={name}>
                        <span className="font-mono">{name}</span>: {opt.desc}
                        {opt.default !== undefined && (
                          <span> (default: {String(opt.default)})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedModule.transcript && (
                <div className="mt-2">
                  <h4 className="font-bold mb-1">Demo Log</h4>
                  <pre className="whitespace-pre-wrap max-h-32 overflow-auto">
                    {selectedModule.transcript}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <p>Select a module to view docs.</p>
          )}
        </aside>
      </div>
      <div className="px-2">
        <SimulationReportExport dense />
      </div>
      <ConsolePane output={loading ? 'Running...' : output} />
    </div>
  );
};

export default MetasploitApp;

export const displayMetasploit = () => <MetasploitApp />;
