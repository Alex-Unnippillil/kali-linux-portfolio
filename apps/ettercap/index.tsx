'use client';

import React, { useEffect, useRef, useState } from 'react';
import FilterEditor from './components/FilterEditor';
import LogPane, { LogEntry } from './components/LogPane';
import ArpDiagram from './components/ArpDiagram';
import {
  createLogGenerator,
  DEFAULT_LOG_SEED,
  FakeLogEntry,
  formatLogEntry,
} from '@/utils/faker/logs';

const MODES = ['Unified', 'Sniff', 'ARP'];
const INITIAL_LOG_COUNT = 6;

const toLogEntry = (entry: FakeLogEntry): LogEntry => ({
  id: entry.id,
  level: entry.level,
  message: formatLogEntry(entry),
});

export default function EttercapPage() {
  const [mode, setMode] = useState('Unified');
  const [started, setStarted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const generatorRef = useRef<() => FakeLogEntry>(
    createLogGenerator({ seed: DEFAULT_LOG_SEED })
  );

  useEffect(() => {
    if (!started) return;
    const generator = generatorRef.current;
    setLogs(() => {
      const initial: LogEntry[] = [];
      for (let i = 0; i < INITIAL_LOG_COUNT; i += 1) {
        initial.push(toLogEntry(generator()));
      }
      return initial;
    });
    const id = window.setInterval(() => {
      setLogs((l) => [...l, toLogEntry(generator())]);
    }, 2000);
    return () => window.clearInterval(id);
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

      {started && <LogPane logs={logs} />}
      {started && <ArpDiagram />}

      <h1 className="mt-6 mb-4 text-xl font-bold">Ettercap Filter Editor</h1>
      <FilterEditor />
    </div>
  );
}

