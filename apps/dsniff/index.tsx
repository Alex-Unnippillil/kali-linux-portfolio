'use client';

import React from 'react';
import DsniffApp from '../../components/apps/dsniff';
import CredentialExplainer from './components/CredentialExplainer';
import StressSandbox from './components/StressSandbox';

const DsniffPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-kali-background text-kali-text">
      <div className="mx-auto max-w-6xl space-y-16 px-6 py-12">
        <section className="space-y-5">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:color-mix(in_srgb,var(--color-accent)_70%,var(--color-text)_30%)]">
              Simulated toolkit
            </p>
            <h2 className="text-3xl font-semibold text-kali-text">
              Traffic Capture Workbench
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-kali-text/80">
              Explore simulated urlsnarf and arpspoof output in a safe lab that
              highlights how credential leakage is surfaced and triaged.
            </p>
          </header>
          <div className="relative overflow-hidden rounded-3xl border border-kali-border/60 bg-kali-surface/90 shadow-kali-panel shadow-[0_18px_55px_-28px_var(--kali-blue-glow)] ring-1 ring-inset ring-kali-primary/25">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--color-accent)_28%,transparent)_0%,transparent_65%)] opacity-70"
            />
            <DsniffApp />
          </div>
        </section>

        <section className="space-y-5">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:color-mix(in_srgb,var(--kali-magenta)_75%,var(--color-text)_25%)]">
              Guided walkthrough
            </p>
            <h2 className="text-3xl font-semibold text-kali-text">
              Credential Exposure Narrative
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-kali-text/80">
              Step through the capture-and-replay storyline to understand how
              weak transport layers allow adversaries to intercept credentials.
            </p>
          </header>
          <div className="relative overflow-hidden rounded-3xl border border-kali-border/60 bg-kali-surface/90 shadow-kali-panel shadow-[0_18px_55px_-28px_var(--kali-magenta-glow)] ring-1 ring-inset ring-kali-magenta/25">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--kali-magenta)_32%,transparent)_0%,transparent_60%)] opacity-75"
            />
            <CredentialExplainer />
          </div>
        </section>

        <section className="space-y-5">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[color:color-mix(in_srgb,var(--color-accent)_65%,var(--color-text)_35%)]">
              Performance lab
            </p>
            <h2 className="text-3xl font-semibold text-kali-text">
              Stress Testing Sandbox
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-kali-text/80">
              Tune simulated packet volumes to see how scaling capture and replay
              affects response times without touching real infrastructure.
            </p>
          </header>
          <div className="relative overflow-hidden rounded-3xl border border-kali-border/60 bg-kali-surface/90 shadow-kali-panel shadow-[0_18px_55px_-28px_var(--kali-blue-glow)] ring-1 ring-inset ring-kali-primary/20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom,color-mix(in_srgb,var(--color-accent)_26%,transparent)_0%,transparent_70%)] opacity-70"
            />
            <StressSandbox />
          </div>
        </section>
      </div>
    </div>
  );
};

export default DsniffPage;
