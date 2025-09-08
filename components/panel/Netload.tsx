'use client';

import React, { useEffect, useState } from 'react';

interface NetStats {
  rx: number; // instantaneous receive bytes per second
  tx: number; // instantaneous transmit bytes per second
  rxTotal: number; // total bytes received
  txTotal: number; // total bytes transmitted
}

const HISTORY_LENGTH = 30;

const formatBytes = (bytes?: number) => {
  if (!Number.isFinite(bytes || 0)) return '0 B';
  const b = Math.abs(bytes || 0);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = b === 0 ? 0 : Math.floor(Math.log(b) / Math.log(1024));
  const value = b / 1024 ** i;
  return `${value.toFixed(1)} ${units[i]}`;
};

export default function Netload() {
  const [devices, setDevices] = useState<string[]>([]);
  const [device, setDevice] = useState('');
  const [stats, setStats] = useState<NetStats | null>(null);
  const [rxHistory, setRxHistory] = useState<number[]>([]);
  const [txHistory, setTxHistory] = useState<number[]>([]);
  const [peakRx, setPeakRx] = useState(0);
  const [peakTx, setPeakTx] = useState(0);

  // Fetch available network devices
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/netload/devices');
        const data: string[] = await res.json();
        if (active) {
          setDevices(data);
          setDevice((d) => d || data[0] || '');
        }
      } catch {
        // Fallback to a default device if API fails
        if (active) {
          setDevices(['default']);
          setDevice((d) => d || 'default');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Poll network stats for selected device
  useEffect(() => {
    if (!device) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/netload?device=${encodeURIComponent(device)}`);
        const data: NetStats = await res.json();
        setStats(data);
        setRxHistory((h) => [data.rx, ...h].slice(0, HISTORY_LENGTH));
        setTxHistory((h) => [data.tx, ...h].slice(0, HISTORY_LENGTH));
        setPeakRx((p) => Math.max(p, data.rx));
        setPeakTx((p) => Math.max(p, data.tx));
      } catch {
        // ignore fetch errors
      }
    }, 1000);
    return () => clearInterval(id);
  }, [device]);

  const max = Math.max(peakRx, peakTx, 1);
  const rxPoints = rxHistory
    .map((v, i) => `${i * 4},${40 - (v / max) * 40}`)
    .join(' ');
  const txPoints = txHistory
    .map((v, i) => `${i * 4},${40 - (v / max) * 40}`)
    .join(' ');
  const rxPeakIndex = rxHistory.findIndex((v) => v === peakRx);
  const txPeakIndex = txHistory.findIndex((v) => v === peakTx);

  return (
    <div
      className="p-2 text-xs text-white"
      title={
        stats
          ? `Rx total: ${formatBytes(stats.rxTotal)}\nTx total: ${formatBytes(stats.txTotal)}`
          : ''
      }
    >
      <div className="flex items-center mb-1">
        <select
          value={device}
          onChange={(e) => setDevice(e.target.value)}
          className="bg-[var(--kali-panel)] text-xs p-1 rounded"
        >
          {devices.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <div className="ml-2 flex gap-2">
          <span>↓ {stats ? formatBytes(stats.rx) : '—'}</span>
          <span>↑ {stats ? formatBytes(stats.tx) : '—'}</span>
        </div>
      </div>
      <svg viewBox="0 0 120 40" className="w-full h-10">
        <polyline
          fill="none"
          stroke="var(--color-info)"
          strokeWidth="1"
          points={rxPoints}
        />
        <polyline
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="1"
          points={txPoints}
        />
        {rxPeakIndex >= 0 && (
          <circle
            cx={rxPeakIndex * 4}
            cy={40 - (peakRx / max) * 40}
            r="2"
            fill="var(--color-info)"
          />
        )}
        {txPeakIndex >= 0 && (
          <circle
            cx={txPeakIndex * 4}
            cy={40 - (peakTx / max) * 40}
            r="2"
            fill="var(--color-success)"
          />
        )}
      </svg>
    </div>
  );
}

