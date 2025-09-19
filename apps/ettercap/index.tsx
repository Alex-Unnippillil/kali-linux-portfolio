'use client';

import React, { useEffect, useState } from 'react';
import KillSwitchGate from '../../components/common/KillSwitchGate';
import { KILL_SWITCH_IDS } from '../../lib/flags';
import FilterEditor from './components/FilterEditor';
import LogPane, { LogEntry } from './components/LogPane';
import ArpDiagram from './components/ArpDiagram';

const MODES = ['Unified', 'Sniff', 'ARP'];

const EttercapPageContent: React.FC = () => {
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
};

const EttercapPage: React.FC = () => (
  <KillSwitchGate
    appId="ettercap"
    appTitle="Ettercap"
    killSwitchId={KILL_SWITCH_IDS.ettercap}
  >
    {() => <EttercapPageContent />}
  </KillSwitchGate>
);

export default EttercapPage;

