'use client';

import React, { useRef } from 'react';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import HydraApp from '../../components/apps/hydra';
import StrategyTrainer from './components/StrategyTrainer';

const HydraPreview: React.FC = () => {
  const countRef = useRef(1);

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return {
      id,
      title: `Run ${countRef.current++}`,
      content: <HydraApp key={id} />,
    };
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-12">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-sky-300">
            Hydra Simulation Lab
          </p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Credential Testing Workbench
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-gray-300 sm:text-base">
            Explore password spraying strategies without touching a live target. Each run is a
            sandboxed recreation of the Hydra CLI so you can practice configuring services,
            wordlists, and lockout handling inside the desktop shell. The cues below map directly to
            the credential queue table, progress pulse, and status banners inside each simulated
            window.
          </p>
        </header>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="space-y-5">
            <TabbedWindow initialTabs={[createTab()]} onNewTab={createTab} />
            <div
              role="note"
              className="rounded-xl border border-sky-500/35 bg-sky-950/60 p-5 text-sm text-sky-100 shadow-lg shadow-sky-900/20 backdrop-blur"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
                  Hydra run tabs
                </h2>
                <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-200">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full bg-sky-300 shadow shadow-sky-500/40"
                  />
                  Live Queue Guide
                </span>
              </div>
              <p className="mt-3 text-sky-100/90">
                Every tab spins up a simulated Hydra session with canned targets and output, giving
                you a safe sandbox for experimenting with credential combinations and pause/resume
                flows. Use the legend below to understand how the credential queue rows and progress
                pulse communicate each attempt.
              </p>
              <dl className="mt-4 grid gap-3 text-xs text-sky-100/80 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-100/10 bg-sky-900/40 p-3">
                  <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-300">
                    <span
                      aria-hidden
                      className="h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow shadow-emerald-500/60"
                    />
                    Active attempt
                  </dt>
                  <dd className="mt-2 leading-relaxed">
                    Highlighted rows and the glowing progress arc mean Hydra is testing the current
                    username/password pair.
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-100/10 bg-sky-900/40 p-3">
                  <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-300">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full bg-amber-300 shadow shadow-amber-500/60"
                    />
                    Throttled watch
                  </dt>
                  <dd className="mt-2 leading-relaxed">
                    Amber badges warn that defensive timers are slowing the queue. Expect longer
                    dwell on each credential.
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-100/10 bg-sky-900/40 p-3">
                  <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-200">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full bg-cyan-200 shadow shadow-cyan-500/60"
                    />
                    Queued next
                  </dt>
                  <dd className="mt-2 leading-relaxed">
                    Muted rows stay in the pipeline while you edit presets. Keyboard focus shifts
                    cleanly between queued credentials.
                  </dd>
                </div>
                <div className="rounded-lg border border-slate-100/10 bg-sky-900/40 p-3">
                  <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-rose-300">
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full bg-rose-300 shadow shadow-rose-500/60"
                    />
                    Locked / complete
                  </dt>
                  <dd className="mt-2 leading-relaxed">
                    Rose alerts surface account lockouts or a finished sweep. Progress arcs freeze
                    and status banners flip to Complete.
                  </dd>
                </div>
              </dl>
              <a
                className="mt-4 inline-flex items-center text-xs font-semibold text-sky-200 underline decoration-sky-200/70 underline-offset-4 transition hover:text-sky-100"
                href="/docs/app-ecosystem-roadmap.md"
                target="_blank"
                rel="noreferrer"
              >
                Simulation scope &amp; fixtures (docs/app-ecosystem-roadmap.md)
              </a>
            </div>
          </section>
          <aside className="space-y-5">
            <StrategyTrainer className="mt-0" />
            <div
              role="note"
              className="rounded-xl border border-purple-500/40 bg-purple-950/60 p-5 text-sm text-purple-100 shadow-lg shadow-purple-900/20 backdrop-blur"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-200">
                  Strategy trainer
                </h2>
                <span className="inline-flex items-center gap-2 rounded-full border border-purple-500/50 bg-purple-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-purple-100">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full bg-purple-300 shadow shadow-purple-500/40"
                  />
                  Scenario presets
                </span>
              </div>
              <p className="mt-3 text-purple-100/90">
                Adjust parallelism and lockout thresholds to see how defensive controls change your
                odds of success over time. It models a simplified probability curve instead of
                talking to real services, and the preset buttons keep keyboard focus so you can tab
                between controls without losing your place.
              </p>
              <ul className="mt-4 space-y-2 text-xs text-purple-100/80">
                <li className="flex gap-2">
                  <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-300" />
                  Lockout streak alerts are mirrored in the main window status banner.
                </li>
                <li className="flex gap-2">
                  <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-300" />
                  Progress indicators dim when probability curves suggest backing off.
                </li>
              </ul>
              <a
                className="mt-4 inline-flex items-center text-xs font-semibold text-purple-200 underline decoration-purple-200/70 underline-offset-4 transition hover:text-purple-100"
                href="/docs/tasks.md"
                target="_blank"
                rel="noreferrer"
              >
                Lab planning checklist (docs/tasks.md)
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default HydraPreview;
