'use client';

import React, { useMemo, useState } from 'react';

import { useEttercapSimulator } from './useSimulator';
import { getTimelineStatus, ScenarioId } from './simulator';
import ArpDiagram from './components/ArpDiagram';
import FilterEditor from './components/FilterEditor';
import LogPane from './components/LogPane';

const STATUS_STYLE: Record<
  'done' | 'current' | 'pending',
  { dot: string; card: string; heading: string; description: string }
> = {
  done: {
    dot: 'bg-[color:var(--color-success)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-success)_35%,transparent)]',
    card:
      'border-[color:color-mix(in_srgb,var(--color-success)_35%,transparent)] bg-[color:color-mix(in_srgb,var(--color-success)_12%,transparent)]',
    heading: 'text-[color:var(--kali-text)]',
    description: 'text-[color:color-mix(in_srgb,var(--color-success)_70%,var(--kali-text))]',
  },
  current: {
    dot: 'bg-[color:var(--color-warning)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-warning)_40%,transparent)]',
    card:
      'border-[color:color-mix(in_srgb,var(--color-warning)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--color-warning)_15%,transparent)]',
    heading: 'text-[color:var(--kali-text)]',
    description: 'text-[color:color-mix(in_srgb,var(--color-warning)_75%,var(--kali-text))]',
  },
  pending: {
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

export default function EttercapConsole({ variant = 'page' }: { variant?: 'page' | 'desktop' }) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('normal');
  const { scenario, scenarios, state, dispatch } = useEttercapSimulator(scenarioId);
  const timeline = useMemo(
    () => getTimelineStatus(scenario, state.currentTime, state.status),
    [scenario, state.currentTime, state.status],
  );

  const metricBadges = useMemo(
    () => [
      {
        label: 'Mode',
        value: scenario.name,
      },
      {
        label: 'State',
        value: state.status === 'running' ? 'Running' : state.status === 'paused' ? 'Paused' : 'Idle',
      },
      {
        label: 'Logs',
        value: `${state.logs.length} ${state.logs.length === 1 ? 'entry' : 'entries'}`,
      },
      {
        label: 'Packets',
        value: state.metrics.packets ?? 0,
      },
    ],
    [scenario.name, state.logs.length, state.metrics.packets, state.status],
  );

  return (
    <div
      className={`flex h-full w-full flex-col gap-6 ${
        variant === 'desktop' ? 'p-4 text-sm' : 'p-4 lg:p-6'
      } text-[color:var(--kali-text)]`}
    >
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[color:var(--kali-text)]">Ettercap Simulation Console</h1>
            <p className={`mt-1 text-sm ${ACCENT_SUBHEADING_TEXT}`}>
              Walk through a safe, deterministic reenactment of Ettercap workflows with zero live network traffic.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-primary)_75%,var(--kali-text))]">
              Scenario
              <select
                className="mt-1 w-full rounded border border-[color:color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[color:var(--kali-panel)] px-3 py-2 text-sm text-[color:var(--kali-text)]"
                value={scenarioId}
                onChange={(event) => setScenarioId(event.target.value as typeof scenarioId)}
              >
                {scenarios.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs text-[color:color-mix(in_srgb,var(--color-primary)_60%,var(--kali-text))]">
              {scenario.description}
            </span>
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
            This console is a visual reenactment. All packet logs, flows, and ARP cache updates are local fixtures.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded bg-[color:var(--color-primary)] px-4 py-2 text-[color:var(--kali-text)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_92%,var(--kali-panel))] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => dispatch({ type: 'start' })}
              disabled={state.status === 'running'}
            >
              {state.status === 'running' ? 'Demo running' : 'Start demo'}
            </button>
            <button
              type="button"
              className="rounded border border-[color:color-mix(in_srgb,var(--color-warning)_70%,transparent)] px-4 py-2 text-[color:color-mix(in_srgb,var(--color-warning)_85%,var(--kali-text))] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-warning)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)] hover:bg-[color:color-mix(in_srgb,var(--color-warning)_18%,var(--kali-panel))] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => dispatch({ type: state.status === 'paused' ? 'resume' : 'pause' })}
              disabled={state.status === 'idle' || state.status === 'complete'}
            >
              {state.status === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_70%,transparent)] px-4 py-2 text-[color:color-mix(in_srgb,var(--color-primary)_85%,var(--kali-text))] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)] hover:bg-[color:color-mix(in_srgb,var(--color-primary)_18%,var(--kali-panel))] disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => dispatch({ type: 'step' })}
              disabled={state.status === 'complete'}
            >
              Step
            </button>
            <button
              type="button"
              className="rounded border border-[color:color-mix(in_srgb,var(--color-danger)_70%,transparent)] px-4 py-2 text-[color:color-mix(in_srgb,var(--color-danger)_85%,var(--kali-text))] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-bg)] hover:bg-[color:color-mix(in_srgb,var(--color-danger)_18%,var(--kali-panel))]"
              onClick={() => dispatch({ type: 'reset' })}
            >
              Reset
            </button>
          </div>
          <span className={`text-xs uppercase tracking-wide ${ACCENT_SUBHEADING_TEXT}`}>Simulation controls</span>
        </div>
      </header>

      <section aria-live="polite" className="space-y-2">
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${ACCENT_SUBHEADING_TEXT}`}>
          Operational metrics
        </h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {metricBadges.map((badge) => (
            <span key={badge.label} className={METRIC_BADGE_CLASS}>
              {badge.label}:{' '}
              <span className="ml-1 capitalize text-[color:var(--kali-text)]">{badge.value}</span>
            </span>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          <div>
            <h2 className={`text-sm font-semibold uppercase tracking-wide ${ACCENT_SUBHEADING_TEXT}`}>
              Attack workflow timeline
            </h2>
            <ol className="mt-3 space-y-4 border-l border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] pl-4">
              {timeline.map((step) => {
                const palette = STATUS_STYLE[step.status];

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
          </div>

          <LogPane logs={state.logs} onClear={() => dispatch({ type: 'clearLogs' })} />

          <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color:var(--kali-panel)] p-3">
            <h3 className="text-sm font-semibold text-[color:var(--kali-text)]">Packet trace</h3>
            <p className="text-xs text-[color:color-mix(in_srgb,var(--color-primary)_65%,var(--kali-text))]">
              Playback derived from the selected scenario fixtures.
            </p>
            <ul className="mt-3 space-y-1 rounded border border-[color:color-mix(in_srgb,var(--color-primary)_20%,transparent)] bg-[color:var(--kali-bg)] p-3 text-xs font-mono text-[color:var(--kali-text)]">
              {state.traces.length === 0 ? (
                <li className="text-[color:color-mix(in_srgb,var(--color-primary)_60%,var(--kali-text))]">
                  No traces yet. Start or step the simulation to view packets.
                </li>
              ) : (
                state.traces.map((trace, index) => <li key={`${trace}-${index}`}>{trace}</li>)
              )}
            </ul>
          </div>
        </section>

        <aside className="space-y-4">
          <ArpDiagram flows={state.flows} activeFlowId={state.activeFlowId} />

          <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color:var(--kali-panel)] p-3">
            <h3 className="text-sm font-semibold text-[color:var(--kali-text)]">ARP cache table</h3>
            <table className="mt-3 w-full text-left text-xs">
              <thead>
                <tr className="text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
                  <th className="pb-2" scope="col">
                    IP
                  </th>
                  <th className="pb-2" scope="col">
                    MAC
                  </th>
                  <th className="pb-2" scope="col">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.arpTable.map((entry) => (
                  <tr
                    key={entry.ip}
                    className="border-t border-[color:color-mix(in_srgb,var(--color-primary)_15%,transparent)]"
                  >
                    <td className="py-2 font-mono text-[color:var(--kali-text)]">{entry.ip}</td>
                    <td className="py-2 font-mono text-[color:var(--kali-text)]">{entry.mac}</td>
                    <td className="py-2 text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
                      {entry.status ?? 'stable'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-[color:color-mix(in_srgb,var(--color-primary)_60%,var(--kali-text))]">
              Vendor hints: {state.arpTable.map((entry) => entry.vendor).join(', ')}.
            </p>
          </div>

          <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color:var(--kali-panel)] p-3">
            <h3 className="text-sm font-semibold text-[color:var(--kali-text)]">Observed flows</h3>
            <ul className="mt-3 space-y-2 text-xs">
              {state.flows.length === 0 ? (
                <li className="text-[color:color-mix(in_srgb,var(--color-primary)_60%,var(--kali-text))]">
                  No flows captured yet.
                </li>
              ) : (
                state.flows.map((flow) => (
                  <li
                    key={flow.id}
                    className="rounded border border-[color:color-mix(in_srgb,var(--color-primary)_25%,transparent)] bg-[color:var(--kali-bg)] px-3 py-2"
                  >
                    <span className="font-semibold text-[color:var(--kali-text)]">
                      {flow.from} → {flow.to}
                    </span>
                    <span className="ml-2 text-[color:color-mix(in_srgb,var(--color-primary)_70%,var(--kali-text))]">
                      {flow.label}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>
      </div>

      <FilterEditor />

      <div className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_35%,transparent)] bg-[color:var(--kali-panel)] p-4 text-xs text-[color:color-mix(in_srgb,var(--color-primary)_65%,var(--kali-text))]">
        <p>
          This interface is a simulation only. It does not send packets, scan networks, or perform real interception. Use it
          to rehearse workflows before touching any live infrastructure.
        </p>
      </div>
    </div>
  );
}
