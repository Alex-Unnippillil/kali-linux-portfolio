'use client';

import React, { useCallback } from 'react';
import KismetApp from '../../components/apps/kismet';
import DeauthWalkthrough from './components/DeauthWalkthrough';
import { createLogger } from '../../lib/logger';

const KismetPage: React.FC = () => {
  const handleNetworkDiscovered = useCallback(
    (net?: { ssid: string; bssid: string; discoveredAt: number }) => {
      if (!net) return;
      if (process.env.NODE_ENV === 'test') {
        return;
      }
      const logger = createLogger();
      logger.info('network discovered', {
        ssid: net.ssid || net.bssid,
        time: new Date(net.discoveredAt).toISOString(),
      });
    },
    [],
  );

  return (
    <div className="space-y-10 lg:space-y-12">
      <aside
        aria-label="Simulation notice"
        className="rounded-xl border border-amber-500/40 bg-amber-900/20 p-5 text-sm text-amber-100/90 shadow"
        role="note"
      >
        <p className="text-base font-semibold uppercase tracking-wide text-amber-100">
          Simulation notice
        </p>
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
        className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-8 shadow-xl"
      >
        <h1
          id="kismet-monitor-heading"
          className="mb-6 text-3xl font-bold tracking-tight text-sky-50 sm:text-4xl"
        >
          Kismet Live Monitor (Simulated)
        </h1>
        <KismetApp onNetworkDiscovered={handleNetworkDiscovered} />
      </section>

      <section
        aria-labelledby="deauth-walkthrough-heading"
        className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-8 shadow-xl"
      >
        <h2
          id="deauth-walkthrough-heading"
          className="mb-4 text-2xl font-semibold tracking-tight text-sky-50"
        >
          Deauthentication Walkthrough
        </h2>
        <DeauthWalkthrough />
      </section>
    </div>
  );
};

export default KismetPage;
