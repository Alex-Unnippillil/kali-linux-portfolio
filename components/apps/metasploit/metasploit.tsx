import React, { useEffect, useMemo, useRef, useState } from 'react';
import SimulationBanner from '../SimulationBanner';
import SimulationReportExport from '../SimulationReportExport';
import { recordSimulation } from '../../../utils/simulationLog';
import modules from './modules.json';
import usePersistentState from '../../../hooks/usePersistentState';
import ConsolePane from './ConsolePane';

type Severity = 'critical' | 'high' | 'medium' | 'low';

type ModuleType = 'auxiliary' | 'exploit' | 'post';

interface ModuleOption {
  desc: string;
  default?: unknown;
}

interface ModuleEntry {
  name: string;
  description: string;
  severity: Severity;
  type: ModuleType;
  platform?: string;
  cve?: string[];
  tags?: string[];
  transcript?: string;
  disclosure_date?: string;
  teaches?: string;
  doc?: string;
  options?: Record<string, ModuleOption>;
}

interface LootItem {
  host: string;
  data?: string;
  path?: string;
  type?: string;
}

interface NoteItem {
  host: string;
  note: string;
}

interface SessionItem {
  id: string;
}

interface MetasploitAppProps {
  demoMode?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

const severities: Severity[] = ['critical', 'high', 'medium', 'low'];
const severityStyles: Record<Severity, string> = {
  critical: 'bg-red-700 text-white',
  high: 'bg-orange-600 text-black',
  medium: 'bg-yellow-300 text-black',
  low: 'bg-green-300 text-black',
};

const moduleTypes: ModuleType[] = ['auxiliary', 'exploit', 'post'];

const timelineSteps = 5;

const banner = `Metasploit Framework Console (mock)\nFor legal and ethical use only.\nType 'search <term>' to search modules.`;

const moduleData = modules as ModuleEntry[];

const MetasploitApp = ({
  demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  onLoadingChange = () => {},
}: MetasploitAppProps = {}) => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = usePersistentState<string>('metasploit-history', banner);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [searchField, setSearchField] = useState<'name' | 'type' | 'platform' | 'cve' | 'tags'>(
    'name',
  );
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | null>(null);
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [cveFilter, setCveFilter] = useState('');
  const [animationStyle, setAnimationStyle] = useState<React.CSSProperties>({
    opacity: 1,
  });
  const [reduceMotion, setReduceMotion] = useState(false);

  const [selectedModule, setSelectedModule] = useState<ModuleEntry | null>(null);
  const [loot, setLoot] = useState<LootItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [showLoot, setShowLoot] = useState(false);

  const [sessions, setSessions] = useState<SessionItem[]>([]);

