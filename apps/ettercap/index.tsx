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

type TimelineStatus = 'done' | 'current' | 'pending';
type TimelineStep = {
  title: string;
  description: string;
  status: TimelineStatus;
};
type StatusTone = 'success' | 'warning' | 'error';
type TimelineStep = {
  title: string;
  description: string;
  status: TimelineStatus;
};

const STATUS_TONE_MAP: Record<TimelineStatus, StatusTone> = {
  done: 'success',
  current: 'warning',
  pending: 'error',
};

const STATUS_STYLE: Record<StatusTone, { dot: string; card: string; heading: string; description: string }> = {
  success: {
    dot: 'bg-[color:var(--color-success)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-success)_35%,transparent)]',
    card:
      'border-[color:color-mix(in_srgb,var(--color-success)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-success)_12%,transparent)]',
    heading: 'text-[color:var(--kali-text)]',
    description: 'text-[color:color-mix(in_srgb,var(--color-success)_70%,var(--kali-text))]',
  },
  warning: {
    dot: 'bg-[color:var(--color-warning)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-warning)_40%,transparent)]',
    card:
      'border-[color:color-mix(in_srgb,var(--color-warning)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-warning)_15%,transparent)]',
    heading: 'text-[color:var(--kali-text)]',
    description: 'text-[color:color-mix(in_srgb,var(--color-warning)_75%,var(--kali-text))]',
  },
  error: {
    dot: 'bg-[color:var(--color-danger)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-danger)_40%,transparent)]',
    card:
      'border-[color:color-mix(in_srgb,var(--color-danger)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-danger)_12%,transparent)]',
    heading: 'text-[color:var(--kali-text)]',
    description: 'text-[color:color-mix(in_srgb,var(--color-danger)_75%,var(--kali-text))]',
  },
};

const METRIC_BADGE_CLASS =
  'rounded-full border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_10%,transparent)] px-3 py-1 font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_80%,var(--kali-text))]';

const ACCENT_SUBHEADING_TEXT = 'text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]';

export default function EttercapPage() {
  const [mode, setMode] = useState<(typeof MODES)[number]>('Unified');
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

  const timeline = useMemo<TimelineStep[]>(
    () => [
      {
        title: 'Select operation mode',
        description: MODE_DESCRIPTIONS[mode],
        status: 'done',
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
        label: 'Logs',
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
            <h1 className="text-2xl font-semibold text-[color:var(--kali-text)]">Ettercap Simulation Console</h1>
            <p className={`mt-1 text-sm ${ACCENT_SUBHEADING_TEXT}`}>
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
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)] ${
                  mode === m
                    ? 'border-[color:color-mix(in_srgb,var(--color-primary)_55%,transparent)] bg-[color:var(--color-primary)] text-[color:var(--kali-text)] shadow-[0_0_12px_color-mix(in_srgb,var(--color-primary)_35%,transparent)]'
                    : 'border-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)] bg-[color:var(--kali-panel)] text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))] hover:border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] hover:bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,var(--color-primary)_12%)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div
          className="flex flex-col gap-3 rounded-lg border border-[color:color-mix(in_srgb,var(--color-warning)_55%,transparent)] bg-[color:color-mix(in_srgb,var(--color-warning)_18%,var(--kali-panel))] p-3 text-sm text-[color:color-mix(in_srgb,var(--color-warning)_45%,var(--kali-text))]"
          role="note"
        >
          <p className="font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-warning)_80%,var(--kali-text))]">
            Simulation only
          </p>
          <p className="text-[color:color-mix(in_srgb,var(--color-warning)_35%,var(--kali-text))]">
            No live packets leave this sandbox. Use the controls below to rehearse attack paths and mitigation steps before
            applying them to lab networks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-[color:var(--color-primary)] px-4 py-2 text-[color:var(--kali-text)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_92%,var(--kali-panel))] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setStarted(true)}
              disabled={started}
            >
              {started ? 'Demo running' : 'Start demo'}
            </button>
            <button
              type="button"
              className="rounded border border-[color:color-mix(in_srgb,var(--color-danger)_70%,transparent)] px-4 py-2 text-[color:color-mix(in_srgb,var(--color-danger)_85%,var(--kali-text))] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)] hover:bg-[color:color-mix(in_srgb,var(--color-danger)_18%,var(--kali-panel))] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setStarted(false)}
              disabled={!started}
            >
              Stop demo
            </button>
          </div>
          <span className={`text-xs uppercase tracking-wide ${ACCENT_SUBHEADING_TEXT}`}>Simulation controls</span>
        </div>
      </header>

      <section aria-live="polite" className="space-y-2">
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${ACCENT_SUBHEADING_TEXT}`}>Operational metrics</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {metricBadges.map((badge) => (
            <span
              key={badge.label}
              className={METRIC_BADGE_CLASS}
            >
              {badge.label}:{' '}
              <span className="ml-1 capitalize text-[color:var(--kali-text)]">{badge.value}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${ACCENT_SUBHEADING_TEXT}`}>Attack workflow timeline</h2>
        <ol className="space-y-4 border-l border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] pl-4">
          {timeline.map((step) => {
            const tone = STATUS_TONE_MAP[step.status];
            const palette = STATUS_STYLE[tone];

            return (
              <li key={step.title} className="relative">
                <span
                  className={`absolute -left-[22px] top-2 h-3 w-3 rounded-full ${palette.dot} ${
                    step.status === 'current'
                      ? 'animate-pulse shadow-[0_0_0_6px_color-mix(in_srgb,var(--color-warning)_18%,transparent)]'
                      : ''
                  }`}
                  aria-hidden
                />
                <div className={`rounded-lg border p-3 text-sm ${palette.card}`}>
                  <p className={`font-semibold ${palette.heading}`}>{step.title}</p>
                  <p className={`mt-1 text-xs leading-relaxed ${palette.description}`}>{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {started && <LogPane logs={logs} />}
      {started && <ArpDiagram />}

      <h1 className="text-xl font-bold">Ettercap Filter Editor</h1>
      <div className="mb-4 rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-primary)_12%,var(--kali-panel))] p-4 text-sm text-[color:color-mix(in_srgb,var(--color-primary)_35%,var(--kali-text))]">
        <h2 className="text-base font-semibold text-[color:color-mix(in_srgb,var(--color-primary)_80%,var(--kali-text))]">Need a refresher?</h2>
        <p className="mt-2 text-[color:color-mix(in_srgb,var(--color-primary)_25%,var(--kali-text))]">
          Ettercap filters let you drop or rewrite packets using simple commands like
          <code className="mx-1 rounded bg-[color:color-mix(in_srgb,var(--color-primary)_24%,var(--kali-panel))] px-1 py-0.5 text-xs text-[color:var(--kali-text)]">
            drop
          </code>
          and
          <code className="mx-1 rounded bg-[color:color-mix(in_srgb,var(--color-primary)_24%,var(--kali-panel))] px-1 py-0.5 text-xs text-[color:var(--kali-text)]">
            replace
          </code>
          Combine them with patterns to experiment safely in this simulation before
          deploying changes on a real lab network.
        </p>
        <a
          href="https://www.ettercap-project.org/documentation/etterfilter/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center text-[color:color-mix(in_srgb,var(--color-primary)_78%,var(--kali-text))] underline transition hover:text-[color:var(--kali-text)]"
        >
          Read the Etterfilter guide
        </a>
      </div>
      <FilterEditor />
    </div>
  );
}
