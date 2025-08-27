import React, { useEffect, useMemo, useRef, useState } from 'react';
import modules from './modules.json';
import usePersistentState from '../../usePersistentState';
import SecurityDisclaimer from '../../SecurityDisclaimer';

const severities = ['critical', 'high', 'medium', 'low'];
const severityStyles = {
  critical: 'bg-red-700 text-white',
  high: 'bg-orange-600 text-black',
  medium: 'bg-yellow-300 text-black',
  low: 'bg-green-300 text-black',
};

const timelineSteps = 5;

const banner = `Metasploit Framework Console (mock)\nType 'search <term>' to search modules.`;

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
  const [liveMsg, setLiveMsg] = useState('');

  const workerRef = useRef();
  const moduleRaf = useRef();
  const progressRaf = useRef();

  // No network requests; all data is local.

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

  const modulesBySeverity = useMemo(() => {
    return modules.reduce((acc, m) => {
      acc[m.severity] = acc[m.severity] ? [...acc[m.severity], m] : [m];
      return acc;
    }, {});
  }, []);

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

  const runCommand = () => {
    const cmd = command.trim();
    if (!cmd) return;
    setLoading(true);
    let result = '';
    if (cmd.startsWith('search ')) {
      const term = cmd.slice(7).toLowerCase();
      const matches = modules.filter(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.description.toLowerCase().includes(term)
      );
      result = matches
        .map((m) => `${m.name} - ${m.description}`)
        .join('\n');
      if (!result) result = 'No matches found';
    } else if (cmd === 'help') {
      result = 'Available commands: search <term>, help';
    } else {
      result = 'Unknown command';
    }
    setOutput((prev) => `${prev}\nmsf6 > ${cmd}\n${result}`);
    setLoading(false);
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
        setLiveMsg(e.data.step);
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
      <SecurityDisclaimer />
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
          {selectedSeverity && (
            <ul style={animationStyle} className="max-h-40 overflow-auto text-xs">
              {(modulesBySeverity[selectedSeverity] || []).map((m) => (
                <li key={m.name} className="mb-1">
                  <span className="font-mono">{m.name}</span> - {m.description}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4">
          <button
            onClick={startReplay}
            className="px-2 py-1 bg-ub-orange rounded text-black"
          >
            Replay Mock Exploit
          </button>
          <div aria-live="polite" className="sr-only">
            {liveMsg}
          </div>
          {timeline.length > 0 && (
            <>
              <ul className="mt-2 text-xs max-h-32 overflow-auto">
                {timeline.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
              <div className="w-full bg-ub-grey h-2 mt-2">
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
