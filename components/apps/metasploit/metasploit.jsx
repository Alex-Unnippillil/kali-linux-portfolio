import React, { useEffect, useMemo, useRef, useState } from 'react';
import modules from './modules.json';
import usePersistentState from '../../../hooks/usePersistentState';
import ConsolePane from './ConsolePane';

const severities = ['critical', 'high', 'medium', 'low'];
const severityStyles = {
  critical: {
    background: 'color-mix(in srgb, var(--kali-status-critical) 32%, var(--kali-panel))',
    borderColor: 'color-mix(in srgb, var(--kali-status-critical) 55%, transparent)',
    color: 'var(--kali-terminal-text)',
  },
  high: {
    background: 'color-mix(in srgb, var(--kali-status-high) 30%, var(--kali-panel))',
    borderColor: 'color-mix(in srgb, var(--kali-status-high) 55%, transparent)',
    color: 'var(--kali-terminal-text)',
  },
  medium: {
    background: 'color-mix(in srgb, var(--kali-status-medium) 28%, var(--kali-panel))',
    borderColor: 'color-mix(in srgb, var(--kali-status-medium) 55%, transparent)',
    color: 'var(--kali-terminal-text)',
  },
  low: {
    background: 'color-mix(in srgb, var(--kali-status-low) 34%, var(--kali-panel))',
    borderColor: 'color-mix(in srgb, var(--kali-status-low) 55%, transparent)',
    color: 'var(--kali-terminal-text)',
  },
};

const moduleTypes = ['auxiliary', 'exploit', 'post'];

const timelineSteps = 5;