  const [timeline, setTimeline] = useState<string[]>([]);
  const [replaying, setReplaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    onLoadingChange(loading);
  }, [loading, onLoadingChange]);

  const workerRef = useRef<Worker | null>(null);
  const moduleRaf = useRef<number | null>(null);
  const progressRaf = useRef<number | null>(null);

  const allTags = useMemo(
    () => Array.from(new Set(moduleData.flatMap((mod) => mod.tags || []))).sort(),
    [],
  );
  const allPlatforms = useMemo(
    () =>
      Array.from(
        new Set(
          moduleData
            .map((mod) => mod.platform)
            .filter((platform): platform is string => Boolean(platform)),
        ),
      ).sort(),
    [],
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
        const data = (await res.json()) as { loot?: LootItem[]; notes?: NoteItem[] };
        if (active) {
          setLoot(data.loot || []);
          setNotes(data.notes || []);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return [] as ModuleEntry[];
    return moduleData.filter((mod) => {
      if (selectedTag && !(mod.tags || []).includes(selectedTag)) return false;
      if (selectedPlatform && mod.platform !== selectedPlatform) return false;
      if (
        cveFilter &&
        !(mod.cve || []).some((cve) => cve.toLowerCase().includes(cveFilter.toLowerCase()))
      )
        return false;
      if (searchField === 'cve') {
        return (mod.cve || []).some((cve) => cve.toLowerCase().includes(q));
      }
      if (searchField === 'tags') {
        return (mod.tags || []).some((tag) => tag.toLowerCase().includes(q));
      }
      const field = (mod[searchField] || '').toString().toLowerCase();
      return field.includes(q);
    });
  }, [query, searchField, selectedTag, selectedPlatform, cveFilter]);

  const modulesByType = useMemo(() => {
    const filteredMods = moduleData.filter(
      (mod) =>
        (!selectedSeverity || mod.severity === selectedSeverity) &&
        (!selectedTag || (mod.tags || []).includes(selectedTag)) &&
        (!selectedPlatform || mod.platform === selectedPlatform) &&
        (!cveFilter ||
          (mod.cve || []).some((cve) =>
            cve.toLowerCase().includes(cveFilter.toLowerCase()),
          )),
    );
    return moduleTypes.reduce<Record<ModuleType, ModuleEntry[]>>(
      (acc, type) => {
        acc[type] = filteredMods.filter((mod) => mod.type === type);
        return acc;
      },
      { auxiliary: [], exploit: [], post: [] },
    );
  }, [selectedSeverity, selectedTag, selectedPlatform, cveFilter]);

  useEffect(() => {
    if (reduceMotion) return;
    setAnimationStyle({ opacity: 0 });
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const pct = Math.min((timestamp - start) / 300, 1);
      setAnimationStyle({ opacity: pct });
      if (pct < 1) moduleRaf.current = requestAnimationFrame(step);
    };
    moduleRaf.current = requestAnimationFrame(step);
    return () => {
      if (moduleRaf.current !== null) cancelAnimationFrame(moduleRaf.current);
    };
  }, [selectedSeverity, reduceMotion]);

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
        const data = (await res.json()) as { output?: string };
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setOutput((prev) => `${prev}\nError: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const runDemo = async () => {
    setLoading(true);
    try {
      const exploit = moduleData[0];
      const post = moduleData.find((mod) => mod.type === 'post');
      if (!exploit || !post) return;
      recordSimulation({
        tool: 'metasploit',
        title: 'Guided demo',
        summary: `${exploit.name} → ${post.name}`,
        data: { exploit: exploit.name, post: post.name },
      });
      setOutput(
        (prev) =>
          `${prev}\nmsf6 > use ${exploit.name}\n${exploit.transcript || ''}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      setOutput(
        (prev) =>
          `${prev}\nmsf6 exploit(${exploit.name}) > sessions -i 1\n[*] Session 1 opened`,
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      setOutput(
        (prev) =>
          `${prev}\nmsf6 exploit(${exploit.name}) > run ${post.name}\n${post.transcript || ''}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const showModule = (mod: ModuleEntry) => {
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
      'Session established.',
    ];
    const lootItem: LootItem = { host: '10.0.0.3', data: 'ssh-creds.txt' };
    if (typeof Worker === 'function') {
      const worker = new Worker(new URL('./exploit.worker.js', import.meta.url));
      worker.onmessage = (event: MessageEvent<{ step?: string; loot?: LootItem; done?: boolean }>) => {
        if (event.data.step) {
          setTimeline((entries) => [...entries, event.data.step as string]);
        } else if (event.data.loot) {
          setLoot((entries) => [...entries, event.data.loot as LootItem]);
          setShowLoot(true);
        } else if (event.data.done) {
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
          setTimeline((entries) => [...entries, step]);
          if (i === 2) {
            setLoot((entries) => [...entries, lootItem]);
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
    let start: number | null = null;
    const total = timelineSteps * 1000;
    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const pct = Math.min(((timestamp - start) / total) * 100, 100);
      setProgress(pct);
      if (pct < 100) progressRaf.current = requestAnimationFrame(step);
    };
    progressRaf.current = requestAnimationFrame(step);
    return () => {
      if (progressRaf.current !== null) cancelAnimationFrame(progressRaf.current);
    };
  }, [replaying, reduceMotion]);

  useEffect(() => {
    const regex = /Session\s+(\d+)\s+opened/g;
    setSessions((prev) => {
      const existing = new Set(prev.map((session) => session.id));
      const added: SessionItem[] = [];
      let match: RegExpExecArray | null = null;
      while ((match = regex.exec(output))) {
        if (!existing.has(match[1])) {
          existing.add(match[1]);
          added.push({ id: match[1] });
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
      <div className="flex p-2">
        <input
          className="flex-grow bg-ub-grey text-white p-1 rounded"
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') runCommand();
          }}
          placeholder="msfconsole command"
          spellCheck={false}
        />
        <button onClick={runCommand} className="ml-2 px-2 py-1 bg-ub-orange rounded">
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
              {sessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between">
                  <span>#{session.id}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setOutput((prev) => `${prev}\nmsf6 > sessions -i ${session.id}`)
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search modules"
              spellCheck={false}
            />
            <select
              className="ml-2 bg-ub-grey text-white p-1 rounded"
              value={searchField}
              onChange={(event) =>
                setSearchField(
                  event.target.value as 'name' | 'type' | 'platform' | 'cve' | 'tags',
                )
              }
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
              {filtered.map((mod) => (
                <li key={mod.name} className="mb-1">
                  <span className="font-mono">{mod.name}</span> - {mod.description}
                  {mod.platform && <span className="ml-1">[{mod.platform}]</span>}
                  {(mod.cve || []).map((cve) => (
                    <span key={cve} className="ml-1">
                      {cve}
                    </span>
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
                onChange={(event) => setSelectedTag(event.target.value)}
              >
                <option value="">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-2">
              <select
                className="bg-ub-grey text-white p-1 rounded"
                value={selectedPlatform}
                onChange={(event) => setSelectedPlatform(event.target.value)}
              >
                <option value="">All Platforms</option>
                {allPlatforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-2">
              <input
                className="bg-ub-grey text-white p-1 rounded w-full"
                value={cveFilter}
                onChange={(event) => setCveFilter(event.target.value)}
                placeholder="Filter by CVE"
                spellCheck={false}
              />
            </div>
            <div className="flex flex-wrap mb-2">
              {severities.map((severity) => (
                <button
                  key={severity}
                  onClick={() => setSelectedSeverity(severity)}
                  aria-pressed={selectedSeverity === severity}
                  className={`px-2 py-1 rounded-full text-xs font-bold mr-2 mb-2 focus:outline-none ${
                    severityStyles[severity]
                  } ${
                    selectedSeverity === severity
                      ? 'ring-2 ring-white motion-safe:transition-transform motion-safe:duration-300 motion-safe:scale-110 motion-reduce:transition-none motion-reduce:scale-100'
                      : ''
                  }`}
                >
                  {severity}
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
                  {(modulesByType[type] || []).map((mod) => (
                    <button
                      key={mod.name}
                      type="button"
                      onClick={() => showModule(mod)}
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
                            className={`px-1 rounded mr-1 ${severityStyles[mod.severity]}`}
                          >
                            {mod.severity}
                          </span>
                          <span className="font-mono">{mod.name}</span>
                        </div>
                        <p>{mod.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <button onClick={startReplay} className="px-2 py-1 bg-ub-orange rounded text-black">
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
                  {timeline.map((step, idx) => (
                    <li key={`${step}-${idx}`}>{step}</li>
                  ))}
                </ul>
                <div
                  className="w-full bg-ub-grey h-2 mt-2"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                >
                  <div className="h-full bg-ub-orange" style={{ width: `${progress}%` }} />
                </div>
              </>
            )}
          </div>
          <div className="mt-4">
            <button
              onClick={() => setShowLoot((state) => !state)}
              className="px-2 py-1 bg-blue-600 rounded text-white"
            >
              Toggle Loot/Notes
            </button>
            {showLoot && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <h4 className="font-bold mb-1">Loot</h4>
                  <ul className="max-h-24 overflow-auto">
                    {loot.map((item, idx) => (
                      <li key={`${item.host}-${idx}`}>
                        {item.host}: {item.data || item.path || item.type}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-1">Notes</h4>
                  <ul className="max-h-24 overflow-auto">
                    {notes.map((note, idx) => (
                      <li key={`${note.host}-${idx}`}>
                        {note.host}: {note.note}
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
                    {Object.entries(selectedModule.options).map(([name, option]) => (
                      <li key={name}>
                        <span className="font-mono">{name}</span>: {option.desc}
                        {option.default !== undefined && (
                          <span> (default: {String(option.default)})</span>
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
