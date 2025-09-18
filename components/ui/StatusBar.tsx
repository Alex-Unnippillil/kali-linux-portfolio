import React, { useEffect, useId, useMemo, useState } from 'react';
import metricsData from '../../data/system-metrics.json';

type ResourceSample = {
  timestamp: string;
  cpuTotal: number;
  cpuFrequencyGHz: number;
  perCore: number[];
  memoryUsedGb: number;
  memoryCachedGb: number;
};

type ResourceMetricsData = {
  cpu: {
    model: string;
    cores: number;
    threads: number;
    baseClockGHz?: number;
    boostClockGHz?: number;
  };
  memory: {
    totalGb: number;
    type: string;
  };
  samples: ResourceSample[];
};

type StatusBarProps = {
  className?: string;
  refreshInterval?: number;
  sampleWindow?: number;
};

const DEFAULT_INTERVAL = 2500;
const DEFAULT_WINDOW = 12;

const clampPercent = (value: number) => {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

const formatTimestamp = (timestamp?: string) => {
  if (!timestamp) return '—';
  const timePart = timestamp.split('T')[1];
  if (!timePart) return timestamp;
  return timePart.replace('Z', '').slice(0, 8);
};

const createSparkline = (values: number[], maxValue = 100) => {
  if (!values.length) {
    return { line: '', area: '' };
  }

  const height = 40;
  const width = 100;
  const safeMax = Math.max(maxValue, ...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((value, index) => {
    const x = Number((index * step).toFixed(2));
    const y = Number((height - (value / safeMax) * height).toFixed(2));
    return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
  });

  const line = points.join(' ');
  const area = `${line} L${width} ${height} L0 ${height} Z`;

  return { line, area };
};

const metrics = metricsData as ResourceMetricsData;

export default function StatusBar({
  className = '',
  refreshInterval = DEFAULT_INTERVAL,
  sampleWindow = DEFAULT_WINDOW,
}: StatusBarProps) {
  const [index, setIndex] = useState(0);
  const windowSize = Math.max(2, sampleWindow);
  const memoryTotal = metrics.memory?.totalGb ?? 0;
  const declaredCoreCount = metrics.cpu?.cores ?? 0;
  const declaredThreadCount = metrics.cpu?.threads ?? 0;
  const sampleData = metrics.samples ?? [];
  const idPrefix = useId();
  const cpuGradientId = `${idPrefix}-cpu`;
  const memGradientId = `${idPrefix}-mem`;

  useEffect(() => {
    if (sampleData.length <= 1) return undefined;
    if (typeof window === 'undefined') return undefined;

    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % sampleData.length);
    }, refreshInterval);

    return () => window.clearInterval(timer);
  }, [refreshInterval, sampleData.length]);

  const currentSample = sampleData.length ? sampleData[index % sampleData.length] : undefined;

  const visibleSamples = useMemo(() => {
    if (!sampleData.length) return [];
    const end = currentSample ? index : sampleData.length - 1;
    const safeEnd = Math.min(end, sampleData.length - 1);
    const start = Math.max(0, safeEnd - (windowSize - 1));
    return sampleData.slice(start, safeEnd + 1);
  }, [currentSample, index, windowSize, sampleData]);

  const cpuHistory = useMemo(
    () => visibleSamples.map((sample) => clampPercent(sample.cpuTotal)),
    [visibleSamples],
  );

  const memoryHistory = useMemo(
    () =>
      visibleSamples.map((sample) =>
        memoryTotal > 0 ? clampPercent((sample.memoryUsedGb / memoryTotal) * 100) : 0,
      ),
    [visibleSamples, memoryTotal],
  );

  const cpuSparkline = useMemo(() => createSparkline(cpuHistory), [cpuHistory]);
  const memSparkline = useMemo(() => createSparkline(memoryHistory), [memoryHistory]);

  const cpuPercent = clampPercent(currentSample?.cpuTotal ?? 0);
  const cpuFrequency = currentSample?.cpuFrequencyGHz ?? metrics.cpu?.baseClockGHz ?? 0;
  const cpuCores = useMemo(() => {
    const base = currentSample?.perCore ?? [];
    const expected = declaredCoreCount || base.length;
    if (!expected) return base;
    if (base.length >= expected) return base.slice(0, expected);
    return [...base, ...Array.from({ length: expected - base.length }, () => 0)];
  }, [currentSample, declaredCoreCount]);

  const memoryUsed = currentSample?.memoryUsedGb ?? 0;
  const memoryCached = currentSample?.memoryCachedGb ?? 0;
  const memoryPercent = memoryTotal > 0 ? clampPercent((memoryUsed / memoryTotal) * 100) : 0;
  const memoryAvailable = memoryTotal > 0 ? Math.max(0, memoryTotal - memoryUsed) : 0;

  const timestamp = formatTimestamp(currentSample?.timestamp);

  return (
    <section
      aria-label="Simulated system resource status"
      className={`relative overflow-hidden rounded-xl border border-[#123647] bg-[var(--kali-bg)]/95 text-cyan-100 shadow-[0_0_18px_rgba(9,23,33,0.6)] backdrop-blur ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_55%),_linear-gradient(135deg,_rgba(15,118,110,0.2),_rgba(59,130,246,0.05))]"
      />
      <div className="relative flex flex-col gap-4 p-4">
        <header className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            <span>Resource Monitor</span>
          </div>
          <span className="ml-auto text-[0.65rem] font-medium tracking-[0.25em] text-cyan-100/70">
            {timestamp}
          </span>
          <span className="text-[0.6rem] uppercase tracking-[0.3em] text-cyan-100/50">
            sample {sampleData.length ? (index % sampleData.length) + 1 : 0}/{sampleData.length}
          </span>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[#12495d]/60 bg-[#061722]/80 p-4 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="text-[0.65rem] uppercase tracking-[0.3em] text-cyan-300">CPU Load</div>
              <div className="text-lg font-semibold text-cyan-100">{cpuPercent.toFixed(0)}%</div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#040b12]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2563eb] via-[#38bdf8] to-[#22d3ee] transition-all duration-500"
                style={{ width: `${cpuPercent}%` }}
                role="presentation"
              />
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
              <svg
                aria-hidden
                viewBox="0 0 100 40"
                className="h-16 w-full max-w-[150px]"
              >
                <defs>
                  <linearGradient id={cpuGradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(56,189,248,0.35)" />
                    <stop offset="100%" stopColor="rgba(37,99,235,0)" />
                  </linearGradient>
                </defs>
                {cpuSparkline.area && (
                  <path d={cpuSparkline.area} fill={`url(#${cpuGradientId})`} opacity={0.9} />
                )}
                {cpuSparkline.line && (
                  <path d={cpuSparkline.line} fill="none" stroke="#22d3ee" strokeWidth={1.5} strokeLinecap="round" />
                )}
              </svg>
              <dl className="grid flex-1 gap-2 text-[0.7rem] text-cyan-100/70">
                <div className="flex flex-col">
                  <dt className="uppercase tracking-[0.2em] text-cyan-300/80">Processor</dt>
                  <dd>{metrics.cpu?.model ?? 'Unknown CPU'}</dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-2 text-cyan-100">
                  <div className="text-[0.65rem] uppercase tracking-[0.2em] text-cyan-300/80">
                    {declaredCoreCount || '?'}C/{declaredThreadCount || '?'}T
                  </div>
                  <div className="text-sm font-medium text-cyan-100">
                    {cpuFrequency.toFixed(1)} GHz
                  </div>
                </div>
              </dl>
            </div>
            {cpuCores.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 text-[0.65rem] text-cyan-100/70">
                {cpuCores.map((value, coreIndex) => {
                  const percent = clampPercent(value);
                  return (
                    <div key={`core-${coreIndex}`} className="rounded-md bg-[#071927]/70 p-2">
                      <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.2em] text-cyan-300/70">
                        <span>Core {coreIndex + 1}</span>
                        <span>{percent.toFixed(0)}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full bg-[#040b12]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#0ea5e9] via-[#38bdf8] to-[#22d3ee] transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-[#16405a]/60 bg-[#071520]/80 p-4 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="text-[0.65rem] uppercase tracking-[0.3em] text-cyan-300">Memory</div>
              <div className="text-lg font-semibold text-cyan-100">{memoryPercent.toFixed(0)}%</div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#040b12]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#22d3ee] transition-all duration-500"
                style={{ width: `${memoryPercent}%` }}
                role="presentation"
              />
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
              <svg
                aria-hidden
                viewBox="0 0 100 40"
                className="h-16 w-full max-w-[150px]"
              >
                <defs>
                  <linearGradient id={memGradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(99,102,241,0.35)" />
                    <stop offset="100%" stopColor="rgba(139,92,246,0)" />
                  </linearGradient>
                </defs>
                {memSparkline.area && (
                  <path d={memSparkline.area} fill={`url(#${memGradientId})`} opacity={0.9} />
                )}
                {memSparkline.line && (
                  <path d={memSparkline.line} fill="none" stroke="#a855f7" strokeWidth={1.5} strokeLinecap="round" />
                )}
              </svg>
              <dl className="grid flex-1 gap-2 text-[0.7rem] text-cyan-100/70">
                <div className="flex items-baseline justify-between">
                  <dt className="uppercase tracking-[0.2em] text-cyan-300/80">Used</dt>
                  <dd className="text-sm font-medium text-cyan-100">{memoryUsed.toFixed(1)} GB</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="uppercase tracking-[0.2em] text-cyan-300/80">Cached</dt>
                  <dd>{memoryCached.toFixed(1)} GB</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="uppercase tracking-[0.2em] text-cyan-300/80">Available</dt>
                  <dd>{memoryAvailable.toFixed(1)} GB</dd>
                </div>
              </dl>
            </div>
            <div className="mt-4 rounded-md bg-[#091c2a]/80 p-3 text-[0.65rem] text-cyan-100/70">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="uppercase tracking-[0.25em] text-cyan-300/80">Total</span>
                <span className="text-sm font-semibold text-cyan-100">
                  {memoryTotal ? memoryTotal.toFixed(0) : '—'} GB {metrics.memory?.type ?? ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap gap-4 text-[0.6rem] uppercase tracking-[0.25em] text-cyan-100/60">
          <span>Simulated dataset · No live system calls</span>
          <span className="text-cyan-100/40">Refresh {Math.round(refreshInterval / 100) / 10}s</span>
        </footer>
      </div>
    </section>
  );
}
