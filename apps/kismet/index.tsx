'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import KismetApp from '../../components/apps/kismet.jsx';
import { createLogger } from '../../lib/logger';
import ChannelChart from './components/ChannelChart';
import DeauthWalkthrough from './components/DeauthWalkthrough';
import SignalGraph, {
  SignalGraphHandle,
  SignalSample,
} from './components/SignalGraph';
import sampleCapture from './sampleCapture.json';

type SampleNetwork = {
  ssid: string;
  bssid: string;
  channel: number;
  signal: number;
};

const clampSignal = (value: number) => Math.max(-95, Math.min(-25, value));

const KismetPage: React.FC = () => {
  const loggerRef = useRef(createLogger());
  const [graphHandle, setGraphHandle] = useState<SignalGraphHandle | null>(null);
  const graphHandleRef = useRef<SignalGraphHandle | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingSamplesRef = useRef<SignalSample[]>([]);

  const attachGraph = useCallback((instance: SignalGraphHandle | null) => {
    graphHandleRef.current = instance;
    setGraphHandle(instance);
  }, []);

  const knownNetworks = useMemo(() => {
    const byBssid = new Map<string, SampleNetwork>();
    (sampleCapture as SampleNetwork[]).forEach((row) => {
      if (!byBssid.has(row.bssid)) {
        byBssid.set(row.bssid, row);
      }
    });
    return Array.from(byBssid.values());
  }, []);

  const flushPending = useCallback(() => {
    rafRef.current = null;
    const handle = graphHandleRef.current;
    if (!handle || pendingSamplesRef.current.length === 0) return;
    const payload = pendingSamplesRef.current.splice(0, pendingSamplesRef.current.length);
    handle.pushSamples(payload);
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(flushPending);
  }, [flushPending]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!graphHandle) return;
    let tick = 0;
    const interval = window.setInterval(() => {
      const timestamp = Date.now();
      tick += 1;
      knownNetworks.forEach((net, idx) => {
        const oscillation = Math.sin((tick + idx) * 0.32) * 4.5;
        const drift = Math.cos((tick * 0.18 + idx) * 0.9) * 2.5;
        const noise = (Math.random() - 0.5) * 1.8;
        const rssi = clampSignal(net.signal + oscillation + drift + noise);
        pendingSamplesRef.current.push({
          bssid: net.bssid,
          rssi,
          timestamp,
        });
      });
      scheduleFlush();
    }, 250);

    return () => {
      clearInterval(interval);
    };
  }, [graphHandle, knownNetworks, scheduleFlush]);

  const handleNetworkDiscovered = useCallback(
    (net?: { ssid: string; bssid: string; discoveredAt: number }) => {
      if (!net) return;
      const logger = loggerRef.current;
      logger.info('network discovered', {
        ssid: net.ssid || net.bssid,
        time: new Date(net.discoveredAt).toISOString(),
      });
    },
    [],
  );

  return (
    <div className="space-y-4 text-white">
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 shadow-lg">
          <KismetApp onNetworkDiscovered={handleNetworkDiscovered} />
        </div>
        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Signal monitor</h2>
              <span className="text-xs text-slate-400">Last 60s</span>
            </div>
            <SignalGraph ref={attachGraph} height={220} />
          </div>
          <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-4 shadow-lg">
            <h2 className="mb-3 text-base font-semibold">Channel distribution</h2>
            <ChannelChart />
          </div>
        </aside>
      </div>
      <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 shadow-lg">
        <DeauthWalkthrough />
      </div>
    </div>
  );
};

export default KismetPage;
