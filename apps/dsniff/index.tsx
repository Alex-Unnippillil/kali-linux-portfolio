'use client';

import React from 'react';
import DsniffApp from '../../components/apps/dsniff';
import CredentialExplainer from './components/CredentialExplainer';
import StressSandbox from './components/StressSandbox';

const DsniffPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="mx-auto max-w-6xl space-y-12 px-6 py-10">
        <section className="space-y-4">
          <header className="space-y-2">
            <h2 className="text-2xl font-semibold">Traffic Capture Workbench</h2>
            <p className="text-sm text-gray-300">
              Explore simulated urlsnarf and arpspoof output in a safe lab that
              highlights how credential leakage is surfaced and triaged.
            </p>
          </header>
          <div className="overflow-hidden rounded-xl border border-gray-800/60 bg-gray-900/40 shadow-lg">
            <DsniffApp />
          </div>
        </section>

        <section className="space-y-4">
          <header className="space-y-2">
            <h2 className="text-2xl font-semibold">Credential Exposure Narrative</h2>
            <p className="text-sm text-gray-300">
              Step through the capture-and-replay storyline to understand how
              weak transport layers allow adversaries to intercept credentials.
            </p>
          </header>
          <div className="overflow-hidden rounded-xl border border-gray-800/60 bg-gray-900/40 shadow-lg">
            <CredentialExplainer />
          </div>
        </section>

        <section className="space-y-4">
          <header className="space-y-2">
            <h2 className="text-2xl font-semibold">Stress Testing Sandbox</h2>
            <p className="text-sm text-gray-300">
              Tune simulated packet volumes to see how scaling capture and replay
              affects response times without touching real infrastructure.
            </p>
          </header>
          <div className="overflow-hidden rounded-xl border border-gray-800/60 bg-gray-900/40 shadow-lg">
            <StressSandbox />
          </div>
        </section>
      </div>
    </div>
  );
};

export default DsniffPage;
