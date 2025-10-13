'use client';

import React from 'react';
import DsniffApp from '../../components/apps/dsniff';
import CredentialExplainer from './components/CredentialExplainer';
import StressSandbox from './components/StressSandbox';

const DsniffPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[color-mix(in_srgb,var(--kali-bg)_88%,var(--kali-panel))] text-kali-text">
      <div className="mx-auto max-w-6xl space-y-16 px-6 py-12">
        <section className="space-y-5">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-kali-control">
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
          <div className="overflow-hidden rounded-3xl border border-[color:color-mix(in_srgb,var(--kali-panel-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--kali-panel)_88%,var(--kali-bg))] shadow-2xl">
            <DsniffApp />
          </div>
        </section>

        <section className="space-y-5">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-kali-severity-medium">
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
          <div className="overflow-hidden rounded-3xl border border-[color:color-mix(in_srgb,var(--kali-panel-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--kali-panel)_88%,var(--kali-bg))] shadow-2xl">
            <CredentialExplainer />
          </div>
        </section>

        <section className="space-y-5">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-kali-severity-high">
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
          <div className="overflow-hidden rounded-3xl border border-[color:color-mix(in_srgb,var(--kali-panel-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--kali-panel)_88%,var(--kali-bg))] shadow-2xl">
            <StressSandbox />
          </div>
        </section>
      </div>
    </div>
  );
};

export default DsniffPage;
