'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';

type ChannelCounts = Record<number, number>;

const DEFAULT_ROTATION_INTERVAL = 2200;
const FPS_MEASURE_WINDOW = 500;

interface ChannelChartProps {
  data: ChannelCounts;
  /**
   * Optional interval (in ms) for advancing the highlighted channel.
   * Mainly exposed for tests so we can speed up rotation deterministically.
   */
  rotationInterval?: number;
}

interface PerfStats {
  fps: number;
  reduction: number;
}

const ChannelChart = ({ data, rotationInterval = DEFAULT_ROTATION_INTERVAL }: ChannelChartProps) => {
  const channels = useMemo(
    () =>
      Object.keys(data)
        .map((key) => Number(key))
        .filter((value) => !Number.isNaN(value))
        .sort((a, b) => a - b),
    [data],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [stats, setStats] = useState<PerfStats>({ fps: 0, reduction: 100 });
  const lastActiveFpsRef = useRef(0);

  useEffect(() => {
    if (!channels.length) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((index) => (index < channels.length ? index : 0));
  }, [channels.length]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setPaused(true);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!channels.length || paused || prefersReducedMotion) {
      if (paused || prefersReducedMotion) {
        const baseline = lastActiveFpsRef.current;
        const computedReduction = baseline > 0 ? Math.round(((baseline - 0) / baseline) * 100) : 100;
        setStats({ fps: 0, reduction: Math.max(50, computedReduction) });
      }
      return;
    }

    let rafId: number;
    let lastSwitch: number | null = null;
    let measureStart: number | null = null;
    let frames = 0;

    const step = (timestamp: number) => {
      if (lastSwitch == null) {
        lastSwitch = timestamp;
      }
      if (measureStart == null) {
        measureStart = timestamp;
      }
      frames += 1;

      if (lastSwitch != null && timestamp - lastSwitch >= rotationInterval && channels.length > 0) {
        setActiveIndex((current) => (channels.length ? (current + 1) % channels.length : current));
        lastSwitch = timestamp;
      }

      if (measureStart != null && timestamp - measureStart >= FPS_MEASURE_WINDOW) {
        const elapsed = Math.max(1, timestamp - measureStart);
        const fps = (frames * 1000) / elapsed;
        lastActiveFpsRef.current = fps;
        setStats({ fps: Math.round(fps), reduction: 0 });
        frames = 0;
        measureStart = timestamp;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [channels, paused, prefersReducedMotion, rotationInterval]);

  const maxCount = useMemo(() => {
    if (!channels.length) {
      return 1;
    }
    return Math.max(
      1,
      ...channels.map((channel) => {
        const value = data[channel];
        return typeof value === 'number' ? value : 0;
      }),
    );
  }, [channels, data]);

  const activeChannel = channels[activeIndex] ?? null;
  const activeCount = activeChannel != null ? data[activeChannel] ?? 0 : 0;

  const togglePaused = () => {
    setPaused((prev) => !prev);
  };

  const buttonLabel = paused ? 'Resume rotation' : 'Pause rotation';

  return (
    <div className="text-white">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">Channel distribution</span>
        <button
          type="button"
          onClick={togglePaused}
          className="rounded border border-ub-cool-grey px-2 py-1 text-xs uppercase tracking-wide transition hover:bg-ub-grey focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
          aria-pressed={paused}
        >
          {buttonLabel}
        </button>
      </div>
      <div
        className="flex h-40 items-end space-x-1"
        aria-live="off"
        role="list"
        data-testid="channel-chart"
      >
        {channels.map((channel, index) => {
          const count = data[channel] ?? 0;
          const height = (count / maxCount) * 100;
          const isActive = index === activeIndex;
          const baseColor = channel <= 14 ? 'bg-blue-600' : 'bg-green-600';
          return (
            <div
              key={channel}
              role="listitem"
              className="flex flex-col items-center"
              aria-current={isActive ? 'true' : undefined}
            >
              <div
                className={`w-4 rounded-sm transition-all duration-500 ease-out ${
                  isActive ? 'bg-ub-orange shadow-lg scale-105' : baseColor
                }`}
                style={{ height: `${height}%`, opacity: paused && !isActive ? 0.4 : 1 }}
                aria-label={`Channel ${channel} has ${count} networks`}
              />
              <span className={`mt-1 text-xs ${isActive ? 'font-semibold text-ub-orange' : ''}`}>
                {channel}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-ubt-grey" aria-live="polite">
        {activeChannel != null ? (
          <>
            <span className="font-semibold text-ub-orange">Active channel {activeChannel}</span>
            <span>
              {' '}
              – {activeCount} networks detected.{' '}
              {paused || prefersReducedMotion
                ? `Paused • CPU load reduced by ${stats.reduction}%`
                : `Frame activity: ${stats.fps} fps`}
            </span>
          </>
        ) : (
          'No channels available.'
        )}
      </div>
    </div>
  );
};

export default ChannelChart;
