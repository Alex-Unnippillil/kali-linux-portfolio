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
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-300">
            Hydra Simulation Lab
          </p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Credential Testing Workbench
          </h1>
          <p className="max-w-3xl text-sm text-gray-300 sm:text-base">
            Explore password spraying strategies without touching a live target. Each run is a
            sandboxed recreation of the Hydra CLI so you can practice configuring services,
            wordlists, and lockout handling inside the desktop shell.
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            <TabbedWindow initialTabs={[createTab()]} onNewTab={createTab} />
            <div
              role="note"
              className="rounded-lg border border-sky-500/30 bg-sky-900/40 p-4 text-sm text-sky-100"
            >
              <h2 className="text-xs font-semibold uppercase tracking-widest text-sky-200">
                Hydra run tabs
              </h2>
              <p className="mt-2 text-sky-100/90">
                Every tab spins up a simulated Hydra session with canned targets and output, giving
                you a safe sandbox for experimenting with credential combinations and pause/resume
                flows.
              </p>
              <a
                className="mt-3 inline-flex items-center text-xs font-medium text-sky-200 underline hover:text-sky-100"
                href="/docs/app-ecosystem-roadmap.md"
                target="_blank"
                rel="noreferrer"
              >
                Simulation scope &amp; fixtures (docs/app-ecosystem-roadmap.md)
              </a>
            </div>
          </section>
          <aside className="space-y-4">
            <StrategyTrainer className="mt-0" />
            <div
              role="note"
              className="rounded-lg border border-purple-500/30 bg-purple-900/40 p-4 text-sm text-purple-100"
            >
              <h2 className="text-xs font-semibold uppercase tracking-widest text-purple-200">
                Strategy trainer
              </h2>
              <p className="mt-2 text-purple-100/90">
                Adjust parallelism and lockout thresholds to see how defensive controls change your
                odds of success over time. It models a simplified probability curve instead of
                talking to real services.
              </p>
              <a
                className="mt-3 inline-flex items-center text-xs font-medium text-purple-200 underline hover:text-purple-100"
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
