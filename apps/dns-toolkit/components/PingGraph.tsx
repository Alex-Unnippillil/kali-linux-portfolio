import React, { useEffect, useMemo, useReducer, useRef } from 'react';

export interface PingSample {
  value: number | null;
  timestamp: number;
}

export interface PingStats {
  min: number | null;
  max: number | null;
  avg: number | null;
  lossRate: number;
}

export interface PingState {
  samples: PingSample[];
  stats: PingStats;
}

export type PingAction = {
  type: 'add-sample';
  sample: PingSample;
};

export const MAX_SAMPLES = 200;

export const initialPingState: PingState = {
  samples: [],
  stats: {
    min: null,
    max: null,
    avg: null,
    lossRate: 0,
  },
};

function computeStats(samples: PingSample[]): PingStats {
  let min: number | null = null;
  let max: number | null = null;
  let sum = 0;
  let count = 0;
  let loss = 0;

  for (const sample of samples) {
    if (sample.value == null) {
      loss += 1;
      continue;
    }
    const value = sample.value;
    if (min === null || value < min) {
      min = value;
    }
    if (max === null || value > max) {
      max = value;
    }
    sum += value;
    count += 1;
  }

  return {
    min,
    max,
    avg: count > 0 ? sum / count : null,
    lossRate: samples.length > 0 ? loss / samples.length : 0,
  };
}

export function pingReducer(state: PingState, action: PingAction): PingState {
  switch (action.type) {
    case 'add-sample': {
      const nextSamples = [...state.samples, action.sample];
      if (nextSamples.length > MAX_SAMPLES) {
        nextSamples.splice(0, nextSamples.length - MAX_SAMPLES);
      }
      return {
        samples: nextSamples,
        stats: computeStats(nextSamples),
      };
    }
    default:
      return state;
  }
}

