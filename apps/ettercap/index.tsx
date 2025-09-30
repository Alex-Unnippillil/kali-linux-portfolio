'use client';

import React, { useEffect, useState } from 'react';
import FilterEditor from './components/FilterEditor';
import LogPane, { LogEntry } from './components/LogPane';
import ArpDiagram from './components/ArpDiagram';
import { resolveErrorFixes } from '@/utils/errorFixes';

const MODES = ['Unified', 'Sniff', 'ARP'];

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];

const INFO_MESSAGES = [
  'ARP map refreshed from lab gateway',
  'Unified sniffing session handshook with monitor mode adapter',
  'DNS responses cached for local replay demo',
];

const WARN_MESSAGES = [
  ...resolveErrorFixes(['LOG-200']).map(
    (fix) => `${fix.code} ${fix.title} — ${fix.description}`,
  ),
  'WARN: Packet queue length exceeded recommended threshold',
];

const ERROR_MESSAGES = resolveErrorFixes([
  'NET-042',
  'AUTH-013',
  'SCAN-404',
]).map((fix) => `${fix.code} ${fix.title} — ${fix.description}`);

export default function EttercapPage() {
  const [mode, setMode] = useState('Unified');
  const [started, setStarted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      const levels: LogEntry['level'][] = ['info', 'warn', 'error'];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const time = new Date().toLocaleTimeString();
      let message: string;
      if (level === 'error') {
        message = `${pick(ERROR_MESSAGES)} @ ${time}`;
      } else if (level === 'warn') {
        message = `${pick(WARN_MESSAGES)} @ ${time}`;
      } else {
        message = `${pick(INFO_MESSAGES)} @ ${time}`;
      }
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

