'use client';

import React from 'react';
import DsniffApp from '../../components/apps/dsniff';
import CredentialExplainer from './components/CredentialExplainer';
import StressSandbox from './components/StressSandbox';

const DsniffPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="mx-auto max-w-6xl space-y-16 px-6 py-12">
        <section className="space-y-5">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-kali-primary/80">
              Simulated toolkit
            </p>
            <h2 className="text-3xl font-semibold text-[var(--color-text)]">
              Traffic Capture Workbench
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-[color:color-mix(in_srgb,var(--color-text) 82%, transparent 18%)]">
              Explore simulated urlsnarf and arpspoof output in a safe lab that
              highlights how credential leakage is surfaced and triaged.
            </p>
          </header>
          <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[var(--kali-panel)] shadow-kali-panel">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-kali-primary/80 via-transparent to-transparent"
            />
            <DsniffApp />
          </div>
        </section>

        <section className="space-y-5">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-kali-accent/80">
              Guided walkthrough
            </p>
            <h2 className="text-3xl font-semibold text-[var(--color-text)]">
              Credential Exposure Narrative
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-[color:color-mix(in_srgb,var(--color-text) 82%, transparent 18%)]">
              Step through the capture-and-replay storyline to understand how
              weak transport layers allow adversaries to intercept credentials.
            </p>
          </header>
          <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[var(--kali-panel)] shadow-kali-panel">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-kali-accent/80 via-transparent to-transparent"
            />
            <CredentialExplainer />
          </div>
        </section>

        <section className="space-y-5">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-kali-primary/80">
              Performance lab
            </p>
            <h2 className="text-3xl font-semibold text-[var(--color-text)]">
              Stress Testing Sandbox
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-[color:color-mix(in_srgb,var(--color-text) 82%, transparent 18%)]">
              Tune simulated packet volumes to see how scaling capture and replay
              affects response times without touching real infrastructure.
            </p>
          </header>
          <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-border)] bg-[var(--kali-panel)] shadow-kali-panel">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-kali-primary/80 via-kali-accent/70 to-transparent"
            />
            <StressSandbox />
          </div>
        </section>
      </div>
    </div>
  );
};

export default DsniffPage;