const banner = `Metasploit Framework Console (mock)\nFor legal and ethical use only.\nType 'search <term>' to search modules.`;

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

  const runCommand = async () => {
    const cmd = command.trim();
    if (!cmd) return;
    setLoading(true);
    try {
      if (demoMode || process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true') {
        setOutput(
          (prev) => `${prev}\nmsf6 > ${cmd}\n[demo mode] command disabled`
        );
      } else {
        const res = await fetch('/api/metasploit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd }),
        });
        const data = await res.json();
        setOutput((prev) => `${prev}\nmsf6 > ${cmd}\n${data.output || ''}`);
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

  const elevatedSurface = 'color-mix(in srgb, var(--kali-panel) 88%, rgba(4, 17, 29, 0.78))';
  const subtleSurface = 'color-mix(in srgb, var(--kali-panel) 80%, rgba(4, 17, 29, 0.6))';
  const severityButtonStyle = (level, selected) => ({
    ...severityStyles[level],
    boxShadow: selected
      ? '0 0 0 2px color-mix(in srgb, var(--color-primary) 55%, transparent)'
      : '0 0 0 1px color-mix(in srgb, var(--color-primary) 25%, transparent)',
    transform: selected ? 'scale(1.05)' : undefined,
  });

  return (
    <div className="flex h-full w-full flex-col bg-[color:var(--kali-bg-solid)] text-kali-text">
      <div
        className="border-b border-[color:var(--kali-panel-border)] p-2 text-center text-[0.7rem] font-semibold uppercase tracking-[0.24em]"
        style={{
          background: 'color-mix(in srgb, var(--kali-status-high) 24%, var(--kali-highlight-veil))',
          color: 'var(--kali-terminal-text)',
        }}
      >
        For authorized security testing and educational use only.
      </div>
      <div
        className="flex flex-wrap items-center gap-2 border-b border-[color:var(--kali-panel-border)] p-3 text-sm shadow-kali-panel"
        style={{
          background: 'color-mix(in srgb, var(--kali-panel) 88%, rgba(4, 17, 29, 0.85))',
        }}
      >
        <input
          className="flex-grow rounded-md border border-[color:var(--kali-panel-border)] px-3 py-2 text-sm text-kali-text placeholder:text-kali-text/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/60"
          style={{
            background: 'color-mix(in srgb, var(--kali-panel) 82%, rgba(4, 17, 29, 0.65))',
          }}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runCommand();
          }}
          placeholder="msfconsole command"
          spellCheck={false}
        />
        <button
          onClick={runCommand}
          className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-kali-text transition focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/70"
          style={{
            background: 'var(--color-primary)',
            boxShadow: '0 10px 25px rgba(15, 148, 210, 0.35)',
          }}
        >
          Run
        </button>
        <button
          onClick={runDemo}
          className="inline-flex items-center justify-center rounded-md px-3 py-2 font-semibold text-[color:var(--kali-bg-solid)] transition focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/70"
          style={{
            background: 'var(--kali-status-low)',
            boxShadow: '0 10px 25px rgba(69, 255, 154, 0.25)',
          }}
        >
          Run Demo
        </button>
      </div>
      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        <aside
          className="w-48 flex-shrink-0 space-y-2 rounded-lg border border-[color:var(--kali-panel-border)] p-3 text-xs shadow-kali-panel"
          style={{ background: elevatedSurface }}
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-kali-text/80">
            Sessions
          </h3>
          {sessions.length ? (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-kali-text/80">#{s.id}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setOutput((prev) => `${prev}\nmsf6 > sessions -i ${s.id}`)
                    }
                    className="rounded-md border border-[color:var(--kali-panel-border)] px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--kali-bg-solid)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/70"
                    style={{
                      background: 'var(--color-primary)',
                      boxShadow: '0 6px 18px rgba(15, 148, 210, 0.35)',
                    }}
                  >
                    use
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[0.7rem] text-kali-text/60">No sessions</p>
          )}
        </aside>
        <div className="flex-1 space-y-3 overflow-auto pr-1">
          <div
            className="space-y-3 rounded-lg border border-[color:var(--kali-panel-border)] p-3 text-sm shadow-kali-panel"
            style={{ background: elevatedSurface }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="flex-1 min-w-[14rem] rounded-md border border-[color:var(--kali-panel-border)] px-3 py-2 text-sm text-kali-text placeholder:text-kali-text/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/60"
                style={{ background: subtleSurface }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search modules"
                spellCheck={false}
              />
              <select
                className="rounded-md border border-[color:var(--kali-panel-border)] px-3 py-2 text-sm text-kali-text focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/60"
                style={{ background: subtleSurface }}
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
              >
                <option value="name">Name</option>
                <option value="type">Type</option>
                <option value="platform">Platform</option>
                <option value="cve">CVE</option>
                <option value="tags">Tags</option>
              </select>
            </div>
            {query && (
              <ul
                className="max-h-48 space-y-2 overflow-auto rounded-md border border-[color:var(--kali-panel-border)] p-3 text-xs text-kali-text/80"
                style={{ background: subtleSurface }}
              >
                {filtered.map((m) => (
                  <li key={m.name} className="space-y-1">
                    <span className="font-mono text-kali-text">{m.name}</span> – {m.description}
                    <div className="flex flex-wrap gap-2 text-[0.65rem] uppercase tracking-wide text-kali-text/60">
                      {m.platform && <span>[{m.platform}]</span>}
                      {(m.cve || []).map((c) => (
                        <span key={c}>{c}</span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <select
                className="rounded-md border border-[color:var(--kali-panel-border)] px-3 py-2 text-sm text-kali-text focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/60"
                style={{ background: subtleSurface }}
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                <option value="">All Tags</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-[color:var(--kali-panel-border)] px-3 py-2 text-sm text-kali-text focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/60"
                style={{ background: subtleSurface }}
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
              >
                <option value="">All Platforms</option>
                {allPlatforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <input
                className="rounded-md border border-[color:var(--kali-panel-border)] px-3 py-2 text-sm text-kali-text placeholder:text-kali-text/60 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/60"
                style={{ background: subtleSurface }}
                value={cveFilter}
                onChange={(e) => setCveFilter(e.target.value)}
                placeholder="Filter by CVE"
                spellCheck={false}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {severities.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSeverity(s)}
                  aria-pressed={selectedSeverity === s}
                  className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]/70"
                  style={severityButtonStyle(s, selectedSeverity === s)}
                >
                  {s}
                </button>
              ))}
            </div>
            {moduleTypes.map((type) => (
              <div key={type} className="space-y-2">
                <h3 className="text-sm font-semibold capitalize tracking-wide text-kali-text/80">
                  {type}
                </h3>
                <div
                  style={animationStyle}
                  className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2"
                >
                  {(modulesByType[type] || []).map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => showModule(m)}
                      className="flex items-start gap-2 rounded-lg border border-[color:var(--kali-panel-border)] p-3 text-left transition hover:border-[color:var(--color-primary)]/65 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/70"
                      style={{ background: subtleSurface }}
                    >
                      <svg
                        className="h-6 w-6 flex-shrink-0 text-[color:var(--color-primary)]"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                      </svg>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="inline-flex items-center rounded-full border px-2 py-[2px] text-[0.65rem] font-semibold uppercase tracking-wide"
                            style={{ ...severityStyles[m.severity], boxShadow: '0 0 0 1px color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
                          >
                            {m.severity}
                          </span>
                          <span className="font-mono text-sm text-kali-text">{m.name}</span>
                        </div>
                        <p className="text-[0.75rem] text-kali-text/70">{m.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div
            className="space-y-3 rounded-lg border border-[color:var(--kali-panel-border)] p-3 text-sm shadow-kali-panel"
            style={{ background: elevatedSurface }}
          >
            <button
              onClick={startReplay}
              className="inline-flex items-center rounded-md border border-[color:var(--kali-panel-border)] px-3 py-2 font-semibold text-kali-text transition focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/70"
              style={{
                background: 'var(--color-primary)',
                boxShadow: '0 10px 25px rgba(15, 148, 210, 0.35)',
              }}
            >
              Replay Mock Exploit
            </button>
            {timeline.length > 0 && (
              <>
                <ul
                  className="max-h-32 space-y-1.5 overflow-auto rounded-md border border-[color:var(--kali-panel-border)] p-3 text-xs text-kali-text/80"
                  style={{ background: subtleSurface }}
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  {timeline.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
                <div
                  className="mt-2 h-2 w-full overflow-hidden rounded-full border border-[color:var(--kali-panel-border)]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                  style={{ background: subtleSurface }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${progress}%`,
                      background: 'var(--color-primary)',
                      boxShadow: '0 0 12px rgba(15, 148, 210, 0.45)',
                    }}
                  />
                </div>
              </>
            )}
          </div>
          <div
            className="space-y-3 rounded-lg border border-[color:var(--kali-panel-border)] p-3 text-sm shadow-kali-panel"
            style={{ background: elevatedSurface }}
          >
            <button
              onClick={() => setShowLoot((s) => !s)}
              className="inline-flex items-center rounded-md border border-[color:var(--kali-panel-border)] px-3 py-2 font-semibold text-kali-text transition focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]/70"
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 45%, rgba(4, 17, 29, 0.85))',
                boxShadow: '0 10px 24px rgba(15, 148, 210, 0.3)',
              }}
            >
              Toggle Loot/Notes
            </button>
            {showLoot && (
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <div
                  className="space-y-2 rounded-md border border-[color:var(--kali-panel-border)] p-3"
                  style={{ background: subtleSurface }}
                >
                  <h4 className="text-sm font-semibold text-kali-text/80">Loot</h4>
                  <ul className="max-h-28 space-y-1.5 overflow-auto text-kali-text/80">
                    {loot.map((l, i) => (
                      <li key={i}>
                        {l.host}: {l.data || l.path || l.type}
                      </li>
                    ))}
                  </ul>
                </div>
                <div
                  className="space-y-2 rounded-md border border-[color:var(--kali-panel-border)] p-3"
                  style={{ background: subtleSurface }}
                >
                  <h4 className="text-sm font-semibold text-kali-text/80">Notes</h4>
                  <ul className="max-h-28 space-y-1.5 overflow-auto text-kali-text/80">
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
        <aside
          className="w-1/3 min-w-[18rem] flex-shrink-0 space-y-3 rounded-lg border border-[color:var(--kali-panel-border)] p-4 text-xs shadow-kali-panel"
          style={{ background: elevatedSurface }}
        >
          {selectedModule ? (
            <>
              <h3 className="text-lg font-semibold text-kali-text">{selectedModule.name}</h3>
              <p className="text-sm text-kali-text/80">{selectedModule.description}</p>
              {selectedModule.disclosure_date && (
                <p className="text-sm text-kali-text/70">
                  <strong className="font-semibold text-kali-text">Disclosed:</strong>{' '}
                  {selectedModule.disclosure_date}
                </p>
              )}
              {selectedModule.teaches && (
                <p className="text-sm text-kali-text/70">
                  <strong className="font-semibold text-kali-text">Teaches:</strong>{' '}
                  {selectedModule.teaches}
                </p>
              )}
              <p className="text-sm text-kali-text/70">
                {selectedModule.doc || 'No documentation available.'}
              </p>
              {selectedModule.options && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-kali-text/80">Options</h4>
                  <ul
                    className="max-h-28 space-y-1.5 overflow-auto rounded-md border border-[color:var(--kali-panel-border)] p-3 text-[0.75rem] text-kali-text/80"
                    style={{ background: subtleSurface }}
                  >
                    {Object.entries(selectedModule.options).map(([name, opt]) => (
                      <li key={name}>
                        <span className="font-mono text-kali-text">{name}</span>: {opt.desc}
                        {opt.default !== undefined && (
                          <span> (default: {String(opt.default)})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedModule.transcript && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-kali-text/80">Demo Log</h4>
                  <pre
                    className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md border border-[color:var(--kali-panel-border)] p-3 text-[0.75rem] text-kali-text/80"
                    style={{ background: subtleSurface }}
                  >
                    {selectedModule.transcript}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-kali-text/70">Select a module to view docs.</p>
          )}
        </aside>
      </div>
      <ConsolePane output={loading ? 'Running...' : output} />
    </div>
  );
};

export default MetasploitApp;

export const displayMetasploit = () => <MetasploitApp />;