function gaussianRandom(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function simulatePing(
  baseLatency: number,
  jitter: number,
  packetLoss: number,
  rng: () => number,
): number | null {
  if (rng() < packetLoss) {
    return null;
  }
  if (jitter === 0) {
    return Math.max(1, Math.round(baseLatency * 100) / 100);
  }
  const offset = gaussianRandom(rng) * jitter;
  const latency = baseLatency + offset;
  return Math.max(1, Math.round(latency * 100) / 100);
}

export interface PingGraphProps {
  baseLatency?: number;
  jitter?: number;
  packetLoss?: number;
  sampleIntervalMs?: number;
  className?: string;
  random?: () => number;
}

const DEFAULT_CONTAINER_CLASSES =
  'space-y-3 rounded-md border border-cyan-500/40 bg-slate-900/70 p-4 text-cyan-100 shadow-inner shadow-cyan-900/30 backdrop-blur';

function formatStat(value: number | null): string {
  if (value == null) {
    return '--';
  }
  return `${value.toFixed(1)} ms`;
}

function formatLossRate(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

const PingGraph: React.FC<PingGraphProps> = ({
  baseLatency = 32,
  jitter = 4,
  packetLoss = 0.03,
  sampleIntervalMs = 120,
  className,
  random = Math.random,
}) => {
  const [state, dispatch] = useReducer(pingReducer, initialPingState);
  const frameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number | null>(null);
  const pausedRef = useRef<boolean>(false);
  const randomRef = useRef<() => number>(random);
  randomRef.current = random;

  useEffect(() => {
    let mounted = true;
    const interval = Math.max(16, sampleIntervalMs);
    lastUpdateRef.current = performance.now();
    pausedRef.current = document.visibilityState === 'hidden';

    const pushSample = (timestamp: number) => {
      const value = simulatePing(baseLatency, jitter, packetLoss, randomRef.current);
      dispatch({
        type: 'add-sample',
        sample: {
          timestamp,
          value,
        },
      });
    };

    const catchUp = (target: number) => {
      if (lastUpdateRef.current == null) {
        lastUpdateRef.current = target;
        return;
      }
      const elapsed = target - lastUpdateRef.current;
      if (elapsed < interval) {
        return;
      }
      const steps = Math.floor(elapsed / interval);
      for (let i = 0; i < steps; i += 1) {
        lastUpdateRef.current += interval;
        pushSample(lastUpdateRef.current);
      }
    };

    const loop = (timestamp: number) => {
      if (!mounted) return;
      if (pausedRef.current) {
        frameRef.current = requestAnimationFrame(loop);
        return;
      }
      if (lastUpdateRef.current == null) {
        lastUpdateRef.current = timestamp;
      }
      const elapsed = timestamp - lastUpdateRef.current;
      if (elapsed >= interval) {
        const steps = Math.floor(elapsed / interval);
        for (let i = 0; i < steps; i += 1) {
          lastUpdateRef.current += interval;
          pushSample(lastUpdateRef.current);
        }
      }
      frameRef.current = requestAnimationFrame(loop);
    };

    const handleVisibility = () => {
      const hidden = document.visibilityState === 'hidden';
      pausedRef.current = hidden;
      if (!hidden) {
        const now = performance.now();
        catchUp(now);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    frameRef.current = requestAnimationFrame(loop);

    return () => {
      mounted = false;
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [baseLatency, jitter, packetLoss, sampleIntervalMs]);

  const { pathData, lossMarkers, scaleMax } = useMemo(() => {
    if (state.samples.length === 0) {
      return { pathData: '', lossMarkers: [] as Array<{ x: number; value: number }>, scaleMax: baseLatency + jitter * 3 };
    }
    const validMax = state.samples.reduce((acc, sample) => {
      if (sample.value == null) return acc;
      return sample.value > acc ? sample.value : acc;
    }, 0);
    const maxValue = Math.max(validMax, baseLatency + jitter * 3, 1);
    let started = false;
    let d = '';
    const losses: Array<{ x: number; value: number }> = [];
    const denominator = Math.max(MAX_SAMPLES - 1, 1);
    state.samples.forEach((sample, index) => {
      const x = (index / denominator) * (MAX_SAMPLES - 1);
      if (sample.value == null) {
        losses.push({ x, value: maxValue });
        started = false;
        return;
      }
      const y = Math.max(0, 100 - (sample.value / maxValue) * 100);
      if (!started) {
        d += `M ${x} ${y}`;
        started = true;
      } else {
        d += ` L ${x} ${y}`;
      }
    });
    return { pathData: d, lossMarkers: losses, scaleMax: maxValue };
  }, [state.samples, baseLatency, jitter]);

  const containerClassName = [DEFAULT_CONTAINER_CLASSES, className].filter(Boolean).join(' ');

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono text-cyan-200 sm:grid-cols-4">
        <div data-testid="ping-min">Min: {formatStat(state.stats.min)}</div>
        <div data-testid="ping-avg">Avg: {formatStat(state.stats.avg)}</div>
        <div data-testid="ping-max">Max: {formatStat(state.stats.max)}</div>
        <div data-testid="ping-loss">Loss: {formatLossRate(state.stats.lossRate)}</div>
      </div>
      <div className="relative h-36">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${MAX_SAMPLES - 1} 100`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Ping response times"
          data-testid="ping-graph"
        >
          <defs>
            <linearGradient id="pingGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="100%" height="100%" fill="#0f172a" opacity="0.35" />
          <path d={pathData} fill="none" stroke="url(#pingGradient)" strokeWidth={1.8} strokeLinejoin="round" />
          {lossMarkers.map((marker, index) => (
            <line
              key={`${marker.x}-${index}`}
              x1={marker.x}
              x2={marker.x}
              y1={0}
              y2={100}
              stroke="#f87171"
              strokeWidth={0.5}
              strokeDasharray="4 4"
              opacity={0.45}
            />
          ))}
          <text x="4" y="12" fontSize="8" fill="#38bdf8" opacity={0.6}>
            Scale max: {Math.round(scaleMax)} ms
          </text>
        </svg>
        <div
          className="absolute bottom-1 right-2 text-[10px] font-mono uppercase tracking-wide text-cyan-300/60"
          data-testid="ping-count"
        >
          {state.samples.length}
        </div>
      </div>
    </div>
  );
};

export default PingGraph;
