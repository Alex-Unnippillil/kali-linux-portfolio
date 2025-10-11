'use client';

import React, { useEffect, useState } from 'react';
import FilterEditor from './components/FilterEditor';
import LogPane, { LogEntry } from './components/LogPane';
import ArpDiagram from './components/ArpDiagram';

const MODES = ['Unified', 'Sniff', 'ARP'] as const;

const MODE_DESCRIPTIONS: Record<(typeof MODES)[number], string> = {
  Unified: 'Blend passive sniffing with MITM tools to demo full Ettercap workflows.',
  Sniff: 'Listen quietly to traffic without altering packets in transit.',
  ARP: 'Simulate ARP poisoning to observe how host traffic can be intercepted.',
};

export default function EttercapPage() {
  const [mode, setMode] = useState('Unified');
  const [started, setStarted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const levels: LogEntry['level'][] = ['info', 'warn', 'error'];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const message = `Sample ${level} message ${new Date().toLocaleTimeString()}`;
      setLogs((l) => [...l, { id: Date.now(), level, message }]);
    }, 2000);
    return () => clearInterval(id);
  }, [started]);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              title={MODE_DESCRIPTIONS[m]}
              className={`px-3 py-1 rounded-full border text-sm ${
                mode === m ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="px-4 py-2 rounded bg-green-600 text-white"
          onClick={() => setStarted(true)}
          disabled={started}
        >
          {started ? 'Demo running' : 'Start demo'}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-xs" aria-live="polite">
        <span className="rounded-full bg-gray-900/80 px-3 py-1 font-semibold uppercase tracking-wide text-blue-200">
          Mode: <span className="ml-1 capitalize text-white">{mode}</span>
        </span>
        <span className="rounded-full bg-gray-900/80 px-3 py-1 font-semibold uppercase tracking-wide text-blue-200">
          State: <span className="ml-1 text-white">{started ? 'Running' : 'Idle'}</span>
        </span>
        <span className="rounded-full bg-gray-900/80 px-3 py-1 font-semibold uppercase tracking-wide text-blue-200">
          Logs:{' '}
          <span className="ml-1 text-white">
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </span>
        </span>
      </div>

      {started && <LogPane logs={logs} />}
      {started && <ArpDiagram />}

      <h1 className="mt-6 mb-4 text-xl font-bold">Ettercap Filter Editor</h1>
      <div className="mb-4 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
        <h2 className="text-base font-semibold text-blue-200">Need a refresher?</h2>
        <p className="mt-2 text-blue-100">
          Ettercap filters let you drop or rewrite packets using simple commands like
          <code className="mx-1 rounded bg-blue-500/20 px-1 py-0.5 text-xs text-blue-50">drop</code>
          and
          <code className="mx-1 rounded bg-blue-500/20 px-1 py-0.5 text-xs text-blue-50">replace</code>.
          Combine them with patterns to experiment safely in this simulation before
          deploying changes on a real lab network.
        </p>
        <a
          href="https://www.ettercap-project.org/documentation/etterfilter/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center text-blue-200 underline hover:text-blue-100"
        >
          Read the Etterfilter guide
        </a>
      </div>
      <FilterEditor />
    </div>
  );
}

