'use client';

import React, { useCallback } from 'react';

import AppShell from '../../components/apps/AppShell';
import KismetApp from '../../components/apps/kismet';
import DeauthWalkthrough from './components/DeauthWalkthrough';
import { createLogger } from '../../lib/logger';

const KismetPage: React.FC = () => {
  const handleNetworkDiscovered = useCallback(
    (net?: { ssid: string; bssid: string; discoveredAt: number }) => {
      if (!net) return;
      const logger = createLogger();
      logger.info('network discovered', {
        ssid: net.ssid || net.bssid,
        time: new Date(net.discoveredAt).toISOString(),
      });
    },
    [],
  );

  return (
    <div className="space-y-8 lg:space-y-10">
      <AppShell
        title="Kismet Live Monitor"
        description="Replay beacon frames from the bundled capture or upload a lab PCAP to explore offline."
        helpLink="/docs/kismet.md"
        helpLabel="Kismet docs"
        status={<span className="text-[color:var(--color-accent)]">Simulated data</span>}
      >
        <aside
          aria-label="Simulation notice"
          className="mb-6 rounded-xl border border-amber-500/40 bg-amber-900/20 p-4 text-sm text-amber-100/90 shadow"
          role="note"
        >
          <p className="text-base font-semibold uppercase tracking-wide text-amber-100">Simulation notice</p>
          <p className="mt-2">
            All telemetry in this workspace is replayed from bundled fixture data (
            <code className="font-mono">sampleCapture.json</code> and{' '}
            <code className="font-mono">sampleClients.json</code>) so the demo can run entirely offline.
          </p>
          <p className="mt-2">
            Safe Mode keeps radio controls, uploads, and outbound probes disabled; toggling Lab Mode only unlocks additional
            filters on the simulated dataset.
          </p>
        </aside>
        <KismetApp onNetworkDiscovered={handleNetworkDiscovered} />
      </AppShell>

      <AppShell
        title="Deauthentication Walkthrough"
        description="Review how disruptive management frames surface in the capture log without touching real radios."
        helpLink="/docs/deauth-mitigation.md"
        helpLabel="Mitigation notes"
        status={<span className="text-[color:var(--color-accent)]">Guided demo</span>}
      >
        <DeauthWalkthrough />
      </AppShell>
    </div>
  );
};

export default KismetPage;
