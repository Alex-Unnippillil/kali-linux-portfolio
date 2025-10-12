'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

  const hasLogs = logs.length > 0;
  const logMilestoneReached = logs.length >= 4;

  const timeline = useMemo(
    () => [
      {
        title: 'Select operation mode',
        description: MODE_DESCRIPTIONS[mode],
        status: 'done' as const,
      },
      {
        title: 'Initiate MITM workflow',
        description: started
          ? 'Simulation is broadcasting crafted ARP replies to represent the attack path.'
          : 'Launch the demo to simulate ARP poisoning and packet interception.',
        status: started ? (hasLogs ? 'done' : 'current') : 'pending',
      },
      {
        title: 'Observe captured telemetry',
        description: hasLogs
          ? 'Log pane streaming randomized notices so you can practice triage without touching real hosts.'
          : 'Traffic indicators populate after the MITM phase begins.',
        status: hasLogs ? (logMilestoneReached ? 'done' : 'current') : 'pending',
      },
      {
        title: 'Plan containment & response',
        description:
          'Apply drop/replace rules in the filter editor to design mitigations before touching production networks.',
        status: started && hasLogs ? 'current' : 'pending',
      },
    ],
    [hasLogs, logMilestoneReached, mode, started],
  );

  const metricBadges = useMemo(
    () => [
      {
        label: 'Mode',
        value: mode,
      },
      {
        label: 'State',
        value: started ? 'Running' : 'Idle',
      },
      {
        label: 'Log entries',
        value: `${logs.length} ${logs.length === 1 ? 'entry' : 'entries'}`,
      },
    ],
    [logs.length, mode, started],
  );

  return (
    <div className="p-4 space-y-6">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Ettercap Simulation Console</h1>
            <p className="mt-1 text-sm text-blue-100/80">
              Walk through a safe, local‑only reenactment of Ettercap workflows while keeping real infrastructure untouched.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Mode selection">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                title={MODE_DESCRIPTIONS[m]}
                className={`px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide transition ${
                  mode === m
                    ? 'border-blue-400 bg-blue-600 text-white shadow'
                    : 'border-blue-900/60 bg-gray-900/80 text-blue-100 hover:border-blue-500'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100" role="note">
          <p className="font-semibold uppercase tracking-wide text-amber-200">Simulation only</p>
          <p>
            No live packets leave this sandbox. Use the controls below to rehearse attack paths and mitigation steps before
            applying them to lab networks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setStarted(true)}
              disabled={started}
            >
              {started ? 'Demo running' : 'Start demo'}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded border border-red-500 text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setStarted(false)}
              disabled={!started}
            >
              Stop demo
            </button>
          </div>
          <span className="text-xs uppercase tracking-wide text-blue-200">Simulation controls</span>
        </div>
      </header>

      <section aria-live="polite" className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-200">Operational metrics</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {metricBadges.map((badge) => (
            <span
              key={badge.label}
              className="rounded-full bg-gray-900/80 px-3 py-1 font-semibold uppercase tracking-wide text-blue-200"
            >
              {badge.label}:{' '}
              <span className="ml-1 capitalize text-white">{badge.value}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-200">Attack workflow timeline</h2>
        <ol className="space-y-4 border-l border-blue-500/30 pl-4">
          {timeline.map((step) => {
            const baseDot =
              step.status === 'done'
                ? 'bg-green-400'
                : step.status === 'current'
                ? 'bg-blue-400 animate-pulse'
                : 'bg-gray-600';
            const baseCard =
              step.status === 'done'
                ? 'border-green-500/40 bg-green-500/5'
                : step.status === 'current'
                ? 'border-blue-500/50 bg-blue-500/10'
                : 'border-gray-700 bg-gray-900/40';

            return (
              <li key={step.title} className="relative">
                <span className={`absolute -left-[22px] top-2 h-3 w-3 rounded-full ${baseDot}`} aria-hidden />
                <div className={`rounded-lg border p-3 text-sm text-blue-100 ${baseCard}`}>
                  <p className="font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-blue-100/80">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {started && <LogPane logs={logs} />}
      {started && <ArpDiagram />}

      <h1 className="text-xl font-bold">Ettercap Filter Editor</h1>
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

