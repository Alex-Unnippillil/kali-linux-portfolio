'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import SensorChart from './components/SensorChart';
import { RingBuffer } from './ring-buffer';
import type { SensorReading } from './types';

const SAMPLE_RATE_HZ = 60;
const BUFFER_MINUTES = 5;
const BUFFER_CAPACITY = SAMPLE_RATE_HZ * 60 * BUFFER_MINUTES;
const SAMPLE_INTERVAL_MS = 1000 / SAMPLE_RATE_HZ;

const roundToDecimal = (value: number, digits = 1) =>
  Math.round(value * 10 ** digits) / 10 ** digits;

type MemoryInfo = {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
};

const hasMemoryStats = (perf: Performance): perf is Performance & { memory: MemoryInfo } => {
  return typeof (perf as any).memory !== 'undefined' && perf.memory !== undefined;
};

const readingsToCsv = (readings: SensorReading[]) => {
  const header = 'timestamp,value';
  const rows = readings.map(
    (reading) => `${new Date(reading.timestamp).toISOString()},${reading.value}`
  );
  return [header, ...rows].join('\n');
};

const generateReading = (timestamp: number, previous?: SensorReading): SensorReading => {
  const base = 50 + 20 * Math.sin((timestamp / 1000) * Math.PI * 0.6);
  const drift = previous ? previous.value * 0.02 : 0;
  const noise = (Math.random() - 0.5) * 4;
  const value = base + noise + drift;
  return { timestamp, value };
};

const BleSensorApp: React.FC = () => {
  const bufferRef = useRef(new RingBuffer<SensorReading>(BUFFER_CAPACITY));
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [renderTick, setRenderTick] = useState(0);
  const sampleCountRef = useRef(0);
  const [bufferedSamples, setBufferedSamples] = useState(0);
  const [memoryStats, setMemoryStats] = useState<{ latest?: number; peak?: number }>({});
  const downloadRef = useRef<HTMLAnchorElement | null>(null);
  const exportUrlRef = useRef<string | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const timestamp = Date.now();
      const latest = bufferRef.current.peekLatest();
      const reading = generateReading(timestamp, latest);
      bufferRef.current.push(reading);
      sampleCountRef.current = bufferRef.current.size();
      if (!pausedRef.current) {
        setRenderTick((tick) => tick + 1);
      }
    }, SAMPLE_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const updateCount = () => setBufferedSamples(sampleCountRef.current);
    updateCount();
    const interval = window.setInterval(updateCount, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const perf = typeof performance !== 'undefined' ? performance : null;
    if (!perf || !hasMemoryStats(perf)) return;

    const sampleMemory = () => {
      const usedMb = roundToDecimal(perf.memory.usedJSHeapSize / 1024 / 1024, 1);
      if (typeof usedMb === 'number' && Number.isFinite(usedMb)) {
        setMemoryStats((prev) => ({
          latest: usedMb,
          peak: prev.peak ? Math.max(prev.peak, usedMb) : usedMb,
        }));
      }
    };

    sampleMemory();
    const interval = window.setInterval(sampleMemory, 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => () => {
    if (exportUrlRef.current && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(exportUrlRef.current);
      exportUrlRef.current = null;
    }
  }, []);

  const readingsForChart = useMemo(() => bufferRef.current.toArray(), [renderTick]);
  const latestReading = bufferRef.current.peekLatest();

  const handleTogglePause = () => {
    setPaused((current) => !current);
  };

  const handleExport = () => {
    const readings = bufferRef.current.toArray();
    if (!readings.length) return;

    const csv = readingsToCsv(readings);
    const blob = new Blob([csv], { type: 'text/csv' });
    if (exportUrlRef.current && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(exportUrlRef.current);
    }
    const url = URL.createObjectURL(blob);
    exportUrlRef.current = url;
    if (downloadRef.current) {
      downloadRef.current.href = url;
      downloadRef.current.click();
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-slate-950 p-4 text-slate-100">
      <header className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleTogglePause}
          className="rounded bg-sky-600 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          {paused ? 'Resume stream' : 'Pause stream'}
        </button>
        <button
          type="button"
          onClick={handleExport}
          disabled={bufferedSamples === 0}
          className="rounded border border-slate-700 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-100 transition hover:bg-slate-800 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Export CSV
        </button>
        <span data-testid="stream-status" className="text-sm font-medium text-slate-300">
          Status: {paused ? 'Paused' : 'Live'}
        </span>
        <span
          data-testid="buffer-count"
          className="text-sm font-medium text-slate-300"
        >
          {bufferedSamples}
        </span>
        <span className="text-sm text-slate-400">
          Buffer capacity: {BUFFER_CAPACITY} samples
        </span>
        {typeof memoryStats.latest === 'number' ? (
          <span className="ml-auto text-xs text-slate-400">
            Memory used: {memoryStats.latest.toFixed(1)} MB · Peak: {memoryStats.peak?.toFixed(1)} MB
          </span>
        ) : (
          <span className="ml-auto text-xs text-slate-500">
            Memory metrics unavailable in this environment
          </span>
        )}
        <a
          ref={downloadRef}
          data-testid="csv-download"
          className="hidden"
          href={exportUrlRef.current ?? undefined}
          download="ble-readings.csv"
        >
          Download
        </a>
      </header>
      <section className="flex flex-1 flex-col gap-4">
        <SensorChart readings={readingsForChart} paused={paused} />
        <div className="flex flex-wrap gap-4 text-sm text-slate-300">
          <span>
            Latest sample:{' '}
            {latestReading
              ? `${new Date(latestReading.timestamp).toLocaleTimeString()} — ${latestReading.value.toFixed(2)} units`
              : 'Waiting…'}
          </span>
          <span>
            Visible window: {Math.min(BUFFER_CAPACITY, readingsForChart.length)} samples
          </span>
          <span>Sample rate: {SAMPLE_RATE_HZ} Hz</span>
        </div>
      </section>
      <footer className="text-xs text-slate-500">
        Data is simulated locally to demonstrate buffering, pause/resume controls, and export tooling without
        interacting with external BLE hardware.
      </footer>
    </div>
  );
};

export default BleSensorApp;
export { readingsToCsv };
