'use client';

import React, { useCallback } from 'react';
import KismetApp from '../../components/apps/kismet.jsx';
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
    <div className="space-y-8">
      <aside
        aria-label="Simulation notice"
        className="rounded-xl border border-amber-500/40 bg-amber-900/20 p-4 text-sm text-amber-100/90 shadow"
        role="note"
      >
        <p className="font-semibold text-amber-100">Simulation notice</p>
        <p className="mt-2">
          All telemetry in this workspace is replayed from bundled fixture data
          (<code className="font-mono">sampleCapture.json</code> and{' '}
          <code className="font-mono">sampleClients.json</code>) so the demo can
          run entirely offline.
        </p>
        <p className="mt-2">
          Safe Mode keeps radio controls, uploads, and outbound probes disabled;
          toggling Lab Mode only unlocks additional filters on the simulated
          dataset.
        </p>
      </aside>

      <section
        aria-labelledby="kismet-monitor-heading"
        className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6 shadow-lg"
      >
        <h1
          id="kismet-monitor-heading"
          className="mb-4 text-2xl font-semibold text-sky-100"
        >
          Kismet Live Monitor (Simulated)
        </h1>
        <KismetApp onNetworkDiscovered={handleNetworkDiscovered} />
      </section>

      <section
        aria-labelledby="deauth-walkthrough-heading"
        className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-6 shadow-lg"
      >
        <h2
          id="deauth-walkthrough-heading"
          className="mb-4 text-xl font-semibold text-sky-100"
        >
          Deauthentication Walkthrough
        </h2>
        <DeauthWalkthrough />
      </section>
    </div>
  );
};

export default KismetPage;
