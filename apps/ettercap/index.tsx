'use client';

import React, { useEffect, useMemo, useState } from 'react';
import FilterEditor from './components/FilterEditor';
import LogPane, { LogEntry } from './components/LogPane';
import ArpDiagram from './components/ArpDiagram';
import usePersistentState from '../../hooks/usePersistentState';
import networkFixtures from '../../components/apps/ettercap/fixtures';
import FixtureBrowser from './components/FixtureBrowser';
import CommandBuilder from './components/CommandBuilder';

const MODES = ['Unified', 'Sniff', 'ARP'];

type Fixture = (typeof networkFixtures)[number];

export default function EttercapPage() {
  const [labMode, setLabMode] = usePersistentState('apps:ettercap:lab-mode', false);
  const [mode, setMode] = useState('Unified');
  const [started, setStarted] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [fixtureId, setFixtureId] = useState<string>(networkFixtures[0]?.id);
  const activeFixture = useMemo<Fixture>(
    () =>
      networkFixtures.find((fixture) => fixture.id === fixtureId) ||
      networkFixtures[0],
    [fixtureId],
  );

  useEffect(() => {
    if (!started || !labMode) return;
    const id = setInterval(() => {
      const levels: LogEntry['level'][] = ['info', 'warn', 'error'];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const message = `Sample ${level} message ${new Date().toLocaleTimeString()}`;
      setLogs((l) => [...l, { id: Date.now(), level, message }]);
    }, 2000);
    return () => clearInterval(id);
  }, [started, labMode]);

  useEffect(() => {
    if (!labMode) {
      setStarted(false);
    }
  }, [labMode]);

  useEffect(() => {
    if (!started || !labMode) return;
    setLogs((entries) => [
      ...entries,
      {
        id: Date.now(),
        level: 'info',
        message: `Loaded fixture: ${activeFixture.name}`,
      },
    ]);
  }, [activeFixture, started, labMode]);

  const handleFixtureSelect = (fixture: Fixture) => setFixtureId(fixture.id);

  const handleStart = () => {
    if (!labMode) return;
    setStarted(true);
    setLogs((entries) => [
      ...entries,
      {
        id: Date.now(),
        level: 'info',
        message: `Demo started in ${mode} mode using ${activeFixture.name}`,
      },
    ]);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
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
          className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
          onClick={handleStart}
          disabled={started || !labMode}
        >
          {started ? 'Demo running' : 'Start demo'}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          id="ettercap-lab-mode"
          type="checkbox"
          checked={labMode}
          onChange={(event) => setLabMode(event.target.checked)}
        />
        <label htmlFor="ettercap-lab-mode" className="font-semibold">
          Lab mode (unlock interactive tooling)
        </label>
      </div>
      {!labMode && (
        <div
          className="bg-yellow-100 text-yellow-900 border border-yellow-300 p-3 rounded"
          role="alert"
        >
          Enable lab mode to explore capture fixtures, edit filters, and build command
          templates. Without it the interface stays read-only to prevent accidental
          execution.
        </div>
      )}
      <FixtureBrowser
        fixtures={networkFixtures}
        selectedId={fixtureId}
        onSelect={handleFixtureSelect}
        disabled={!labMode}
      />
      <CommandBuilder fixture={activeFixture} disabled={!labMode} />
      <section className="space-y-3">
        <h1 className="text-xl font-bold">Filter Editor</h1>
        <FilterEditor
          samples={activeFixture.filterSamples}
          packets={activeFixture.samplePackets}
          disabled={!labMode}
          storageKey={`ettercap-${activeFixture.id}`}
        />
      </section>
      {started && labMode && <LogPane logs={logs} />}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">ARP storyboard</h2>
        <p className="text-xs text-gray-400">
          Drag the nodes to visualise how traffic is routed after poisoning.
        </p>
        <ArpDiagram />
      </section>
    </div>
  );
}

