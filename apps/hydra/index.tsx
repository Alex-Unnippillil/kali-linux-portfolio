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
    <div className="min-h-screen bg-[var(--kali-bg)] text-[color:var(--kali-text)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest text-[color:color-mix(in_srgb,var(--kali-control)_80%,var(--kali-text))]">
            Hydra Simulation Lab
          </p>
          <h1 className="text-3xl font-semibold text-[color:var(--kali-text)] sm:text-4xl">
            Credential Testing Workbench
          </h1>
          <p className="max-w-3xl text-sm text-[color:color-mix(in_srgb,var(--kali-text)_82%,transparent)] sm:text-base">
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
              className="rounded-lg border border-[color:color-mix(in_srgb,var(--kali-control)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-control)_18%,var(--kali-overlay))] p-4 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_92%,transparent)] shadow-[0_12px_32px_rgba(15,148,210,0.08)]"
            >
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[color:color-mix(in_srgb,var(--kali-control)_85%,var(--kali-text))]">
                Hydra run tabs
              </h2>
              <p className="mt-2 text-[color:color-mix(in_srgb,var(--kali-text)_88%,transparent)]">
                Every tab spins up a simulated Hydra session with canned targets and output, giving
                you a safe sandbox for experimenting with credential combinations and pause/resume
                flows.
              </p>
              <a
                className="mt-3 inline-flex items-center text-xs font-medium text-[color:var(--kali-control)] underline decoration-[color:color-mix(in_srgb,var(--kali-control)_65%,transparent)] transition-colors hover:text-[color:color-mix(in_srgb,var(--kali-control)_85%,var(--kali-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
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
              className="rounded-lg border border-[color:color-mix(in_srgb,var(--kali-control)_45%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-control)_14%,var(--kali-overlay))] p-4 text-sm text-[color:color-mix(in_srgb,var(--kali-text)_92%,transparent)] shadow-[0_12px_32px_rgba(15,148,210,0.08)]"
            >
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[color:color-mix(in_srgb,var(--kali-control)_85%,var(--kali-text))]">
                Strategy trainer
              </h2>
              <p className="mt-2 text-[color:color-mix(in_srgb,var(--kali-text)_88%,transparent)]">
                Adjust parallelism and lockout thresholds to see how defensive controls change your
                odds of success over time. It models a simplified probability curve instead of
                talking to real services.
              </p>
              <a
                className="mt-3 inline-flex items-center text-xs font-medium text-[color:var(--kali-control)] underline decoration-[color:color-mix(in_srgb,var(--kali-control)_65%,transparent)] transition-colors hover:text-[color:color-mix(in_srgb,var(--kali-control)_85%,var(--kali-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
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
