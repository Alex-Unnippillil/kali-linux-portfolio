import React, { useEffect, useMemo, useRef, useState } from 'react';
import modules from './modules.json';
import usePersistentState from '../../usePersistentState';

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

const MetasploitApp = () => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = usePersistentState('metasploit-history', banner);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState(null);
  const [animationStyle, setAnimationStyle] = useState({ opacity: 1 });
  const [reduceMotion, setReduceMotion] = useState(false);

  const [timeline, setTimeline] = useState([]);
  const [replaying, setReplaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const workerRef = useRef();
  const moduleRaf = useRef();
  const progressRaf = useRef();

  // Refresh modules list in the background on mount
  useEffect(() => {
    fetch('/api/metasploit').catch(() => {});
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduceMotion(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return [];
    return modules.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );
  }, [query]);

  const modulesByType = useMemo(() => {
    const filteredMods = modules.filter(
      (m) => !selectedSeverity || m.severity === selectedSeverity
    );
    return moduleTypes.reduce((acc, type) => {
      acc[type] = filteredMods.filter((m) => m.type === type);
      return acc;
    }, {});
  }, [selectedSeverity]);

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
      const res = await fetch('/api/metasploit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      setOutput((prev) => `${prev}\nmsf6 > ${cmd}\n${data.output || ''}`);
    } catch (e) {
      setOutput((prev) => `${prev}\nError: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runDemo = () => {
    const demoLogs = `msf6 > use exploit/windows/smb/ms17_010_eternalblue\n[*] Started reverse TCP handler on 0.0.0.0:4444\n[*] 192.168.1.100 - Connecting to target...\n[+] 192.168.1.100 - Connection established\n[*] 192.168.1.100 - Sending exploit...\n[+] 192.168.1.100 - Exploit completed, but no session was created.`;
    setOutput((prev) => `${prev}\n${demoLogs}`);
  };

  const startReplay = () => {
    if (workerRef.current) workerRef.current.terminate();
    setTimeline([]);
    setProgress(0);
    setReplaying(true);
    const worker = new Worker(new URL('./exploit.worker.js', import.meta.url));
    worker.onmessage = (e) => {
      if (e.data.step) {
        setTimeline((t) => [...t, e.data.step]);
      } else if (e.data.done) {
        setReplaying(false);
        worker.terminate();
      }
    };
    worker.postMessage('start');
    workerRef.current = worker;
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

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white">
      <div className="bg-yellow-400 text-black text-xs p-2 text-center">
        For authorized security testing and educational use only.
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
      <div className="p-2">
        <input
          className="w-full bg-ub-grey text-white p-1 rounded"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search modules"
          spellCheck={false}
        />
        {query && (
          <ul className="mt-2 max-h-40 overflow-auto text-xs">
            {filtered.map((m) => (
              <li key={m.name} className="mb-1">
                <span className="font-mono">{m.name}</span> - {m.description}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <div className="flex flex-wrap mb-2">
            {severities.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSeverity(s)}
                aria-pressed={selectedSeverity === s}
                className={`px-2 py-1 rounded-full text-xs font-bold mr-2 mb-2  ${severityStyles[s]} ${
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
              <ul style={animationStyle} className="max-h-32 overflow-auto text-xs">
                {(modulesByType[type] || []).map((m) => (
                  <li key={m.name} className="mb-1">
                    <span
                      className={`px-1 rounded mr-1 ${severityStyles[m.severity]}`}
                    >
                      {m.severity}
                    </span>
                    <span className="font-mono">{m.name}</span> - {m.description}
                    {m.tags.map((t) => (
                      <span
                        key={t}
                        className="ml-1 px-1 bg-ub-grey rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
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
              >
                <div
                  className="h-full bg-ub-orange"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>
      <pre className="flex-grow bg-black text-green-400 p-2 overflow-auto whitespace-pre-wrap">
        {loading ? 'Running...' : output}
      </pre>
    </div>
  );
};

export default MetasploitApp;

export const displayMetasploit = () => <MetasploitApp />;
