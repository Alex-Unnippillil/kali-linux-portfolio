'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import sampleCapture from '../sampleCapture.json';

interface NetworkEntry {
  channel: number;
  signal: number;
}

type ChannelMetric = {
  channel: number;
  baseline: number;
};

const CHANNEL_SPLIT = 14;
const MIN_LEVEL = 0.08;

export const UPDATE_THROTTLE_MS = 33; // ~30fps which halves the work from a 60fps loop.
export const ROTATE_INTERVAL_MS = 2600;

const pickColorForChannel = (channel: number) =>
  channel <= CHANNEL_SPLIT ? 'bg-sky-500' : 'bg-emerald-500';

const buildChannelMetrics = (networks: NetworkEntry[]): ChannelMetric[] => {
  const counts = networks.reduce<Record<number, number>>((acc, network) => {
    if (typeof network.channel !== 'number') {
      return acc;
    }
    acc[network.channel] = (acc[network.channel] || 0) + 1;
    return acc;
  }, {});

  const orderedChannels = Object.entries(counts)
    .map(([channel, count]) => ({ channel: Number(channel), count }))
    .sort((a, b) => a.channel - b.channel);

  if (orderedChannels.length === 0) {
    return [];
  }

  const maxCount = orderedChannels.reduce((max, entry) => Math.max(max, entry.count), 1);

  return orderedChannels.map((entry) => {
    const ratio = entry.count / maxCount;
    return {
      channel: entry.channel,
      baseline: 0.25 + ratio * 0.6,
    };
  });
};

const cancelFrameIfPossible = (handle: number | null) => {
  if (handle == null) {
    return;
  }
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(handle);
  }
};

const ChannelView: React.FC = () => {
  const metrics = useMemo(
    () => buildChannelMetrics(sampleCapture as NetworkEntry[]),
    [],
  );
  const [levels, setLevels] = useState<Record<number, number>>(() =>
    metrics.reduce<Record<number, number>>((acc, metric) => {
      acc[metric.channel] = metric.baseline;
      return acc;
    }, {}),
  );
  const [focusedChannel, setFocusedChannel] = useState<number | null>(
    metrics[0]?.channel ?? null,
  );
  const [isRunning, setIsRunning] = useState(true);

  const animationFrameRef = useRef<number | null>(null);
  const rotationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusIndexRef = useRef(0);
  const lastFrameRef = useRef(0);
  const phasesRef = useRef<number[]>(
    metrics.map((metric, index) => metric.channel * 0.35 + index * 0.5),
  );
  const speedsRef = useRef<number[]>(
    metrics.map((metric) => 0.015 + metric.baseline * 0.03),
  );

  useEffect(() => {
    // Keep derived refs and state aligned if the metrics array changes.
    phasesRef.current = metrics.map((metric, index) =>
      phasesRef.current[index] ?? metric.channel * 0.35 + index * 0.5,
    );
    speedsRef.current = metrics.map(
      (metric, index) => speedsRef.current[index] ?? 0.015 + metric.baseline * 0.03,
    );
    setLevels((prev) => {
      const next: Record<number, number> = {};
      metrics.forEach((metric) => {
        next[metric.channel] = prev[metric.channel] ?? metric.baseline;
      });
      return next;
    });
    focusIndexRef.current = 0;
    setFocusedChannel(metrics[0]?.channel ?? null);
  }, [metrics]);

  useEffect(() => {
    if (!isRunning || metrics.length === 0) {
      if (animationFrameRef.current !== null) {
        cancelFrameIfPossible(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return () => {};
    }

    lastFrameRef.current = 0;
    let cancelled = false;

    const animate = (timestamp: number) => {
      if (cancelled) {
        return;
      }

      if (lastFrameRef.current === 0) {
        lastFrameRef.current = timestamp;
      }

      const elapsed = timestamp - lastFrameRef.current;

      if (elapsed >= UPDATE_THROTTLE_MS) {
        lastFrameRef.current = timestamp;
        setLevels(() => {
          const next: Record<number, number> = {};
          metrics.forEach((metric, index) => {
            const phase = phasesRef.current[index] + speedsRef.current[index];
            phasesRef.current[index] = phase;
            const amplitude = 0.15 + metric.baseline * 0.1;
            const wave = Math.sin(phase) * amplitude;
            const modulation = Math.cos(phase * 0.5 + index * 0.4) * amplitude * 0.25;
            const raw = metric.baseline + wave + modulation - amplitude * 0.25;
            const bounded = Math.min(1, Math.max(MIN_LEVEL, raw));
            next[metric.channel] = bounded;
          });
          return next;
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      if (animationFrameRef.current !== null) {
        cancelFrameIfPossible(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [metrics, isRunning]);

  useEffect(() => {
    if (!isRunning || metrics.length === 0) {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }
      return () => {};
    }

    rotationTimerRef.current = setInterval(() => {
      focusIndexRef.current = (focusIndexRef.current + 1) % metrics.length;
      setFocusedChannel(metrics[focusIndexRef.current].channel);
    }, ROTATE_INTERVAL_MS);

    return () => {
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }
    };
  }, [metrics, isRunning]);

  const handleToggle = () => {
    if (isRunning) {
      if (animationFrameRef.current !== null) {
        cancelFrameIfPossible(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }
    } else {
      lastFrameRef.current = 0;
    }
    setIsRunning((prev) => !prev);
  };

  return (
    <section className="text-white space-y-4" aria-label="channel utilisation view">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-sky-200">
            Channel activity
          </h2>
          <p className="text-xs text-sky-100/70">
            Focus rotates automatically across observed Wi-Fi channels.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="px-3 py-1 text-xs font-semibold uppercase tracking-wide border border-sky-400 rounded bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          aria-pressed={!isRunning}
        >
          {isRunning ? 'Stop' : 'Resume'}
        </button>
      </header>

      <div className="sr-only" aria-live="polite">
        {focusedChannel != null ? `Focused channel ${focusedChannel}` : 'No channel in focus'}
      </div>

      <div className="flex items-end gap-2 h-48" role="list">
        {metrics.map((metric) => {
          const isFocused = metric.channel === focusedChannel;
          const level = Math.round((levels[metric.channel] ?? metric.baseline) * 100);
          return (
            <div
              key={metric.channel}
              className="flex-1 min-w-[36px] flex flex-col items-center"
              data-focused={isFocused ? 'true' : 'false'}
              data-channel={metric.channel}
              data-testid="channel-wrapper"
              role="listitem"
              aria-current={isFocused ? 'true' : undefined}
            >
              <div className="relative w-full flex-1 bg-slate-900/80 border border-slate-700 rounded-sm overflow-hidden">
                <div
                  className={`${pickColorForChannel(metric.channel)} absolute inset-x-0 bottom-0 transition-[height] duration-200 ease-out ${
                    isFocused ? 'shadow-[0_0_14px_rgba(56,189,248,0.75)]' : ''
                  }`}
                  style={{ height: `${level}%` }}
                  role="img"
                  aria-label={`Channel ${metric.channel} activity ${level} percent`}
                  data-testid={`channel-bar-${metric.channel}`}
                />
              </div>
              <span
                className={`mt-1 text-[11px] uppercase tracking-wide ${
                  isFocused ? 'text-sky-200 font-semibold' : 'text-slate-200'
                }`}
              >
                ch {metric.channel}
              </span>
            </div>
          );
        })}
      </div>

      <footer className="flex gap-4 text-[11px] uppercase tracking-wide text-slate-300/90">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-sky-500" />
          <span>2.4GHz</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span>5GHz</span>
        </div>
      </footer>
    </section>
  );
};

export default ChannelView;

